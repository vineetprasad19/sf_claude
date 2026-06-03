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
