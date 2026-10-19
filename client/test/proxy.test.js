import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import test from 'node:test';
import { createServer } from 'vite';
import configureVite from '../vite.config.js';

test('Vercel preserves the Render API rewrite before the browser route fallback', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites, [
    { source: '/api/:path*', destination: 'https://fleetflow-api-2fq1.onrender.com/api/:path*' },
    { source: '/(.*)', destination: '/index.html' },
  ]);
});

test('local proxy defaults match the confirmed backend port for both dev and preview', () => {
  const previous = process.env.API_PROXY_TARGET;
  try {
    process.env.API_PROXY_TARGET = ' ';
    const config = configureVite({ mode: 'test' });
    assert.equal(config.server.proxy['/api'].target, 'http://localhost:5000');
    assert.equal(config.preview.proxy['/api'].target, 'http://localhost:5000');
  } finally {
    if (previous === undefined) delete process.env.API_PROXY_TARGET;
    else process.env.API_PROXY_TARGET = previous;
  }
});

test('Vite forwards same-origin API requests to the configured target without changing paths or query parameters', async () => {
  let received;
  const backend = createHttpServer((request, response) => {
    received = request.url;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ success: true, data: [], pagination: { total: 0 } }));
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const previous = process.env.API_PROXY_TARGET;
  let vite;
  try {
    process.env.API_PROXY_TARGET = `http://127.0.0.1:${backend.address().port}`;
    vite = await createServer({ envDir: false, server: { host: '127.0.0.1', port: 0, watch: null, hmr: false, ws: false } });
    await vite.listen();
    const path = '/api/agents?page=1&limit=1&status=active';
    const response = await fetch(`http://127.0.0.1:${vite.httpServer.address().port}${path}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).pagination.total, 0);
    assert.equal(received, path);
  } finally {
    if (previous === undefined) delete process.env.API_PROXY_TARGET;
    else process.env.API_PROXY_TARGET = previous;
    await vite?.close();
    await new Promise((resolve) => { backend.close(resolve); backend.closeAllConnections(); });
  }
});
