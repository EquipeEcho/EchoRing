// Run from frontend: node scripts/sync-reference-data.cjs
// Sources: the workflow library and the approved catalog transcribed from
// "Lista de Idiomas (2).docx". Do not regenerate the full ISO language list.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const backendData = path.join(root, 'backend/app/data');
const frontendData = path.join(root, 'frontend/src/data');
fs.mkdirSync(backendData, { recursive: true });
fs.mkdirSync(frontendData, { recursive: true });
const source = fs.readFileSync(path.join(root, 'frontend/src/features/workflows/data/workflow-templates.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
new Function('exports', compiled)(exported);
fs.writeFileSync(path.join(backendData, 'workflow-templates.json'), JSON.stringify(exported.workflowTemplates, null, 2) + '\n');
const languages = JSON.parse(fs.readFileSync(path.join(backendData, 'language-catalog.json'), 'utf8'));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
if (!languages.length || languages.some(item => !item.code || !item.name || !Array.isArray(item.aliases)) ||
    new Set(languages.map(item => normalize(item.code))).size !== languages.length ||
    new Set(languages.map(item => normalize(item.name))).size !== languages.length) {
  throw new Error('O catálogo aprovado deve conter nomes e códigos únicos e uma lista de aliases por idioma.');
}
const json = JSON.stringify(languages) + '\n';
fs.writeFileSync(path.join(backendData, 'languages.json'), json);
fs.writeFileSync(path.join(frontendData, 'languages.json'), json);
console.log(`${languages.length} idiomas; ${exported.workflowTemplates.length} workflows sincronizados.`);
