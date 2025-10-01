import { JOURNEY, COMMANDS as BASE_COMMANDS } from './data/journey.js';

const appEl = document.getElementById('app');
const consoleOut = document.getElementById('console-output');
const consoleForm = document.getElementById('console-form');
const consoleInput = document.getElementById('console-input');
const inputMirror = document.getElementById('input-mirror');
const promptSpan = document.getElementById('console-prompt');
const timelineContent = document.getElementById('timeline-content');
const yearTabs = document.getElementById('year-tabs');
const themeSwitcher = document.getElementById('theme-switcher');
const yearSpan = document.getElementById('year');
const introEl = document.querySelector('.terminal-intro');

yearSpan.textContent = new Date().getFullYear();

function typeSequence(lines, speed = 28) {
  return new Promise(resolve => {
    let i = 0, line = 0, current = '';
    const tick = () => {
      if (line >= lines.length) { resolve(); return; }
      const target = lines[line];
      if (i <= target.length) {
        introEl.textContent = lines.slice(0, line).join('\n') + (line? '\n':'') + target.slice(0, i);
        i++;
      } else {
        line++; i = 0; current='';
      }
      setTimeout(tick, speed + (Math.random()*40-20));
    }; tick();
  });
}

function writeLine(text = '', cls='', html=false) {
  const div = document.createElement('div');
  div.className = 'line'+ (cls? ' '+cls:'');
  if (html) div.innerHTML = text; else div.textContent = text;
  consoleOut.appendChild(div);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}
function clearConsole() { consoleOut.innerHTML=''; }

function setTheme(name) {
  const allowed = ['ubuntu','cachyos','fedora','gentoo','void'];
  if (!allowed.includes(name)) return 'Tema tidak ditemukan';
  document.documentElement.dataset.theme = name;
  [...themeSwitcher.querySelectorAll('button')].forEach(b=> b.classList.toggle('active', b.dataset.theme===name));
  return 'Tema diganti → '+name;
}

// Build theme buttons
['ubuntu','cachyos','fedora','gentoo','void'].forEach(t => {
  const btn = document.createElement('button');
  btn.textContent = t;
  btn.dataset.theme = t;
  if (document.documentElement.dataset.theme === t) btn.classList.add('active');
  btn.addEventListener('click', ()=> { writeLine(setTheme(t)); });
  themeSwitcher.appendChild(btn);
});

// Build timeline tabs
JOURNEY.forEach((j, idx) => {
  const btn = document.createElement('button');
  btn.type='button';
  btn.role='tab';
  btn.ariaSelected = idx===0 ? 'true':'false';
  btn.textContent = j.range;
  btn.addEventListener('click', () => selectRange(j.range));
  yearTabs.appendChild(btn);
});

function selectRange(range) {
  [...yearTabs.children].forEach(b => b.setAttribute('aria-selected', b.textContent===range? 'true':'false'));
  const found = JOURNEY.find(j => j.range === range) || JOURNEY[0];
  renderEntries(found);
}

function renderEntries(group) {
  timelineContent.innerHTML='';
  const entry = document.createElement('div');
  entry.className='entry';
  const h = document.createElement('h3'); h.textContent = `${group.range} — ${group.label}`; entry.appendChild(h);
  const ul = document.createElement('ul');
  group.points.forEach(p => { const li=document.createElement('li'); li.textContent=p; ul.appendChild(li); });
  entry.appendChild(ul);
  timelineContent.appendChild(entry);
}

selectRange(JOURNEY[0].range);

// ===== Pseudo Filesystem =====
// Minimal tree representing journey & brand
const FS = {
  'README.txt': 'Ketik help untuk daftar command.',
  journey: { 'index.txt': JOURNEY.map(j=> `${j.range} - ${j.label}`).join('\n') },
  brand: {
    'alias.txt': 'Zen',
    'roles.txt': 'Linux Enthusiast\nSelf-taught Web Dev\nDigital Forensic Explorer',
    'statement.txt': 'Eksperimen adalah cara tercepat paham hal kompleks.'
  }
};
let cwd = '/';

function pathJoin(base, rel) {
  if (rel.startsWith('/')) return rel;
  if (base.endsWith('/')) return base + rel; else return base + '/' + rel;
}
function normalize(path) {
  const parts = path.split('/').filter(Boolean);
  const stack=[]; for (const p of parts){ if(p==='..') stack.pop(); else if(p!=='.') stack.push(p);} return '/' + stack.join('/');
}
function getNode(path) {
  if (path === '/') return FS; const parts = path.split('/').filter(Boolean); let cur=FS; for (const p of parts) { if (cur && typeof cur === 'object' && p in cur) cur = cur[p]; else return undefined; } return cur; }
