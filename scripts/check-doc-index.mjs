#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowedStatuses = new Set([
  'current-index',
  'current-source',
  'current-spec',
  'operations',
  'conditional-baseline',
  'audit-snapshot',
  'acceptance-archive',
  'historical-archive',
  'superseded',
  'template',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return out;
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
}

function frontmatter(file) {
  const text = read(file);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }
  return data;
}

function markdownLinks(file) {
  const text = read(file);
  const dir = path.dirname(path.join(root, file));
  const links = [];
  const re = /\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g;
  let match;
  while ((match = re.exec(text))) {
    const href = decodeURI(match[1]);
    if (/^[a-z]+:/i.test(href)) continue;
    const resolved = path.resolve(dir, href);
    const relative = path.relative(root, resolved).split(path.sep).join('/');
    links.push({ href, relative });
  }
  return links;
}

const files = walk(root).sort();
const errors = [];
const statuses = new Map();

for (const file of files) {
  const meta = frontmatter(file);
  if (!meta) {
    errors.push(`${file}: missing YAML front matter`);
    continue;
  }
  const status = meta.status;
  if (!allowedStatuses.has(status)) {
    errors.push(`${file}: invalid status "${status ?? ''}"`);
  }
  if (!meta.owner) errors.push(`${file}: missing owner`);
  if (!meta.updated) errors.push(`${file}: missing updated`);
  statuses.set(file, status);
}

const inventory = 'docs/inventory.md';
if (!fs.existsSync(path.join(root, inventory))) {
  errors.push('docs/inventory.md: missing inventory');
} else {
  const inventoryLinks = new Set(
    markdownLinks(inventory)
      .map((link) => link.relative)
      .filter((file) => file.endsWith('.md')),
  );
  for (const file of files) {
    if (!inventoryLinks.has(file)) {
      errors.push(`${inventory}: missing ${file}`);
    }
  }
  for (const file of inventoryLinks) {
    if (!files.includes(file)) {
      errors.push(`${inventory}: references missing ${file}`);
    }
  }
}

const indexFiles = files.filter((file) => !file.startsWith('docs/archive/'));

for (const file of indexFiles) {
  for (const link of markdownLinks(file)) {
    if (link.relative.endsWith('.md') && !fs.existsSync(path.join(root, link.relative))) {
      errors.push(`${file}: broken link ${link.href}`);
    }
  }
}

const currentStatuses = new Set([
  'current-source',
  'current-spec',
  'operations',
  'conditional-baseline',
]);
for (const file of files) {
  if (!currentStatuses.has(statuses.get(file))) continue;
  const text = read(file);
  if (text.includes('docs/archive/superseded/') || text.includes('archive/superseded/')) {
    errors.push(`${file}: current document references superseded archive`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`doc index ok: ${files.length} markdown files`);
