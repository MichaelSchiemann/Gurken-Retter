#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const apps = [
  { name: 'Gurken-Retter', dir: '.' },
  { name: 'Punktjäger', dir: 'pacman' },
  { name: 'Blockstapler', dir: 'tetris' },
  { name: 'Gurken-Breaker', dir: 'breakout' },
  { name: 'Gurken-Sprung', dir: 'jump' },
  { name: 'Apfelmännchen', dir: 'apfelmaennchen' },
];

const requiredFiles = ['index.html', 'manifest.webmanifest', 'service-worker.js'];
const requiredIcons = ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function file(app, rel) {
  return path.join(root, app.dir, rel);
}

function read(app, rel) {
  return readFileSync(file(app, rel), 'utf8');
}

function assertExists(app, rel) {
  const target = file(app, rel);
  if (!existsSync(target)) {
    fail(`${app.name}: fehlt ${path.join(app.dir, rel)}`);
    return false;
  }
  ok(`${app.name}: ${rel} vorhanden`);
  return true;
}

function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    const script = match[1].trim();
    if (script) scripts.push(script);
  }
  return scripts;
}

function nodeCheckJavaScript(app, label, source) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pages-js-'));
  const target = path.join(dir, `${label}.js`);
  writeFileSync(target, source);
  const result = spawnSync('node', ['--check', target], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  if (result.status !== 0) {
    fail(`${app.name}: JavaScript-Syntaxfehler in ${label}\n${result.stderr || result.stdout}`);
  } else {
    ok(`${app.name}: JavaScript-Syntax ok (${label})`);
  }
}

function validateManifest(app) {
  let manifest;
  try {
    manifest = JSON.parse(read(app, 'manifest.webmanifest'));
  } catch (error) {
    fail(`${app.name}: manifest.webmanifest ist kein gültiges JSON (${error.message})`);
    return;
  }

  for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!(key in manifest)) fail(`${app.name}: Manifest fehlt Feld ${key}`);
  }
  if (manifest.display !== 'fullscreen') {
    fail(`${app.name}: Manifest display ist nicht fullscreen`);
  }
  if (!Array.isArray(manifest.display_override) || !manifest.display_override.includes('fullscreen')) {
    fail(`${app.name}: Manifest display_override enthält fullscreen nicht`);
  }
  if (manifest.orientation && !String(manifest.orientation).includes('portrait')) {
    fail(`${app.name}: Manifest orientation ist nicht portrait-orientiert`);
  }
  const iconSrcs = new Set((manifest.icons || []).map(icon => icon.src));
  for (const icon of ['./icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png']) {
    if (iconSrcs.has(icon)) ok(`${app.name}: Manifest referenziert ${icon}`);
  }
  for (const rel of requiredIcons) assertExists(app, rel);
}

function validateHtml(app) {
  const html = read(app, 'index.html');
  if (!html.includes('viewport-fit=cover')) fail(`${app.name}: viewport-fit=cover fehlt`);
  if (!/rel=["']manifest["']/i.test(html)) fail(`${app.name}: Manifest-Link fehlt im HTML`);
  if (!/apple-touch-icon/i.test(html)) fail(`${app.name}: apple-touch-icon fehlt im HTML`);
  if (!/serviceWorker/.test(html)) fail(`${app.name}: Service-Worker-Registrierung fehlt im HTML`);
  if (!/minimum-scale=1/.test(html) || !/maximum-scale=1/.test(html)) fail(`${app.name}: strikte Zoom-Sperre fehlt im Viewport`);
  if (!/fullscreenToggle/.test(html)) fail(`${app.name}: Vollbild-Button fehlt im HTML`);
  if (!/requestFullscreen|webkitRequestFullscreen/.test(html)) fail(`${app.name}: Fullscreen-API-Helfer fehlt im HTML`);
  if (!/-webkit-user-select:\s*none/.test(html) || !/user-select:\s*none/.test(html)) fail(`${app.name}: Anti-Textauswahl-CSS fehlt`);
  if (!/-webkit-touch-callout:\s*none/.test(html) || !/-webkit-user-drag:\s*none/.test(html)) fail(`${app.name}: iOS Touch-Callout/User-Drag-Sperre fehlt`);
  if (!/selectstart/.test(html) || !/contextmenu/.test(html)) fail(`${app.name}: Anti-Auswahl-Eventschutz fehlt`);

  const scripts = extractInlineScripts(html);
  if (scripts.length === 0) {
    fail(`${app.name}: kein Inline-JavaScript gefunden`);
    return;
  }
  scripts.forEach((source, index) => {
    nodeCheckJavaScript(app, `inline-${index + 1}`, source);
    const referencedLoops = [...source.matchAll(/requestAnimationFrame\((\w+)\)/g)].map(match => match[1]);
    for (const fn of referencedLoops) {
      const declaration = new RegExp(`function\\s+${fn}\\s*\\(`);
      const expression = new RegExp(`(?:const|let|var)\\s+${fn}\\s*=`);
      if (!declaration.test(source) && !expression.test(source)) {
        fail(`${app.name}: requestAnimationFrame(${fn}) referenziert keine definierte Funktion`);
      }
    }
  });
}

function validateServiceWorker(app) {
  const sw = read(app, 'service-worker.js');
  nodeCheckJavaScript(app, 'service-worker', sw);
  for (const marker of ['install', 'activate', 'fetch', 'CACHE_NAME']) {
    if (!sw.includes(marker)) fail(`${app.name}: Service Worker enthält ${marker} nicht`);
  }
  for (const asset of ['./index.html', './manifest.webmanifest']) {
    if (!sw.includes(asset)) fail(`${app.name}: Service Worker cached ${asset} nicht`);
  }
}

if (!existsSync(path.join(root, '.nojekyll'))) {
  fail('Root: .nojekyll fehlt für GitHub Pages');
} else {
  ok('Root: .nojekyll vorhanden');
}

for (const app of apps) {
  console.log(`\n== ${app.name} (${app.dir}) ==`);
  const basicsOk = requiredFiles.map(rel => assertExists(app, rel)).every(Boolean);
  if (!basicsOk) continue;
  validateHtml(app);
  validateManifest(app);
  validateServiceWorker(app);
}

if (failures > 0) {
  console.error(`\n${failures} GitHub-Pages-Check(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle GitHub-Pages-Checks bestanden.');
