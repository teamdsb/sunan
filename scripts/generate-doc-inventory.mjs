#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const files = execSync("rg --files -g '*.md'", { encoding: 'utf8' })
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .filter((file) => !file.startsWith('.agents/'))
  .sort();

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function frontmatter(file) {
  const text = read(file);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  const data = {};
  if (!match) return data;
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return data;
}

function title(file) {
  const body = read(file).replace(/^---\n[\s\S]*?\n---\n/, '');
  const line = body.split('\n').find((item) => item.startsWith('# '));
  return line ? line.replace(/^#\s+/, '').trim().replace(/\|/g, '\\|') : '';
}

function group(file) {
  if (!file.startsWith('docs/')) return 'repository-root';

  const rest = file.slice('docs/'.length);
  if (!rest.includes('/')) return 'docs-root';

  const parts = rest.split('/');
  if (parts[0] === 'archive') {
    if (parts[1]?.endsWith('.md')) return 'archive-root';
    if (parts[1] === 'acceptance') return `archive/acceptance/${parts[2] ?? ''}`;
    if (parts[1] === 'backlogs') return `archive/backlogs/${parts[2] ?? ''}`;
    if (parts[1] === 'superseded') return `archive/superseded/${parts[2] ?? ''}`;
    if (parts[1] === 'templates') return `archive/templates/${parts[2] ?? ''}`;
    return `archive/${parts[1] ?? ''}`;
  }

  if (parts[0] === 'specs') return `specs/${parts[1] ?? ''}`;
  if (parts[0] === 'architecture' && parts[1] === 'adr') return 'architecture/adr';
  return parts[0];
}

function linkFromDocs(file) {
  return path.relative(path.join(root, 'docs'), path.join(root, file)).split(path.sep).join('/');
}

const preferredOrder = [
  'repository-root',
  'docs-root',
  'architecture',
  'architecture/adr',
  'guides',
  'requirements',
  'plans',
  'prompts',
  'specs/common',
  'specs/my',
  'specs/office',
  'specs/procurement',
  'specs/safety',
  'specs/wecom',
  'specs/workbench',
  'archive-root',
  'archive/execplans',
  'archive/acceptance/common',
  'archive/acceptance/procurement',
  'archive/acceptance/wecom',
  'archive/acceptance/workbench',
  'archive/audits',
  'archive/backlogs/common',
  'archive/backlogs/workbench',
  'archive/superseded/wecom',
  'archive/superseded/workbench',
  'archive/templates/common',
];

const grouped = new Map();
for (const file of files) {
  const key = group(file);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(file);
}

const groups = [...grouped.keys()].sort((a, b) => {
  const ra = preferredOrder.indexOf(a);
  const rb = preferredOrder.indexOf(b);
  if (ra !== -1 || rb !== -1) {
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb) || a.localeCompare(b);
  }
  return a.localeCompare(b);
});

const lines = [
  '---',
  'status: current-index',
  'owner: docs',
  'updated: 2026-05-04',
  'replaces: []',
  'replaced_by: []',
  '---',
  '',
  '# Markdown 文档清单',
  '',
  '> 本文件由 `node scripts/generate-doc-inventory.mjs` 生成，覆盖仓库内所有 Markdown 文档（不含 `node_modules`）。日常导航请优先使用 [README.md](README.md)。',
  '',
  `总数：${files.length} 个 Markdown 文件。`,
  '',
];

for (const groupName of groups) {
  lines.push(`## ${groupName}`);
  lines.push('');
  lines.push('| 文档 | 状态 | 负责人 | 标题 |');
  lines.push('|---|---|---|---|');
  for (const file of grouped.get(groupName)) {
    const meta = frontmatter(file);
    lines.push(
      `| [${file}](${linkFromDocs(file)}) | \`${meta.status ?? ''}\` | \`${meta.owner ?? ''}\` | ${title(file)} |`,
    );
  }
  lines.push('');
}

fs.writeFileSync('docs/inventory.md', lines.join('\n'));
console.log(`generated docs/inventory.md for ${files.length} markdown files`);