function isDir(node) { return node && typeof node === 'object' && !Array.isArray(node); }

// ===== Command Implementations (extended) =====
const HISTORY = [];
let historyIndex = -1;

function colorizePrompt() {
  const host='zenos';
  const user='zen';
  const shortPath = cwd === '/' ? '~' : cwd.replace(/\/+/g,'/').replace(/^\/+/, '').split('/').slice(-2).join('/') || '/';
  promptSpan.innerHTML = `<span class="tok-cmd">${user}</span>@<span class="tok-sys">${host}</span>:<span class="prompt-path">${shortPath}</span>$`;
}
colorizePrompt();

function listDir(path) {
  const node = getNode(path);
  if (!isDir(node)) return 'Bukan direktori';
  const entries = Object.keys(node).sort();
  return `<div class="ls-grid">` + entries.map(e => isDir(node[e])? `<span class="ls-dir tok-dir">${e}</span>` : `<span>${e}</span>`).join('') + '</div>';
}

function catFile(path) {
  const node = getNode(path);
  if (node === undefined) return 'File tidak ditemukan';
  if (isDir(node)) return 'Ini direktori';
  return String(node);
}

function grep(pattern, text) {
  try { const regex = new RegExp(pattern, 'i'); return text.split('\n').filter(l => regex.test(l)).join('\n'); } catch { return 'Pattern regex tidak valid'; }
}

// Merge base commands with new ones
const COMMANDS = {
  ...BASE_COMMANDS,
  ls: { desc:'List file', action: () => ({html: listDir(cwd)}) },
  pwd: { desc:'Tampilkan path', action: () => cwd },
  cd: { desc:'Ganti direktori', action: (arg) => { if(!arg) { cwd='/'; colorizePrompt(); return cwd; } const target = normalize(pathJoin(cwd,arg)); const node=getNode(target); if(node && isDir(node)){ cwd=target; colorizePrompt(); return ''; } return 'Direktori tidak ditemukan'; } },
  cat: { desc:'Lihat isi file', action: (arg) => { if(!arg) return 'Butuh nama file'; const target = normalize(pathJoin(cwd,arg)); return catFile(target); } },
  history: { desc:'Riwayat command', action: () => HISTORY.map((h,i)=> `${i+1}  ${h}`).join('\n') },
  grep: { desc:'Filter teks: usage grep pattern file', action: (arg) => { const [pattern, file] = arg.split(/\s+/); if(!pattern||!file) return 'Usage: grep pattern file'; const content = catFile(normalize(pathJoin(cwd,file))); if(/File tidak ditemukan|Ini direktori/.test(content)) return content; const res = grep(pattern, content); return res || '(no match)'; } },
  whoami: { desc:'User saat ini', action: () => 'zen' },
  date: { desc:'Tanggal sekarang', action: () => new Date().toString() },
  alias: { desc:'Alias contoh', action: () => 'Belum ada alias custom.' }
};

// Override help to reflect dynamic list (after extending)
COMMANDS.help = {
  desc: 'Daftar command',
  action: () => {
    const keys = Object.keys(COMMANDS).sort();
    const rows = keys.map(k => {
      const d = COMMANDS[k].desc || '';
      return k.padEnd(10,' ') + ' - ' + d;
    }).join('\n');
    return rows + '\nTotal: '+ keys.length + ' command';
  }
};

// === ASCII Banner utility ===
function bannerZen() {
  return [
    '███████╗ ███████╗ ███╗   ██╗',
    '╚══███╔╝ ██╔════╝ ████╗  ██║',
    '  ███╔╝  █████╗   ██╔██╗ ██║',
    ' ███╔╝   ██╔══╝   ██║╚██╗██║',
    '███████╗ ███████╗ ██║ ╚████║',
    '╚══════╝ ╚══════╝ ╚═╝  ╚═══╝'
  ].join('\n');
}
function bannerFull() {
  return [
    'Indra "Zen" Pranata',
    '────────────────────',
    'Linux · Web Dev · Forensic Explorer'
  ].join('\n');
}

COMMANDS.banner = {
  desc: 'Tampilkan ASCII banner (usage: banner [zen|full])',
  action: (arg) => {
    const mode = (arg||'zen').toLowerCase();
    let art = mode === 'full' ? bannerFull() : bannerZen();
    return { html: `<pre class="ascii-banner">${art}</pre>` };
  }
};

