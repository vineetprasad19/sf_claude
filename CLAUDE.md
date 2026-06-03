# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- **Platform:** Windows 11 Home, PowerShell 7+ (pwsh)
- **Working directory:** `d:\ALL_OTHERS\Claude`
- This is a general-purpose Claude Code workspace, not a single-project repository. Individual projects or scripts may be created here as needed.

## Workspace Configuration

Local settings are in [.claude/settings.local.json](.claude/settings.local.json). Pre-approved permissions include:
- MCP search threads tool
- PowerShell execution policy check/set (sets `RemoteSigned` scope if not configured)

## Shell Usage

Prefer PowerShell syntax throughout this workspace:
- Environment variables: `$env:VAR`
- Path separator: `\`
- Null: `$null`
- Line continuation: backtick `` ` ``

## GitHub Repository

- **Repo:** https://github.com/vineetprasad19/sf_claude
- **Git identity:** `vineetprasad19` / `vptcusa@gmail.com`
- Remote origin uses HTTPS with a classic PAT (scope: `repo`).
- To push: `git push origin main` from `d:\ALL_OTHERS\Claude`

## Salesforce Org

- **Org URL:** https://orgfarm-1dee1e0a4f-dev-ed.develop.my.salesforce.com
- **Username:** ucvamp.5a1cac1bba71@agentforce.com
- **Org ID:** 00DgK00000Q2bm5UAB
- **CLI alias:** `sf_dev` — use `--target-org sf_dev` with all `sf` commands
- **API Version:** 66.0
- **CLI:** Salesforce CLI (`sf`) v2.136.8 — `sfdx` is broken in this environment, use `sf` only

### Re-authenticate (if session expires)
```powershell
sf org login web --instance-url "https://orgfarm-1dee1e0a4f-dev-ed.develop.my.salesforce.com" --alias sf_dev
```

## Salesforce Metadata Project

- **Project path:** `d:\ALL_OTHERS\Claude\sf_metadata`
- **Structure:** Standard SFDX project (`sfdx-project.json`, `force-app/` package dir)
- **Manifest:** `sf_metadata\manifest\package.xml` — lists all 340 standard objects for bulk retrieve

### Retrieve metadata
```powershell
# Single object
cd sf_metadata
sf project retrieve start --metadata "CustomObject:Account" --target-org sf_dev

# All standard objects (via manifest)
sf project retrieve start --manifest ".\manifest\package.xml" --target-org sf_dev
```

### What has been exported (as of 2026-06-02)
- **340 standard objects** retrieved from the org
- **3,723 metadata files** total: 340 object definitions, 3,178 fields, 199 list views, 1 record type, 5 web links
- All committed and pushed to the `sf_claude` GitHub repo

### Custom fields added (as of 2026-06-03)
- **Account.claude_status__c** — Text(10), label "Claude Status", deployed to org
  - PermissionSet `ClaudeStatus` grants read/edit FLS; assigned to running user
  - Field added to **Account-Account Layout** (left column, Account Information section)
  - Account_Record_Page FlexiPage retrieved and committed for reference
  - Test record created: Account `Name=test`, `claude_status__c=Open` (Id: `001gK000017IYfWQAW`)

### Lessons learned — Salesforce metadata
- **FLS required after deploy:** New custom fields have no FLS by default. Always deploy a companion `PermissionSet` and assign it before using the field via the data API.
- **Layout column balance:** `TwoColumnsTopToBottom` layouts must have equal item counts in both columns. An extra item in column 2 is silently dropped by Lightning Experience — add new fields to the shorter (left) column instead.

### Before creating a field or record — duplicate checks

**Before deploying a new custom field**, check if it already exists:
```powershell
sf data query --query "SELECT QualifiedApiName, Label FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = 'Account' AND QualifiedApiName = 'claude_status__c'" --target-org sf_dev --use-tooling-api
```

**Before creating a record**, check for duplicates by querying on unique/key fields:
```powershell
# Example: check for existing Account with same Name
sf data query --query "SELECT Id, Name, claude_status__c FROM Account WHERE Name = 'test'" --target-org sf_dev
```

If a matching field or record already exists, update it rather than creating a new one to avoid duplicates.

### List all standard objects available in org
```powershell
cd sf_metadata
sf org list metadata --metadata-type CustomObject --target-org sf_dev --json |
  ConvertFrom-Json | Select-Object -ExpandProperty result |
  Where-Object { $_.fullName -notlike "*__*" } |
  Select-Object -ExpandProperty fullName | Sort-Object
```

### Rebuild package.xml (if org changes)
```powershell
cd sf_metadata
$objects = sf org list metadata --metadata-type CustomObject --target-org sf_dev --json |
  ConvertFrom-Json | Select-Object -ExpandProperty result |
  Where-Object { $_.fullName -notlike "*__*" } | Select-Object -ExpandProperty fullName | Sort-Object
$members = ($objects | ForEach-Object { "        <members>$_</members>" }) -join "`n"
# Write to manifest\package.xml (see pattern used previously)
```
