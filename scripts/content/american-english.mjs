#!/usr/bin/env node
/**
 * American English in the text people read (founder's commercial-readiness directive, 25 Nov 2026, §12: "Use American spelling for US
 * buyers"; an external review found "authorised", "programme", "Centre", "modelled", "labelled" and "theatre" beside their American forms).
 *
 * It changes ONLY what a person reads in the demo, the website and the shared UI:
 *   - JSX text;
 *   - string and template-literal text that contains a space (a sentence, a label of several words), outside className, style, id, key,
 *     href, src and data-* attributes, outside import/export specifiers and object keys.
 * It never changes identifiers, object keys, regular expressions, comments, single-word strings (they are often keys or enum values), or
 * an ALL-CAPS word (an enum value such as CANCELLED). A capitalized "Centre" or "Theatre" in the name of a fictional place is changed
 * too: founder, 26 Nov 2026 04:50 CT, "Use Center for fictional American locations" / "Use Theater for fictional American locations"
 * (every place in the demonstration and the website is a fictional American one). The SIGNAL canon (packages/signal-canon) is not
 * under ROOTS: it is the preserved standalone source and is not edited here.
 * "analyses" is kept: it is also the American plural of "analysis".
 *
 *   node scripts/content/american-english.mjs            report what would change, per file, and exit 1 when anything would
 *   node scripts/content/american-english.mjs --write    change it
 *   node scripts/content/american-english.mjs --check    exit 1 when anything would change (no test runs it yet)
 *
 * Kept as written (26 Nov 2026, after an independent review): a generated file ("do not edit by hand", changed at its source); a line
 * holding the comment `american-english: keep`, or the lines between `american-english: keep-start` and `keep-end` (the recorded SIGNAL
 * takes, which must equal the canon word for word, and SIGNAL's own place names); a computed object key. A piece of a template literal
 * is judged by the whole template: in `${w} meters by ${l} metres` the last piece is one word but part of a sentence. Not handled, so
 * read the diff after --write: a one-word string (a key or a label, the tool cannot tell), an ALL-CAPS word, and a class name joined
 * by a single hyphen ("text-centre") in a string built outside a className attribute.
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ts = createRequire(import.meta.url)(path.join(repo, 'node_modules/typescript'));
const ROOTS = ['apps/demo/src', 'apps/website/src', 'packages/ui/src'];
const SKIP_DIRS = new Set(['generated', 'node_modules', 'dist']);

// British → American, whole words; the forms of each word are listed so nothing is guessed
const PAIRS = [];
const add = (uk, us) => PAIRS.push([uk, us]);
for (const stem of ['authoris', 'organis', 'recognis', 'optimis', 'prioritis', 'minimis', 'maximis', 'summaris', 'standardis', 'categoris', 'emphasis', 'finalis', 'normalis', 'visualis', 'realis', 'utilis', 'specialis', 'customis', 'harmonis', 'synchronis', 'initialis', 'personalis', 'centralis', 'apologis', 'criticis', 'memoris', 'localis', 'stabilis', 'sanitis', 'digitis', 'monetis', 'operationalis', 'contextualis', 'democratis', 'formalis', 'idealis', 'legitimis', 'mobilis', 'neutralis', 'patronis', 'randomis', 'rationalis', 'revolutionis', 'scrutinis', 'symbolis', 'tokenis', 'vandalis', 'jeopardis', 'capitalis', 'characteris', 'familiaris', 'hospitalis', 'immunis', 'industrialis', 'internationalis', 'liberalis', 'materialis', 'modernis', 'nationalis', 'penalis', 'popularis', 'privatis', 'regularis', 'socialis', 'sterilis', 'subsidis', 'urbanis']) {
  const us = stem.slice(0, -1) + 'z';
  for (const end of ['e', 'ed', 'es', 'ing', 'ation', 'ations', 'er', 'ers']) add(stem + end, us + end);
}
for (const [uk, us] of [['analyse', 'analyze'], ['analysed', 'analyzed'], ['analysing', 'analyzing'], ['analyser', 'analyzer'], ['analysers', 'analyzers'], ['paralyse', 'paralyze'], ['paralysed', 'paralyzed'], ['catalyse', 'catalyze']]) add(uk, us);
for (const w of ['behaviour', 'colour', 'favour', 'honour', 'labour', 'neighbour', 'harbour', 'humour', 'rumour', 'vigour', 'endeavour', 'flavour', 'armour', 'savour', 'parlour', 'odour', 'valour', 'splendour', 'rancour', 'clamour', 'tumour', 'saviour']) {
  const us = w.replace(/our$/, 'or');
  for (const end of ['', 's', 'ed', 'ing', 'ful', 'al', 'ite', 'ites', 'able', 'hood', 'hoods', 'less']) add(w + end, us + end);
}
for (const [uk, us] of [['centre', 'center'], ['centres', 'centers'], ['centred', 'centered'], ['theatre', 'theater'], ['theatres', 'theaters'], ['metre', 'meter'], ['metres', 'meters'], ['kilometre', 'kilometer'], ['kilometres', 'kilometers'], ['centimetre', 'centimeter'], ['centimetres', 'centimeters'], ['millimetre', 'millimeter'], ['millimetres', 'millimeters'], ['litre', 'liter'], ['litres', 'liters'], ['fibre', 'fiber'], ['fibres', 'fibers'], ['calibre', 'caliber'], ['sombre', 'somber'], ['spectre', 'specter'], ['lustre', 'luster'], ['meagre', 'meager'], ['manoeuvre', 'maneuver'], ['manoeuvres', 'maneuvers']]) add(uk, us);
for (const [uk, us] of [['modelled', 'modeled'], ['modelling', 'modeling'], ['labelled', 'labeled'], ['labelling', 'labeling'], ['travelled', 'traveled'], ['travelling', 'traveling'], ['traveller', 'traveler'], ['travellers', 'travelers'], ['cancelled', 'canceled'], ['cancelling', 'canceling'], ['levelled', 'leveled'], ['levelling', 'leveling'], ['signalled', 'signaled'], ['signalling', 'signaling'], ['fuelled', 'fueled'], ['fuelling', 'fueling'], ['totalled', 'totaled'], ['channelled', 'channeled'], ['marshalled', 'marshaled'], ['dialled', 'dialed'], ['dialling', 'dialing'], ['counselling', 'counseling'], ['counsellor', 'counselor'], ['jewellery', 'jewelry'], ['enrolment', 'enrollment'], ['enrolments', 'enrollments'], ['fulfil', 'fulfill'], ['fulfils', 'fulfills'], ['fulfilment', 'fulfillment'], ['instalment', 'installment'], ['instalments', 'installments'], ['skilful', 'skillful'], ['wilful', 'willful'], ['programme', 'program'], ['programmes', 'programs'], ['catalogue', 'catalog'], ['catalogues', 'catalogs'], ['catalogued', 'cataloged'], ['cataloguing', 'cataloging'], ['licence', 'license'], ['licences', 'licenses'], ['grey', 'gray'], ['greys', 'grays'], ['greyed', 'grayed'], ['defence', 'defense'], ['defences', 'defenses'], ['offence', 'offense'], ['offences', 'offenses'], ['pretence', 'pretense'], ['ageing', 'aging'], ['acknowledgement', 'acknowledgment'], ['acknowledgements', 'acknowledgments'], ['judgement', 'judgment'], ['judgements', 'judgments'], ['practise', 'practice'], ['practised', 'practiced'], ['practising', 'practicing'], ['cheque', 'check'], ['cheques', 'checks'], ['kerb', 'curb'], ['storey', 'story'], ['storeys', 'stories'], ['towards', 'toward'], ['afterwards', 'afterward'], ['learnt', 'learned'], ['spelt', 'spelled'], ['dreamt', 'dreamed'], ['whilst', 'while'], ['amongst', 'among'], ['plough', 'plow'], ['mould', 'mold'], ['moulds', 'molds'], ['smoulder', 'smolder'], ['tyre', 'tire'], ['tyres', 'tires'], ['aluminium', 'aluminum'], ['sceptical', 'skeptical'], ['sceptic', 'skeptic'], ['speciality', 'specialty'], ['specialities', 'specialties'], ['draught', 'draft'], ['pyjamas', 'pajamas'], ['aeroplane', 'airplane']]) add(uk, us);

const MAP = new Map(PAIRS.filter(([a, b]) => a !== b));
const WORD = /[A-Za-z]+/g;
const caseLike = (src, to) => src === src.toLowerCase() ? to : src[0] === src[0].toUpperCase() && src.slice(1) === src.slice(1).toLowerCase() ? to[0].toUpperCase() + to.slice(1) : null;
function fix(text) {
  let n = 0;
  const out = text.replace(WORD, (w, at) => {
    if (w.length > 1 && w === w.toUpperCase()) return w;   // an enum value or an acronym
    const before = text.slice(Math.max(0, at - 2), at), after = text.slice(at + w.length, at + w.length + 2);
    if (before.endsWith('_') || after.startsWith('_') || before === '--' || after === '--') return w;   // a class name (block__element, block--modifier)
    const low = w.toLowerCase(); const to = MAP.get(low); if (!to) return w;
    const r = caseLike(w, to); if (!r) return w; n += 1; return r;
  });
  return { out, n };
}

const SKIP_ATTR = /^(className|class|style|id|key|href|src|srcSet|sizes|type|name|role|htmlFor|data-.*|aria-controls|aria-labelledby|aria-describedby|testId|testid|rel|target|method|action|autoComplete|inputMode|pattern|lang|dir|viewBox|d|fill|stroke|transform|xmlns|points)$/;
function edits(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const skip = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p) && SKIP_ATTR.test(p.name.getText(sf))) return true;
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
      if (ts.isPropertyAssignment(p) && p.name === node) return true;
      if (ts.isComputedPropertyName(p)) return true;                                   // [`${k} colour`]: a key, however it reads
      if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
      if (ts.isCallExpression(p) && /(querySelector(All)?|getElementById|getItem|setItem|removeItem|getAttribute|setAttribute|closest|matches|addEventListener|removeEventListener|dispatchEvent|require|import)$/.test(p.expression.getText(sf))) return true;
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p) || ts.isSourceFile(p)) break;
    }
    return false;
  };
  const lines = text.split('\n'); const kept = new Set(); let region = false;
  lines.forEach((l, i) => { if (/american-english: keep-start/.test(l)) region = true; if (region || /american-english: keep\b(?!-)/.test(l)) kept.add(i); if (/american-english: keep-end/.test(l)) region = false; });
  if (region) console.warn(`${file}: american-english: keep-start without keep-end; the rest of the file is kept`);
  const keptAt = (node) => kept.has(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line);
  const visit = (node) => {
    let raw = null; let start = 0;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { raw = node.getText(sf).slice(1, -1); start = node.getStart(sf) + 1; }
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) { const t = node.getText(sf); const head = 1; const tail = ts.isTemplateTail(node) ? 1 : 2; raw = t.slice(head, t.length - tail); start = node.getStart(sf) + head; }
    else if (ts.isJsxText(node)) { raw = node.getText(sf); start = node.getStart(sf); }
    if (raw != null && raw.trim()) {
      const isJsxText = ts.isJsxText(node);
      // a piece of a template literal is judged by the whole template: in `${w} meters by ${l} metres` the last piece is one word,
      // but it is a sentence (26 Nov 2026: the first sweep left that piece in British spelling)
      const whole = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
        ? (() => { let p = node.parent; while (p && !ts.isTemplateExpression(p)) p = p.parent; return p ? [p.head.text, ...p.templateSpans.map((x) => x.literal.text)].join('') : raw; })()
        : raw;
      const sentence = isJsxText || /\s/.test(raw.trim()) || (whole !== raw && /\S\s+\S/.test(whole.trim()) && /[a-z]{2,} [a-z]{2,}/i.test(whole));
      if (sentence && !skip(node) && !keptAt(node)) { const { out: fixed, n } = fix(raw); if (n) out.push({ start, end: start + raw.length, from: raw, to: fixed, n }); }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(d, e.name)); } else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !/\.gen\.ts$/.test(e.name)) files.push(path.join(d, e.name)); } };
for (const r of ROOTS) walk(path.join(repo, r));
const write = process.argv.includes('--write'); const check = process.argv.includes('--check');
let total = 0; const per = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8'); if (/do not edit by hand|@generated/i.test(text.slice(0, 600))) continue;   // a generated file is changed at its source
  const es = edits(f, text); if (!es.length) continue;
  const n = es.reduce((a, e) => a + e.n, 0); total += n; per.push([path.relative(repo, f), n, es]);
  if (write) { let t = text; for (const e of [...es].sort((a, b) => b.start - a.start)) t = t.slice(0, e.start) + e.to + t.slice(e.end); fs.writeFileSync(f, t); }
}
if (!check || total) {
  for (const [f, n, es] of per.sort((a, b) => b[1] - a[1])) { console.log(`${String(n).padStart(4)}  ${f}`); if (!write && process.argv.includes('--show')) for (const e of es.slice(0, 6)) console.log(`        ${e.from.slice(0, 110)}\n     →  ${e.to.slice(0, 110)}`); }
}
console.log(`${write ? 'changed' : 'would change'} ${total} word${total === 1 ? '' : 's'} in ${per.length} file${per.length === 1 ? '' : 's'}`);
process.exit(write ? 0 : total ? 1 : 0);
