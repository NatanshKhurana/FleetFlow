import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createAgentsResource } from '../src/state/agentsResource.js';
import { createAgentResource } from '../src/state/createAgentResource.js';
import { createOverviewResource } from '../src/state/overviewResource.js';

const source = await readFile(new URL('../public/theme.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

function boot(storage = new Map()) {
  const document = { documentElement: { dataset: {} } };
  const window = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } };
  runInNewContext(source, { window, document });
  return { store: window.fleetflowTheme, root: document.documentElement, storage };
}

test('first visit uses dark before React, regardless of operating-system light preference', async () => {
  const { store, root, storage } = boot();
  assert.equal(store.getSnapshot(), 'dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(storage.size, 0); // Only explicit changes are persisted.
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html[^>]*data-theme="dark"/);
  assert.match(html, /<script src="\/theme\.js"><\/script>/);
  assert.ok(html.indexOf('src="/theme.js"') < html.indexOf('<body>'));
  assert.ok(html.indexOf('src="/theme.js"') < html.indexOf('src="/src/main.jsx"'));
  assert.doesNotMatch(source, /matchMedia|prefers-color-scheme/);
});

test('switching to light and back updates the root, subscribers, and saved preference', () => {
  const { store, root, storage } = boot();
  const changes = [];
  const unsubscribe = store.subscribe(() => changes.push(store.getSnapshot()));
  store.setTheme('light');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(storage.get('fleetflow.theme'), 'light');
  store.setTheme('dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(storage.get('fleetflow.theme'), 'dark');
  store.setTheme('dark');
  store.setTheme('invalid');
  assert.deepEqual(changes, ['light', 'dark']);
  unsubscribe();
  store.setTheme('light');
  assert.deepEqual(changes, ['light', 'dark']);
});

test('both explicit preferences survive application reinitialization', () => {
  const storage = new Map();
  for (const theme of ['light', 'dark']) {
    boot(storage).store.setTheme(theme);
    const reloaded = boot(storage);
    assert.equal(reloaded.store.getSnapshot(), theme);
    assert.equal(reloaded.root.dataset.theme, theme);
  }
});

test('invalid, missing, and inaccessible storage fall back safely; writes can fail without losing the toggle', () => {
  for (const value of ['system', '', 'LIGHT', '{broken']) {
    assert.equal(boot(new Map([['fleetflow.theme', value]])).store.getSnapshot(), 'dark');
  }
  for (const window of [{}, { localStorage: { getItem() { throw new Error('blocked'); } } },
    Object.defineProperty({}, 'localStorage', { get() { throw new Error('blocked'); } })]) {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(source, { window, document });
    assert.equal(window.fleetflowTheme.getSnapshot(), 'dark');
    window.fleetflowTheme.setTheme('light');
    assert.equal(document.documentElement.dataset.theme, 'light');
    window.fleetflowTheme.setTheme('dark');
    assert.equal(document.documentElement.dataset.theme, 'dark');
  }
});

test('theme changes retain loaded dashboard/list state, filters, page and form draft without API dispatches', async () => {
  let reads = 0;
  let writes = 0;
  let overviewReads = 0;
  const overview = createOverviewResource(async () => {
    overviewReads++;
    return { total: 30, active: 20, inactive: 10, recentAgents: [] };
  });
  await overview.load();
  const overviewState = overview.getSnapshot();
  const list = createAgentsResource(async (query) => {
    reads++;
    return { agents: [], pagination: { ...query, total: 30, totalPages: 3 } };
  });
  await list.applyFilters({ search: 'Alex', status: 'active', serviceArea: 'Central' });
  await list.goToPage(2);
  const form = createAgentResource(async () => { writes++; });
  form.setField('fullName', 'Unsaved name');
  form.setField('phone', '+1 202-555-0142');
  const before = { list: list.getSnapshot(), query: list.getQuery(), form: form.getSnapshot() };
  const { store } = boot();
  store.setTheme('light');
  store.setTheme('dark');
  assert.equal(list.getSnapshot(), before.list);
  assert.equal(list.getQuery(), before.query);
  assert.equal(list.getQuery().page, 2);
  assert.equal(form.getSnapshot(), before.form);
  assert.equal(form.getSnapshot().values.fullName, 'Unsaved name');
  assert.equal(reads, 2);
  assert.equal(writes, 0);
  assert.equal(overview.getSnapshot(), overviewState);
  assert.equal(overviewReads, 1);
});

let vite;
let App;
let ThemeToggleButton;
before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  ThemeToggleButton = (await vite.ssrLoadModule('/src/components/layout/ThemeToggle.jsx')).ThemeToggleButton;
});
after(async () => { await vite?.close(); });

test('the actual switcher click handler toggles the store and renders both accessible states', () => {
  const { store, root } = boot();
  const button = () => ThemeToggleButton({ theme: store.getSnapshot(), onChange: store.setTheme });
  button().props.onClick();
  assert.equal(root.dataset.theme, 'light');
  assert.match(renderToString(button()), /aria-label="Color theme: Light" aria-pressed="false" title="Switch to dark mode"/);
  assert.match(renderToString(button()), /<span>Light<\/span>/);
  button().props.onClick();
  assert.equal(root.dataset.theme, 'dark');
  assert.match(renderToString(button()), /aria-label="Color theme: Dark" aria-pressed="true" title="Switch to light mode"/);
});

test('each route exposes one native keyboard-operable theme toggle with current state and stable width', () => {
  for (const path of ['/', '/agents', '/agents/000000000000000000000001', '/agents/000000000000000000000001/edit', '/missing']) {
    const html = renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(App)));
    assert.equal((html.match(/aria-label="Color theme: Dark"/g) || []).length, 1);
    assert.match(html, /<button type="button" aria-label="Color theme: Dark" aria-pressed="true" title="Switch to light mode"/);
    assert.match(html, /min-h-11 w-24 shrink-0/);
    assert.match(html, /<span>Dark<\/span>/);
  }
  assert.match(css, /:focus-visible\s*\{[^}]*var\(--theme-accent\)/);
});

function luminance(hex) {
  const values = hex.match(/\w\w/g).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('semantic text, status and button token pairs meet 4.5:1; input borders and focus meet 3:1 in both palettes', () => {
  for (const selector of [':root', ':root[data-theme="light"]']) {
    const block = css.slice(css.indexOf(selector + ' {')).split('}', 1)[0];
    const colors = Object.fromEntries([...block.matchAll(/--theme-([\w-]+): (#[\da-f]{6})/g)].map((m) => [m[1], m[2]]));
    for (const text of ['heading', 'body', 'muted']) {
      for (const surface of ['canvas', 'surface', 'subtle', 'raised']) {
        assert.ok(contrast(colors[text], colors[surface]) >= 4.5, `${selector}: ${text}/${surface}`);
      }
    }
    for (const accent of ['accent', 'danger']) {
      for (const surface of ['surface', `${accent}-soft`]) {
        assert.ok(contrast(colors[accent], colors[surface]) >= 4.5, `${selector}: ${accent}/${surface}`);
      }
    }
    assert.ok(contrast(colors.strong, colors.surface) >= 3, selector);
    assert.ok(contrast(colors.accent, colors.surface) >= 3, selector);
  }
  for (const token of ['primary', 'primary-hover', 'danger-button', 'danger-hover']) {
    const color = css.match(new RegExp(`--color-${token}: (#[\\da-f]{6})`))[1];
    assert.ok(contrast('#ffffff', color) >= 4.5, token);
  }
});
