/* node check.js — static check of the two things that break silently here.
   1. sc-if / sc-for tags balance in the template. One stray close tag shifts
      every later block up a level and the app renders the wrong screens.
   2. Every root binding the template reads exists as a key in renderVals().
      dc-mini also warns at runtime, but only for the view you happen to open. */
const fs = require('fs');
const path = require('path');

const BS = String.fromCharCode(92);
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

const OPEN = 'id="dc-template">';
const start = html.indexOf(OPEN) + OPEN.length;
const tpl = html.slice(start, html.indexOf('</scr' + 'ipt>', start));

let fail = 0;
const bad = m => { console.error('FAIL ' + m); fail++; };

/* ---- 1. tag balance ---- */
for (const tag of ['sc-if', 'sc-for']) {
  const re = new RegExp('<(/?)' + tag + BS + 'b', 'g');
  let depth = 0, m, worstLine = 0;
  while ((m = re.exec(tpl))) {
    depth += m[1] ? -1 : 1;
    if (depth < 0 && !worstLine) worstLine = tpl.slice(0, m.index).split('\n').length;
  }
  if (worstLine) bad(tag + ': stray close tag at template line ' + worstLine);
  else if (depth !== 0) bad(tag + ': ' + depth + ' unclosed tag(s)');
}

/* ---- 2. bindings ---- */
const loopVars = new Set([...tpl.matchAll(/\sas="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
const needed = new Set();
for (const m of tpl.matchAll(/\{\{([^}]*)\}\}/g)) {
  const root = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(m[1].trim());
  if (root && !loopVars.has(root[1]) && root[1] !== 'true' && root[1] !== 'false') needed.add(root[1]);
}

// Depth-1 property names of the object literal renderVals() returns.
const SPREAD = app.indexOf('...slotVals');
const src = app.slice(app.lastIndexOf('return {', SPREAD));
const have = new Set(['s0', 's1', 's2', 's3', 's4', 's5', 's6']); // ...slotVals spread
let i = src.indexOf('{'), depth = 0, prev = '{';
while (i < src.length) {
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
  if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }
  if (c === '/' && '(,=:[!&|?{;'.indexOf(prev) >= 0) {          // regex literal
    i++;
    while (i < src.length && src[i] !== '/') {
      if (src[i] === BS) i++;
      else if (src[i] === '[') { while (i < src.length && src[i] !== ']') { if (src[i] === BS) i++; i++; } }
      i++;
    }
    i++; prev = 'x'; continue;
  }
  if (c === '"' || c === "'" || c === '`') {
    const q = c; i++;
    while (i < src.length && src[i] !== q) { if (src[i] === BS) i++; i++; }
    i++; prev = 'x'; continue;
  }
  if (c === '{' || c === '(' || c === '[') { depth++; i++; prev = c; continue; }
  if (c === '}' || c === ')' || c === ']') { depth--; i++; prev = c; if (depth === 0) break; continue; }
  if (depth === 1 && (prev === '{' || prev === ',')) {
    const m = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*[,:}\n]/.exec(src.slice(i, i + 80));
    if (m) { have.add(m[1]); i += m[1].length; prev = 'x'; continue; }
  }
  if (!/\s/.test(c)) prev = c;
  i++;
}

/* 3. CSS trong <style> phai can dau ngoac. Mot dau } thua o cap ngoai cung giet
      quy tac ngay sau no ma khong bao gi. Da dinh that: mot dau } lot vao giua
      .pcard:hover va `*{box-sizing:border-box}` lam ca app mat border-box suot 23
      commit, va hai cong kia van xanh -- chung dem the HTML va bindings, khong
      doc CSS. Quet tay, bo phan trong chu thich; khong dung regex de khoi vuong
      chuyen thoat dau. */
{
  const s0 = html.indexOf('<style>');
  const s1 = html.indexOf('</sty' + 'le>', s0);
  if (s0 >= 0 && s1 > s0) {
    const css = html.slice(s0 + 7, s1);
    const SAO = String.fromCharCode(42), GACH = String.fromCharCode(47), NL = String.fromCharCode(10);
    let d = 0, line = 1, loi = 0, k = 0;
    while (k < css.length) {
      const ch = css[k];
      if (ch === GACH && css[k + 1] === SAO) {          // vao chu thich
        const het = css.indexOf(SAO + GACH, k + 2);
        const doan = css.slice(k, het < 0 ? css.length : het + 2);
        for (let j = 0; j < doan.length; j++) if (doan[j] === NL) line++;
        k = het < 0 ? css.length : het + 2;
        continue;
      }
      if (ch === NL) line++;
      else if (ch === '{') d++;
      else if (ch === '}') { d--; if (d < 0 && loi === 0) { loi = line; d = 0; } }
      k++;
    }
    const dongDau = html.slice(0, s0).split(NL).length;
    if (loi) bad('CSS co dau } thua o khoang dong ' + (dongDau + loi - 1)
                 + ' — quy tac ngay sau no bi bo qua ma khong bao loi');
    else if (d !== 0) bad('CSS thieu ' + d + ' dau } dong lai');
  }
}

/* Cu phap. check.js tung cho lot mot tep app.js KHONG PARSE DUOC: mot chuoi bi
   xuong dong giua chung ("...join(\" <newline> \")") lam ca app trang tron, va ba
   cong deu bao xanh vi khong cong nao thu PHAN TICH tep. Mot dong la du. */
{
  for (const f of ['app.js', 'dc-mini.js']) {
    try { new Function(fs.readFileSync(path.join(__dirname, f), 'utf8')); }
    catch (e) { bad(f + ' khong parse duoc: ' + e.message); }
  }
}

/* Ban phim: moi control cua thiet ke la div/span co onClick, khong phai
   <button>, nen chi dc-mini moi cap cho no tabindex + Enter/Space. Bo cai do
   di la ca app khong con dung duoc bang ban phim ma khong co loi nao bao. */
{
  const dc = fs.readFileSync(path.join(__dirname, 'dc-mini.js'), 'utf8');
  if (!/makeKeyboardControl/.test(dc) || !/setAttribute\('tabindex'/.test(dc))
    bad('dc-mini.js khong con cap tabindex/Enter cho control div+onClick — app mat truy cap ban phim');
}

const missing = [...needed].filter(k => !have.has(k)).sort();
if (missing.length) bad('renderVals is missing ' + missing.length + ' binding(s): ' + missing.join(' '));

console.log(fail
  ? '\n' + fail + ' check(s) failed'
  : 'ok — tags balanced, CSS braces balanced, ' + needed.size + ' template bindings all resolved by renderVals');
process.exit(fail ? 1 : 0);
