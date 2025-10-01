// autocomplete.js - tab completion (command + nested path + ghost)
export function getFsEntries(basePath, { getNode, isDir }) {
  const node = getNode(basePath);
  if (!isDir(node)) return [];
  return Object.keys(node).map((n) => ({ name: n, isDir: isDir(node[n]) }));
}

export function collectCandidates(raw, { COMMANDS, getCwd, fsApi }) {
  const seg = raw.split('|').pop().trim();
  const parts = seg.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { type: 'command', prefix: '', list: Object.keys(COMMANDS) };
  if (parts.length === 1) return { type: 'command', prefix: parts[0], list: Object.keys(COMMANDS) };
  const cmd = parts[0];
  const current = parts[parts.length - 1];
  if (['cd','cat','grep'].includes(cmd)) {
    // Nested path support: split current by '/'
    const absolute = current.startsWith('/');
    const cwd = getCwd();
    const pathParts = current.split('/');
    const lastPart = pathParts.pop(); // candidate prefix
    const dirPathRaw = pathParts.join('/');
    let basePath = absolute ? '/' : cwd;
    if (dirPathRaw) {
      // traverse into provided subdirectories
      const segs = dirPathRaw.split('/').filter(Boolean);
      for (const s of segs) {
        const nodePath = (basePath.endsWith('/')? basePath : basePath + '/') + s;
        const node = fsApi.getNode(nodePath);
        if (!node || !fsApi.isDir(node)) { return { type:'path', prefix: current, list: [] }; }
        basePath = nodePath;
      }
    }
    const entries = getFsEntries(basePath, fsApi);
    const list = entries.map(e => {
      const full = (dirPathRaw? dirPathRaw.replace(/\/+/g,'/').replace(/^\/+/,'') + '/' : '') + e.name + (e.isDir? '/':'');
      return full;
    });
    return { type:'path', prefix: current.includes('/') ? current : lastPart, list };
  }
  return { type:'generic', prefix: current, list: [] };
}

export function commonPrefix(list) {
  if (!list.length) return '';
  let pref = list[0];
  for (let i=1;i<list.length;i++) {
    while(!list[i].startsWith(pref) && pref) pref = pref.slice(0,-1);
    if (!pref) break;
  }
  return pref;
}

export function computeAutocomplete(raw, { COMMANDS, getCwd, fsApi }) {
  const { prefix, list } = collectCandidates(raw, { COMMANDS, getCwd, fsApi });
  const filtered = list.filter(n => n.startsWith(prefix));
  return { prefix, list, filtered };
}

export function ghostSuggestion(raw, deps) {
  const { prefix, filtered } = computeAutocomplete(raw, deps);
  if (!filtered.length) return '';
  if (filtered.length === 1) return filtered[0].slice(prefix.length);
  const cp = commonPrefix(filtered);
  if (cp && cp !== prefix) return cp.slice(prefix.length);
  return '';
}

// Factory integrasi UI
export function createAutocomplete({ inputEl, mirrorEl, writeLine, COMMANDS, getCwd, fsApi }) {
  let lastTabTime = 0;
  let lastTabValue = '';

  function renderUserInput(raw) {
    // mirror styling minimal (fallback kalau host tidak punya)
    const tokens = raw.split(/\s+/);
    if (!tokens[0]) return '';
    return `<span class="tok-cmd">${tokens[0]}</span>` + tokens.slice(1).map(t => {
      if (t.startsWith('-')) return ` <span class="tok-arg">${t}</span>`;
      if (t.includes('/')||t.includes('.')) return ` <span class="tok-path">${t}</span>`;
      return ` <span>${t}</span>`; }).join('');
  }

  function updateMirror() { mirrorEl.innerHTML = renderUserInput(inputEl.value); }

  function updateMirrorWithSuggestion() {
    const raw = inputEl.value;
    const deps = { COMMANDS, getCwd, fsApi };
    const ghost = ghostSuggestion(raw, deps);
    if (!ghost) { mirrorEl.innerHTML = renderUserInput(raw); return; }
    mirrorEl.innerHTML = renderUserInput(raw) + `<span class="suggest">${ghost}</span>`;
  }

  function completeTo(target) {
    const raw = inputEl.value;
    const segments = raw.split('|');
    let seg = segments.pop();
    const parts = seg.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) { inputEl.value = target + ' '; updateMirror(); return; }
    parts[parts.length - 1] = target;
    seg = ' ' + parts.join(' ');
    const rebuilt = [...segments, seg].join('|');
    const needsSpace = !target.endsWith('/');
    inputEl.value = rebuilt.replace(/^\s+/, '') + (needsSpace? ' ':'');
    updateMirror();
  }

  function applyAutocomplete() {
    const raw = inputEl.value;
    const deps = { COMMANDS, getCwd, fsApi };
    const { prefix, filtered } = computeAutocomplete(raw, deps);
    if (!prefix && filtered.length === Object.keys(COMMANDS).length) return;
    if (!filtered.length) return;
    if (filtered.length === 1) { completeTo(filtered[0]); return; }
    const cp = commonPrefix(filtered);
    if (cp && cp !== prefix) { completeTo(cp); return; }
    const now = Date.now();
    if (lastTabValue === raw && now - lastTabTime < 600) writeLine(filtered.join('  '));
    lastTabValue = raw; lastTabTime = now;
  }

  return { applyAutocomplete, updateMirrorWithSuggestion, completeTo, updateMirror };
}
