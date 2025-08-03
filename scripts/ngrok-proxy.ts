#!/usr/bin/env bun

import { spawn, spawnSync, type ChildProcess } from 'child_process';
import { createServer, type IncomingMessage, type ServerResponse, request } from 'http';
import { createProxyServer } from 'http-proxy';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// 1️⃣ Load environment variables from .env.ngrok-dev (if it exists)
const envPath = join(process.cwd(), '.env.ngrok-dev');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✅ Loaded environment from .env.ngrok-dev');
} else {
  console.warn('⚠️  .env.ngrok-dev not found, using default environment');
}

// ───────────────────────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────────────────────
const PROXY_PORT = 8080;              // Port the rewrite-host proxy listens on
const TARGET_PORT = 3000;             // Your local dev server port
const TARGET_HOST = 'localhost';

// Ngrok details (can be overridden via env)
// const DEFAULT_NGROK_DOMAIN = 'allowing-redbird-vaguely.ngrok-free.app';
const DEFAULT_NGROK_DOMAIN = 'bird-genuine-stork.ngrok-free.app';
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || DEFAULT_NGROK_DOMAIN;
const NGROK_URL = `https://${NGROK_DOMAIN}`;
const LOCALHOST_URL = `http://localhost:${TARGET_PORT}`;

// ───────────────────────────────────────────────────────────────────────────────
// Convex SITE_URL helpers
// ───────────────────────────────────────────────────────────────────────────────
function setConvexSiteUrl(url: string) {
  console.log(`🌐 Setting Convex SITE_URL to ${url}`);
  // Using bun x ensures we respect the user's requirement of bun as pkg-mgr
  spawnSync('bun', ['x', 'convex', 'env', 'set', 'SITE_URL', url], { stdio: 'inherit' });
}

// ───────────────────────────────────────────────────────────────────────────────
// HTTP proxy (host-rewrite) – copied from cf-proxy.ts with minimal changes
// ───────────────────────────────────────────────────────────────────────────────
const proxy = createProxyServer({
  target: `http://${TARGET_HOST}:${TARGET_PORT}`,
  changeOrigin: true,
  ws: true,
  xfwd: false,
  secure: false,
  ignorePath: false,
});

proxy.on('error', (err, _req, res) => {
  console.error('❌ Proxy error:', err.message);
  if (res && 'writeHead' in res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Unable to connect to development server');
  }
});

proxy.on('proxyReq', (proxyReq, req, _res, _options) => {
  proxyReq.removeHeader('transfer-encoding');
  proxyReq.removeHeader('content-encoding');
  proxyReq.removeHeader('content-length');
  proxyReq.setHeader('Host', `${TARGET_HOST}:${TARGET_PORT}`);
  proxyReq.setHeader('Connection', 'close');
  console.log(`🔄 Proxying ${req.method} ${req.url} → ${TARGET_HOST}:${TARGET_PORT}`);
});

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('healthy\n');
    return;
  }

  const proxyHeaders = { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` } as Record<string, string>;
  delete proxyHeaders['transfer-encoding'];
  delete proxyHeaders['content-encoding'];
  delete proxyHeaders['content-length'];

  const proxyReq = request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: proxyHeaders,
  }, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers } as Record<string, string>;
    delete responseHeaders['transfer-encoding'];
    delete responseHeaders['content-encoding'];
    delete responseHeaders['content-length'];

    res.writeHead(proxyRes.statusCode || 200, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ Proxy request error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Unable to connect to development server');
    }
  });

  req.pipe(proxyReq);
});

server.on('upgrade', (request, socket, head) => {
  const cleanHeaders = { ...request.headers } as Record<string, string>;
  delete cleanHeaders['transfer-encoding'];
  delete cleanHeaders['content-encoding'];
  delete cleanHeaders['content-length'];
  request.headers = cleanHeaders;
  proxy.ws(request, socket, head, {
    headers: { Host: `${TARGET_HOST}:${TARGET_PORT}` },
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Ngrok process management
// ───────────────────────────────────────────────────────────────────────────────
let ngrokProcess: ChildProcess | null = null;

function startNgrok(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ngrok tunnel for domain ${NGROK_DOMAIN}...`);

    ngrokProcess = spawn('ngrok', ['http', String(PROXY_PORT), '--domain', NGROK_DOMAIN], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const handleOutput = (data: Buffer) => {
      const output = data.toString().trim();
      console.log('📡 ngrok:', output);
      if (output.includes('started tunnel') || output.includes('client session established')) {
        resolve();
      }
    };

    ngrokProcess.stdout?.on('data', handleOutput);
    ngrokProcess.stderr?.on('data', handleOutput);

    ngrokProcess.on('error', (error) => {
      console.error('❌ Failed to start ngrok:', error.message);
      reject(error);
    });

    ngrokProcess.on('exit', (code) => {
      console.log(`📡 ngrok exited with code ${code}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`ngrok exited with code ${code}`));
      }
    });

    // Fallback: assume success after 3s if no explicit message
    setTimeout(() => {
      if (ngrokProcess && !ngrokProcess.killed) {
        console.log('📡 ngrok appears to be running');
        resolve();
      }
    }, 3000);
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Cleanup
// ───────────────────────────────────────────────────────────────────────────────
function cleanup() {
  console.log('\n🧹 Cleaning up...');

  // Restore Convex SITE_URL
  setConvexSiteUrl(LOCALHOST_URL);

  if (ngrokProcess && !ngrokProcess.killed) {
    console.log('🛑 Stopping ngrok...');
    ngrokProcess.kill('SIGTERM');
  }

  server.close(() => {
    console.log('🛑 Proxy server stopped');
    process.exit(0);
  });
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// ───────────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('🔧 Starting ngrok Proxy...');
    console.log(`📍 Proxy will run on http://localhost:${PROXY_PORT}`);
    console.log(`🎯 Forwarding to http://${TARGET_HOST}:${TARGET_PORT}`);

    // Start proxy server first
    server.listen(PROXY_PORT, () => {
      console.log(`✅ Proxy server listening on port ${PROXY_PORT}`);
    });

    // Wait briefly
    await new Promise((r) => setTimeout(r, 1000));

    // Set Convex SITE_URL before exposing tunnel
    setConvexSiteUrl(NGROK_URL);

    // Start ngrok
    await startNgrok();

    console.log('🎉 ngrok proxy setup complete!');
    console.log(`🌍 Public URL: ${NGROK_URL}`);
    console.log('💡 Press Ctrl+C to stop and restore environment');
  } catch (error) {
    console.error('❌ Failed to start ngrok proxy:', error);
    cleanup();
    process.exit(1);
  }
}

main(); 