// ===== Matrix Mode =====
let matrixCanvas, matrixCtx, matrixCols = [], matrixAnimId;
function ensureMatrixCanvas() {
  if (matrixCanvas) return;
  matrixCanvas = document.createElement('canvas');
  matrixCanvas.className = 'matrix-canvas';
  document.body.appendChild(matrixCanvas);
  matrixCtx = matrixCanvas.getContext('2d');
  onResizeMatrix();
  window.addEventListener('resize', onResizeMatrix);
}
function onResizeMatrix() {
  if (!matrixCanvas) return;
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const cols = Math.floor(matrixCanvas.width / 14);
  matrixCols = new Array(cols).fill(0).map(()=> Math.random()*matrixCanvas.height);
}
function drawMatrix() {
  matrixCtx.fillStyle = 'rgba(0,0,0,0.15)';
  matrixCtx.fillRect(0,0,matrixCanvas.width,matrixCanvas.height);
  const chars = '01ZEN<>/{}[]=+*';
  matrixCtx.font = '14px JetBrains Mono, monospace';
  for (let i=0;i<matrixCols.length;i++) {
    const x = i*14;
    const y = matrixCols[i];
    const ch = chars[Math.floor(Math.random()*chars.length)];
    matrixCtx.fillStyle = `hsl(${(Date.now()/40 + i*7)%360} 80% 60%)`;
    matrixCtx.fillText(ch, x, y);
    matrixCols[i] = y > matrixCanvas.height + Math.random()*200 ? 0 : y + 16 + Math.random()*6;
  }
  matrixAnimId = requestAnimationFrame(drawMatrix);
}
function startMatrix() {
  ensureMatrixCanvas();
  if (!document.body.classList.contains('matrix')) {
    document.body.classList.add('matrix');
  }
  if (!matrixAnimId) drawMatrix();
  return 'Matrix mode ON';
}
function stopMatrix() {
  document.body.classList.remove('matrix');
  if (matrixAnimId) cancelAnimationFrame(matrixAnimId); matrixAnimId = null;
  if (matrixCanvas) { matrixCtx.clearRect(0,0,matrixCanvas.width,matrixCanvas.height); }
  return 'Matrix mode OFF';
}

COMMANDS.mode = {
  desc: 'Atur mode visual (usage: mode matrix|normal)',
  action: (arg) => {
    if (arg === 'matrix') return startMatrix();
    if (arg === 'normal') return stopMatrix();
    return 'Usage: mode matrix|normal';
  }
};

COMMANDS.display = {
  desc: 'Display style (usage: display crt|normal)',
  action: (arg) => {
    if (arg === 'crt') { document.body.classList.add('crt'); return 'CRT mode ON'; }
    if (arg === 'normal') { document.body.classList.remove('crt'); return 'CRT mode OFF'; }
    return 'Usage: display crt|normal';
  }
};

// Present mode
COMMANDS.present = {
  desc: 'Present mode (usage: present on|off)',
  action: (arg) => {
    if (arg==='on') { document.body.classList.add('present'); return 'Present mode ON'; }
    if (arg==='off') { document.body.classList.remove('present'); return 'Present mode OFF'; }
    return 'Usage: present on|off';
  }
};

// Panic overlay
let panicEl = null;
function buildPanic() {
  const log = [
    '*** Kernel Panic - ZenOS 0.1 ***',
    'Fatal: inconsistent mindset state detected',
    'Trace: curiosity -> experiment -> failure -> iterate -> growth',
    'Hint: Keep exploring. Exit with ESC.',
    '',
    'Registers:',
    ' R1 = linux',
    ' R2 = webdev',
    ' R3 = forensic',
    ' R4 = persistence',
    '',
    'Stack (top 6):',
    ' 0x01 experiment()',
    ' 0x02 debug()',
    ' 0x03 refactor()',
    ' 0x04 document()',
    ' 0x05 present()',
    ' 0x06 learn()',
  ].join('\n');
  const div = document.createElement('div');
  div.className='panic-overlay';
  div.innerHTML = `<div class="title">ZenOS Kernel Panic</div><pre>${log}</pre><div class="hint">Press ESC to resume</div>`;
  return div;
}
function showPanic() {
  if (panicEl) return 'Panic already active';
  panicEl = buildPanic();
  document.body.appendChild(panicEl);
  const esc = (e)=> { if(e.key==='Escape'){ hidePanic(); window.removeEventListener('keydown', esc);} };
  window.addEventListener('keydown', esc);
  return 'Kernel panic triggered';
}
function hidePanic() { if(panicEl){ panicEl.remove(); panicEl=null; return 'Recovered from panic'; } return 'No panic active'; }
COMMANDS.panic = { desc:'Trigger fake kernel panic', action: () => showPanic() };

