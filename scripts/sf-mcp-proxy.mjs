#!/usr/bin/env node
// Salesforce MCP proxy — gets a fresh token from the sf CLI on each startup,
// then bridges Claude Desktop (stdio) to the Salesforce hosted MCP endpoint.
// No Connected App setup needed; relies on the sf CLI's existing OAuth session.

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const SF_ORG_ALIAS = 'sf_dev';

function getAccessToken() {
  const out = execSync(`sf org display --target-org ${SF_ORG_ALIAS} --json`, {
    env: { ...process.env, SF_TEMP_SHOW_SECRETS: 'true' },
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const data = JSON.parse(out);
  return { token: data.result.accessToken, instanceUrl: data.result.instanceUrl };
}

let { token, instanceUrl } = getAccessToken();
const SF_MCP_URL = `${instanceUrl}/mcp`;
let sessionId = null;

async function postToMcp(body, retrying = false) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const res = await fetch(SF_MCP_URL, { method: 'POST', headers, body });

  if (res.status === 401 && !retrying) {
    ({ token } = getAccessToken());
    return postToMcp(body, true);
  }

  const newSession = res.headers.get('Mcp-Session-Id');
  if (newSession) sessionId = newSession;

  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('text/event-stream')) {
    await pipeSSEToStdout(res);
  } else {
    const text = await res.text();
    if (text.trim()) process.stdout.write(text.trim() + '\n');
  }
}

async function pipeSSEToStdout(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const ln of lines) {
      if (ln.startsWith('data: ')) {
        const data = ln.slice(6).trim();
        if (data && data !== '[DONE]') process.stdout.write(data + '\n');
      }
    }
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    await postToMcp(line);
  } catch (err) {
    process.stderr.write(`[sf-mcp-proxy] ${err.message}\n`);
  }
});

process.stdin.resume();
