// Derive routes from the actual router and enrich them with front-owned documentation.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/export-ui-routes.mjs <output-directory>');
if (execFileSync('git', ['status', '--porcelain'], {encoding:'utf8'}).trim()) throw new Error('Commit front changes before exporting: provenance requires a clean checkout.');
const routerPath = 'src/routes/router.tsx';
const source = ts.createSourceFile(routerPath, fs.readFileSync(routerPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const metadata = JSON.parse(fs.readFileSync('docs/ui-route-help.json', 'utf8'));
const entries = new Map(metadata.routes.map(r => [r.route_path, r]));
const routes = [];
function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const props = new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(source), p.initializer]));
    const route = props.get('path'), element = props.get('element');
    if (route && ts.isStringLiteral(route) && route.text !== '*') {
      const component = element && ts.isJsxSelfClosingElement(element) ? element.tagName.getText(source) : '';
      const help = entries.get(route.text) || {};
      routes.push({ ...help, route_path: route.text, page_name: component,
        auth_required: !['/login', '/register', '/auth/callback', '/auth/logout/callback'].includes(route.text),
        domain: help.domain || 'Navigation', purpose: help.purpose || `Page ${component}` });
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);
const validPaths = new Set(routes.map(r => r.route_path));
const result = { schema_version: '1.0', source: {repository:'CNP-Front', commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), router:routerPath, help:'docs/ui-route-help.json', notes:['Generated from the committed front router and front-owned help metadata. Server permissions remain authoritative.']}, navigation:metadata.navigation.filter(n => validPaths.has(n.route)), routes, help_map:metadata.help_map.filter(h => validPaths.has(h.route)) };
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'ui-routes.json'),JSON.stringify(result,null,2)+'\n');
const guide = ['# Routes CNP — export versionné', '', `Source : CNP-Front ${result.source.commit}. Ne pas éditer cet export ; modifier le routeur ou docs/ui-route-help.json dans le front.`, '', ...routes.flatMap(r => [`## ${r.route_path}`, '', `${r.page_name} — ${r.purpose}`, '', ...(r.related_api_endpoints || []).map(e => `- ${e.method} ${e.path}`), '']), fs.readFileSync('docs/mcp.md','utf8')];
fs.writeFileSync(path.join(output,'ui-routes.md'),guide.join('\n'));
console.log(`Exported ${routes.length} routes from ${result.source.commit}`);
