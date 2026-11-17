#!/usr/bin/env node
// Source inventory, not a claim that every business scenario has been exercised.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = process.cwd();
const outputIndex = process.argv.indexOf('--out');
const output = path.resolve(root, outputIndex >= 0 ? process.argv[outputIndex + 1] : 'output/api-audit-2026-11-17');
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const files = [...new Set(tracked)].filter((file) => /^apps\/(api|web)\/src\//.test(file) && /\.tsx?$/.test(file) && !/\.(spec|test)\.tsx?$/.test(file) && fs.existsSync(path.join(root, file)));
const sources = files.map((file) => ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true));
const nameOf = (node) => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : node?.getText();
const decorators = (node) => ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
const decorator = (node, name) => decorators(node).map((item) => item.expression).find((item) => ts.isCallExpression(item) && nameOf(item.expression) === name);
const literal = (node) => {
  if (!node) return [''];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(literal);
  return [];
};
const normalize = (value) => ('/' + value).replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
const location = (source, node) => ({ file: source.fileName, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
const routes = [];
for (const source of sources.filter((item) => item.fileName.startsWith('apps/api/'))) {
  function visit(node) {
    if (ts.isClassDeclaration(node)) {
      const controller = decorator(node, 'Controller');
      if (controller) {
        const prefixes = literal(controller.arguments[0]);
        for (const method of node.members.filter(ts.isMethodDeclaration)) {
          for (const item of decorators(method)) {
            const call = item.expression;
            if (!ts.isCallExpression(call) || !['Get', 'Post', 'Patch', 'Put', 'Delete', 'Head', 'Options', 'All'].includes(nameOf(call.expression))) continue;
            for (const prefix of prefixes) for (const suffix of literal(call.arguments[0])) {
              routes.push({ method: nameOf(call.expression).toUpperCase(), path: normalize(`${prefix}/${suffix}`), controller: node.name?.text, handler: nameOf(method.name), ...location(source, method), guards: [decorator(node, 'UseGuards')?.getText(), decorator(method, 'UseGuards')?.getText()].filter(Boolean), parameters: method.parameters.map((parameter) => ({ name: nameOf(parameter.name), type: parameter.type?.getText(source), decorators: decorators(parameter).map((entry) => entry.getText(source)) })) });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const clients = [];
const unresolved = [];
for (const source of sources.filter((item) => item.fileName.startsWith('apps/web/'))) {
  const constants = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer);
    ts.forEachChild(node, collect);
  }
  collect(source);
  function strings(node, depth = 0) {
    if (!node || depth > 8) return [];
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isParenthesizedExpression(node)) return strings(node.expression, depth + 1);
    if (ts.isTemplateExpression(node)) {
      let values = [node.head.text];
      for (const span of node.templateSpans) {
        const part = strings(span.expression, depth + 1);
        values = values.flatMap((value) => (part.length ? part : [`{${span.expression.getText(source).replace(/[{}]/g, '')}}`]).map((item) => value + item + span.literal.text));
      }
      return values;
    }
    if (ts.isIdentifier(node) && constants.has(node.text)) return strings(constants.get(node.text), depth + 1);
    if (ts.isIdentifier(node)) {
      for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
        if (!ts.isCallExpression(ancestor) || !/builder\.(query|mutation)/.test(ancestor.expression.getText(source))) continue;
        const argument = ancestor.typeArguments?.[1];
        const field = argument && ts.isTypeLiteralNode(argument) ? argument.members.find((member) => ts.isPropertySignature(member) && nameOf(member.name) === node.text) : undefined;
        if (field?.type && ts.isUnionTypeNode(field.type)) {
          const choices = field.type.types.flatMap((type) => ts.isLiteralTypeNode(type) ? literal(type.literal) : []);
          if (choices.length === field.type.types.length) return choices;
        }
      }
    }
    if (ts.isConditionalExpression(node)) return [...strings(node.whenTrue, depth + 1), ...strings(node.whenFalse, depth + 1)];
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return strings(node.left, depth + 1).flatMap((a) => strings(node.right, depth + 1).map((b) => a + b));
    return [];
  }
  function endpointName(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isPropertyAssignment(parent) && ts.isCallExpression(parent.initializer) && /builder\.(query|mutation)/.test(parent.initializer.expression.getText(source))) return nameOf(parent.name);
    }
    return undefined;
  }
  function record(node, urlNode, method = 'GET', object) {
    const urls = strings(urlNode);
    if (!urls.length) {
      unresolved.push({ ...location(source, node), expression: urlNode?.getText(source), method, endpoint: endpointName(node) });
      return;
    }
    for (let url of urls) {
      if (/^https?:/.test(url) || (!url.startsWith('/') && !url.startsWith('{'))) continue;
      // The query component does not participate in Express route matching.
      url = url.replace(/\?.*$/, '').replace(/^\/api\/v1(?=\/)/, '');
      clients.push({ method: method.toUpperCase(), path: normalize(url), ...location(source, node), endpoint: endpointName(node), request: object?.getText(source) });
    }
  }
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const url = node.properties.find((item) => ts.isPropertyAssignment(item) && nameOf(item.name) === 'url');
      if (url) {
        const method = node.properties.find((item) => ts.isPropertyAssignment(item) && nameOf(item.name) === 'method');
        record(node, url.initializer, literal(method?.initializer)[0] || 'GET', node);
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^(get|post|patch|put|delete|head|options)$/.test(node.expression.name.text)) {
      const receiver = node.expression.expression.getText(source);
      if (/axios|client|http/i.test(receiver)) record(node, node.arguments[0], node.expression.name.text);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
      const options = node.arguments[1];
      const method = options && ts.isObjectLiteralExpression(options) ? options.properties.find((item) => ts.isPropertyAssignment(item) && nameOf(item.name) === 'method') : undefined;
      record(node, node.arguments[0], literal(method?.initializer)[0] || 'GET');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const routePattern = (route) => new RegExp('^' + normalize(route.path).split('/').map((part) => part.startsWith(':') ? '[^/]+' : escaped(part)).join('/') + '$');
function matches(route, client) {
  const full = client.path.startsWith('/api/') ? client.path : '/api/v1' + client.path;
  return (route.method === client.method || route.method === 'ALL') && routePattern(route).test(full.replace(/\{[^}]*\}/g, 'audit-param'));
}
for (const client of clients) client.matches = routes.filter((route) => matches(route, client)).map((route) => `${route.method} ${route.path}`);
const uniqueRoutes = new Map();
for (const route of routes) {
  const key = `${route.method} ${route.path}`;
  const same = uniqueRoutes.get(key) ?? [];
  same.push(route);
  uniqueRoutes.set(key, same);
}
const unmatched = clients.filter((client) => !client.matches.length);
const duplicates = [...uniqueRoutes].filter(([, entries]) => entries.length > 1).map(([key, entries]) => ({ key, entries }));
for (const route of routes) {
  const key = `${route.method} ${route.path}`;
  route.frontendCalls = clients.filter((client) => client.matches.includes(key)).map(({ file, line, endpoint }) => ({ file, line, endpoint }));
}
const delegated = unresolved.filter((item) => /^(args\.url|nextUrl|url|presign\.data\.uploadUrl|response\.data\.downloadUrl)$/.test(item.expression));
const unknown = unresolved.filter((item) => !delegated.includes(item));
const summary = { backendControllers: new Set(routes.map((item) => item.controller)).size, backendRoutes: routes.length, frontendCalls: clients.length, unmatchedFrontendCalls: unmatched.length, unresolvedFrontendCalls: unknown.length, delegatedOrSignedUrlCalls: delegated.length, duplicateRoutes: duplicates.length, routesWithoutFrontendCall: routes.filter((route) => !route.frontendCalls.length).length };
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'source-contracts.json'), JSON.stringify({ summary, caveat: 'Static path/method inventory; unmatched/unresolved requires review. No-client routes may be callbacks, operational, or compatibility APIs. This is not full request/response or execution coverage.', routes, clients, unmatched, unresolved: unknown, delegatedOrSignedUrlCalls: delegated, duplicates }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
for (const item of unmatched) console.log(`UNMATCHED ${item.method} ${item.path} ${item.file}:${item.line}`);
for (const item of unknown) console.log(`REVIEW ${item.method} ${item.expression} ${item.file}:${item.line}`);
if (duplicates.length || unmatched.length || unknown.length) process.exitCode = 1;
