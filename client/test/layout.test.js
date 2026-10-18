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
  // Compile the actual JSX using the installed Vite plugin, without local .env files.
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null } });
  App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  Header = (await vite.ssrLoadModule('/src/components/layout/Header.jsx')).default;
});

after(async () => { await vite?.close(); });

function render(component, props = {}, path = '/') {
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(component, props)));
}

test('overview renders the shared shell, welcome panel, and skip-to-main target', () => {
  const html = render(App);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>Overview<\/h1>/);
  assert.match(html, /Welcome to FleetFlow/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main id="main-content" tabindex="-1"/);
  assert.match(html, /aria-current="page"/);
});

test('Agents is clearly unavailable and does not link to an unfinished route', () => {
  const html = render(App);
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Agents, coming soon"/);
  assert.doesNotMatch(html, /href="\/agents/);
  assert.doesNotMatch(html, /<table\b|<form\b/);
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