// Export journey JSON
COMMANDS.export = {
  desc: 'Export data (usage: export journey)',
  action: (arg)=> {
    if (arg !== 'journey') return 'Usage: export journey';
    const blob = new Blob([JSON.stringify(JOURNEY,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='journey.json'; a.click(); setTimeout(()=> URL.revokeObjectURL(url), 2000);
    return 'Journey diekspor (journey.json)';
  }
};

// Pipeline executor
async function execute(raw) {
  const segments = raw.split('|').map(s=>s.trim()).filter(Boolean);
  let input = '';
  for (const seg of segments) {
    const [cmd, ...rest] = seg.split(/\s+/);
    const arg = rest.join(' ');
    const handler = COMMANDS[cmd];
    if (!handler) { return 'Command tidak dikenal: '+cmd; }
    let out;
    try { out = handler.action(arg, { clear: clearConsole, setTheme }); } catch(err) { out = 'Error: '+err.message; }
    if (typeof out === 'object' && out && out.html) {
      // Hilangkan HTML bila diteruskan ke command selain terakhir agar aman
      const isLast = seg === segments[segments.length-1];
      input = isLast ? out.html : (out.html.replace(/<[^>]+>/g,' '));
    } else input = String(out||'');
  }
  return input;
}

function renderUserInput(raw) {
  const tokens = raw.split(/\s+/);
  if (!tokens[0]) return '';
  return `<span class="tok-cmd">${tokens[0]}</span>` + tokens.slice(1).map(t => {
    if(t.startsWith('-')) return ` <span class="tok-arg">${t}</span>`;
    if(t.includes('/')||t.includes('.')) return ` <span class="tok-path">${t}</span>`;
    return ` <span>${t}</span>`; }).join('');
}

inputMirror.textContent='';
consoleInput.addEventListener('input', () => {
  updateMirrorWithSuggestion();
});

// ===== Autocomplete utilities =====
let lastTabTime = 0; let lastTabValue = '';
function getFsEntries(path) {
  const node = getNode(path);
  if (!isDir(node)) return [];
  return Object.keys(node).map(n => ({ name:n, isDir:isDir(node[n]) }));
}
function collectCandidates(raw) {
  // Split pipelines, consider only last segment
  const seg = raw.split('|').pop().trim();
  const parts = seg.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { type:'command', prefix:'', list:Object.keys(COMMANDS) };
  if (parts.length === 1) {
    return { type:'command', prefix:parts[0], list:Object.keys(COMMANDS) };
  }
  // argument context
  const cmd = parts[0];
  const current = parts[parts.length-1];
  // For cd / cat / grep second arg treat as path
  if (['cd','cat','grep'].includes(cmd)) {
    let basePath = cwd;
    let prefix = current;
    if (current.startsWith('/')) { basePath = '/'; }
    const entries = getFsEntries(basePath);
    return { type:'path', prefix, list: entries.map(e => e.name + (e.isDir? '/':'')) };
  }
  return { type:'generic', prefix:current, list:[] };
}

function commonPrefix(list) {
  if (!list.length) return '';
  let pref = list[0];
  for (let i=1;i<list.length;i++) {
    while(!list[i].startsWith(pref) && pref) pref = pref.slice(0,-1);
    if (!pref) break;
  }
  return pref;
}

function applyAutocomplete() {
  const raw = consoleInput.value;
  const { prefix, list } = collectCandidates(raw);
  const filtered = list.filter(n => n.startsWith(prefix));
  if (!prefix && filtered.length === list.length) return; // nothing to do
  if (filtered.length === 0) return;
  // Single match → complete fully
  if (filtered.length === 1) {
    completeTo(filtered[0]);
    return;
  }
  // Multi: find common prefix beyond current
  const cp = commonPrefix(filtered);
  if (cp && cp !== prefix) {
    completeTo(cp);
  } else {
    // double tab list reveal
    const now = Date.now();
    if (lastTabValue === raw && now - lastTabTime < 600) {
      writeLine(filtered.join('  '));
    }
    lastTabValue = raw; lastTabTime = now;
  }
}

function completeTo(target) {
  const raw = consoleInput.value;
  const segments = raw.split('|');
  let seg = segments.pop();
  const parts = seg.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) { consoleInput.value = target + ' '; return updateMirror(); }
  parts[parts.length-1] = target;
  seg = ' ' + parts.join(' ');
  const rebuilt = [...segments, seg].join('|');
  const needsSpace = !target.endsWith('/') ;
  consoleInput.value = rebuilt.replace(/^\s+/,'') + (needsSpace? ' ' : '');
  updateMirror();
}

function updateMirror() { inputMirror.innerHTML = renderUserInput(consoleInput.value); }

function updateMirrorWithSuggestion() {
  const raw = consoleInput.value;
  const base = renderUserInput(raw);
  const { prefix, list } = collectCandidates(raw);
  const filtered = list.filter(n => prefix && n.startsWith(prefix));
  let ghost = '';
  if (filtered.length >= 1) {
    const best = filtered[0];
    if (best !== prefix) {
      const remain = best.slice(prefix.length);
      ghost = `<span class="suggest">${remain}</span>`;
    }
  }
  inputMirror.innerHTML = base + ghost;
}

// Tab key integration
consoleForm.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    applyAutocomplete();
    updateMirrorWithSuggestion();
  }
});

