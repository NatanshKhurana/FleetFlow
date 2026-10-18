import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';

let vite;
let App;
let Header;

before(async () => {
  // Compile actual JSX with automatic browser env injection and dev sockets disabled.
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  Header = (await vite.ssrLoadModule('/src/components/layout/Header.jsx')).default;
});

after(async () => { await vite?.close(); });

function render(component, props = {}, path = '/') {
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(component, props)));
}

test('overview renders the shared shell, initial loading state, and skip-to-main target', () => {
  const html = render(App);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>Overview<\/h1>/);
  assert.match(html, /Loading your overview/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main id="main-content" tabindex="-1"/);
  assert.match(html, /aria-current="page"/);
});

test('Agents route uses the shared shell with active navigation, real filters, and initial loading', () => {
  const html = render(App, {}, '/agents');
  assert.match(html, /<h1[^>]*>Agents<\/h1>/);
  assert.match(html, /aria-current="page"[^>]*href="\/agents"/);
  assert.match(html, /Loading agents/);
  assert.match(html, /role="search"/);
  assert.match(html, /aria-expanded="false" aria-controls="add-agent-panel"/);
  assert.match(html, /Add new agent/);
  assert.match(html, /id="add-agent-panel" hidden=""/);
  assert.doesNotMatch(html, /Agents, coming soon/);
});

test('collapsed mobile navigation has a labelled control and hidden contents', () => {
  const html = render(Header, { title: 'Overview', navigationOpen: false });
  assert.match(html, /aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation"/);
  assert.match(html, /id="mobile-navigation" hidden=""/);
});

test('expanded mobile navigation exposes links and an accurately labelled close control', () => {
  const html = render(Header, { title: 'Overview', navigationOpen: true });
  assert.match(html, /aria-label="Close navigation" aria-expanded="true" aria-controls="mobile-navigation"/);
  assert.doesNotMatch(html, /id="mobile-navigation" hidden=/);
  assert.match(html, /href="\/"/);
  // This is an inline disclosure, not a modal that would require trapping focus.
  assert.doesNotMatch(html, /aria-modal|role="dialog"/);
});

test('unknown routes preserve the dashboard shell and offer a working home destination', () => {
  const html = render(App, {}, '/missing');
  assert.match(html, /<h1[^>]*>Page not found<\/h1>/);
  assert.match(html, /This page isn&#x27;t here/);
  assert.match(html, /href="\/"[^>]*>Return to Overview<\/a>/);
  assert.doesNotMatch(html, /aria-current="page"/);
});