// History navigation
consoleForm.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') { if (HISTORY.length) { historyIndex = historyIndex <=0? 0 : historyIndex-1; consoleInput.value = HISTORY[historyIndex]; inputMirror.innerHTML = renderUserInput(consoleInput.value); e.preventDefault(); } }
  if (e.key === 'ArrowDown') { if (HISTORY.length) { historyIndex = historyIndex >=HISTORY.length-1? HISTORY.length-1 : historyIndex+1; consoleInput.value = HISTORY[historyIndex]; inputMirror.innerHTML = renderUserInput(consoleInput.value); e.preventDefault(); } }
});

// Focus handling (click mirror area)
document.querySelector('.input-wrap').addEventListener('click', () => consoleInput.focus());

consoleForm.addEventListener('submit', async e => {
  e.preventDefault();
  const raw = consoleInput.value.trim();
  if (!raw) return; 
  HISTORY.push(raw); historyIndex = HISTORY.length; 
  const renderedInput = renderUserInput(raw) || raw;
  const ps1 = promptSpan.innerHTML;
  writeLine(`<span class="ps1">${ps1}</span> <span class="command">${renderedInput}</span>`, 'promptline', true);
  const result = await execute(raw);
  if (result) {
    if (result.startsWith('<div') || result.includes('ls-grid')) writeLine(result, '', true); else {
      const processed = result.replace(/(\b20\d{2}(?:-|→)(?:20)?\d{2}\b)/g, '<span class="tok-range">$1</span>');
      processed.split('\n').forEach(l=> writeLine(l, '', true));
    }
  }
  consoleInput.value=''; inputMirror.textContent='';
});

// Keyboard timeline quick nav (Alt+Arrow)
window.addEventListener('keydown', e => {
  if (e.altKey && ['ArrowLeft','ArrowRight'].includes(e.key)) {
    const btns = [...yearTabs.children];
    const idx = btns.findIndex(b => b.getAttribute('aria-selected')==='true');
    const next = e.key==='ArrowRight' ? (idx+1)%btns.length : (idx-1+btns.length)%btns.length;
    selectRange(btns[next].textContent);
  }
});

// Auto intro sequence then reveal app
// === Boot progress simulation ===
(async () => {
  const phases = [
    { label: 'Init core', delay: 220 },
    { label: 'Load modules', delay: 300 },
    { label: 'Mount /dev/zen', delay: 260 },
    { label: 'Scan journey timeline', delay: 340 },
    { label: 'Apply themes', delay: 240 },
    { label: 'Spawn shell', delay: 280 }
  ];
  let progress = 0;
  function renderBar(p, msg) {
    const width = 24;
    const filled = Math.round((p/100)*width);
    const bar = '[' + '#'.repeat(filled) + '-'.repeat(width-filled) + ']';
    introEl.textContent = `${bar} ${p.toString().padStart(3,' ')}%\n${msg}`;
  }
  for (let i=0;i<phases.length;i++) {
    progress = Math.min(100, Math.round(((i+1)/phases.length)*100));
    renderBar(progress, phases[i].label + ' …');
    await new Promise(r=> setTimeout(r, phases[i].delay + Math.random()*180));
  }
  introEl.textContent = '[########################] 100%\nREADY → ketik "banner" atau "help"';
  appEl.hidden = false;
  writeLine('Boot selesai. Jalankan perintah: banner | help');
})();
