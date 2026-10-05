/* =========================================================================
   DISCOGRAFÍA v7.0.14 — Core Parte 1/3: Constantes, utilidades, Store, módulos base
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   ========================================================================= */

const APP_VERSION = "7.0.14";
const STORAGE_KEY = 'discografia_db_v3';
const NOTFOUND_KEY = 'discografia_notfound_v1';
const OWNER_KEY = 'discografia_owner_v1';
const METACACHE_KEY = 'discografia_metacache_v1';
const CUSTOMFIELDS_KEY = 'discografia_custom_fields_v1';
const HISTORY_KEY = 'discografia_history_v1';
const THEME_KEY = 'discografia_theme_v1';
const UNDO_LIMIT = 30;
const MB_API = 'https://musicbrainz.org/ws/2/';
const DISCOGS_API = 'https://api.discogs.com';
const DISCOGS_CONFIG_KEY = 'discografia_discogs_config_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/* v7.0.14-FIX: bajado de 90 a 70 para permitir cachear datos de Last.fm */
const CACHE_MIN_CONFIDENCE = 70;
const ISRC_REGEX = /^[A-Z]{2}-?[A-Z0-9]{3}-?(\d{2})-?(\d{5})$/;
const DEFAULT_AUTHOR = "HDSystem IT";
const DEFAULT_PHONE = "+54 9 11 4563-0851";
const COPYRIGHT_TEXT = "© 2024-" + new Date().getFullYear() + " HDSystem IT · Todos los derechos reservados";
const FETCH_TIMEOUT_MS = 8000;
const DISCOGS_TEST_TIMEOUT_MS = 25000;
const DISCOGS_FETCH_TIMEOUT_MS = 15000;
const DEFAULT_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const RESOLVED_LINKS_KEY = 'discografia_resolved_links_v1';
const LEGAL_NOTICE_KEY = 'discografia_legal_accepted_v1';
const LEGAL_SIGNATURE_KEY = 'discografia_legal_signature_v1';
/* v7.0.14-FIX: bandera para que el corrector legacy corra una sola vez por versión */
const LEGACY_CORRECTED_KEY = 'discografia_legacy_corrected_v1';
const RESOLVED_TTL = 30 * 24 * 3600000;
const RESOLVED_MAX = 500;

const ALLOWED_STREAM_DOMAINS = [
  'open.spotify.com',
  'music.youtube.com','youtube.com','youtu.be',
  'music.apple.com','itunes.apple.com',
  'discogs.com',
  'last.fm','www.last.fm'
];

const isFileProtocol = () => location.protocol === 'file:';

function buildMBUserAgent(){
  let contact = '';
  try { const o = JSON.parse(localStorage.getItem(OWNER_KEY) || '{}'); contact = (o.email || o.contact || '').trim(); } catch(e){}
  if (!contact) contact = 'noreply@example.com';
  return `DiscografiaApp/${APP_VERSION} ( ${contact} )`;
}
let MB_USER_AGENT = buildMBUserAgent();

function isAlbumUrl(url, svcKey){
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase() + u.search.toLowerCase();
    switch(svcKey){
      case 'spotify':    return path.includes('/album/') && !path.includes('/track/') && !path.includes('/playlist/');
      case 'apple':      return path.includes('/album/');
      case 'youtube':    return path.includes('olak5uy') || path.includes('/browse/') || path.includes('/playlist');
      case 'discogs':    return path.includes('/release/') || path.includes('/master/');
      case 'lastfm':     return path.includes('/music/') || path.includes('/album/');
      default: return true;
    }
  } catch(e){ return false; }
}

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* v7.0.14-FIX: cdKey y parseCDKey movidos desde app-ui-1 para evitar dependencias frágiles de orden de carga */
const cdKey = (cat, cdOrNro) => {
  if (cdOrNro && typeof cdOrNro === "object" && cdOrNro.id) return `${cat}|${cdOrNro.id}`;
  const cd = Store.getCDs(cat).find(c => c.nro === cdOrNro);
  if (cd && cd.id) return `${cat}|${cd.id}`;
  return `${cat}|nro:${cdOrNro}`;
};
const parseCDKey = key => {
  const s = String(key || ""); const i = s.indexOf("|");
  if (i < 0) return { cat: s, id: "" };
  const cat = s.slice(0, i); const idPart = s.slice(i + 1);
  if (idPart.startsWith("nro:")){ const nro = parseInt(idPart.slice(4), 10); const cd = Store.getCDs(cat).find(c => c.nro === nro); return { cat, id: cd?.id || "" }; }
  return { cat, id: idPart };
};

function freeLocalStorageCaches(){
  const keysToDrop = [METACACHE_KEY, RESOLVED_LINKS_KEY, HISTORY_KEY, NOTFOUND_KEY];
  let freed = 0;
  for (const k of keysToDrop){
    try { const prev = localStorage.getItem(k); if (prev){ freed += prev.length; localStorage.removeItem(k); } } catch(e){}
  }
  try { if (typeof MetadataCache !== 'undefined' && MetadataCache.clear) MetadataCache.clear(); } catch(e){}
  try { if (typeof ResolvedLinks !== 'undefined' && ResolvedLinks.clear) ResolvedLinks.clear(); } catch(e){}
  try {
    const keep = new Set([STORAGE_KEY, DISCOGS_CONFIG_KEY, OWNER_KEY, 'discografia_legal_v1', 'discografia_theme_v1', 'discografia_folder_path_v1']);
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('discografia_') && !keep.has(k) && k !== STORAGE_KEY) toRemove.push(k);
    }
    for (const k of toRemove){
      try { const prev = localStorage.getItem(k); if (prev) freed += prev.length; localStorage.removeItem(k); } catch(e){}
    }
  } catch(e){}
  return freed;
}
function isQuotaError(e){
  return !!(e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message||''))));
}

/* v7.0.14-FIX: esc() ahora es defensivo contra no-strings */
const esc = s => {
  if (s === null || s === undefined) return '';
  const t = typeof s;
  if (t !== 'string' && t !== 'number' && t !== 'boolean') return '';
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
};
const norm = s => String(s ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const upper = v => (v === null || v === undefined) ? "" : String(v).toUpperCase();

const STREAMING_SERVICES = [
  { key:'spotify',   name:'Spotify',       icon:'🟢', pattern:/open\.spotify\.com/i,     color:'#1db954' },
  { key:'youtube',   name:'YouTube Music', icon:'🔴', pattern:/(music\.)?youtube\.com/i, color:'#ff0000' },
  { key:'apple',     name:'Apple Music',   icon:'🍎', pattern:/music\.apple\.com/i,      color:'#fa243c' },
  { key:'discogs',   name:'Discogs',       icon:'💿', pattern:/discogs\.com/i,           color:'#555555' },
  { key:'lastfm',    name:'Last.fm',       icon:'🎵', pattern:/last\.fm/i,               color:'#d51007' }
];

function isAnyModalOpen(){
  // v7.0.14-FIX: se agrega #lastfmConfigModal a la lista de modales
  const modals = ["#modal","#pasteModal","#catModal","#manualModal","#bulkEnrichModal","#notFoundModal","#discogsConfigModal","#ownerConfigModal","#bulkMoveModal","#viewModal","#folderConfigModal","#folderBrowserModal","#networkDiagModal","#autoBackupModal","#duplicatesModal","#customFieldsModal","#historyModal","#scannerModal","#loansModal","#exitModal","#albumConfirmModal","#legalModal","#lastfmConfigModal"];
  return modals.some(sel => $(sel)?.classList.contains("open")) || !!$("#coverLightbox")?.classList.contains("open");
}

function highlight(texto, q){
  const t = esc(texto);
  if (!q) return t;
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return t;
  const accented = {'a':'[aàáâäãå]','e':'[eèéêë]','i':'[iìíîï]','o':'[oòóôöõ]','u':'[uùúûü]','n':'[nñ]','c':'[cç]','y':'[yýÿ]'};
  const buildPattern = term => term.split('').map(ch => { const low = ch.toLowerCase(); if (accented[low]) return accented[low]; return ch.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }).join('');
  const pattern = terms.map(buildPattern).join("|");
  try { return t.replace(new RegExp(`(${pattern})`,"ig"), "<mark>$1</mark>"); } catch { return t; }
}
function debounce(fn, ms=160){ let t; const w = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; w.cancel = () => { clearTimeout(t); t = null; }; return w; }
function download(filename, content, mime="application/json"){
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
function timestamp(){ const d = new Date(), pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`; }
function findRowByKey(key){ if (!key) return null; return $$("#tbodyCD tr").find(tr => tr.dataset.key === key) || null; }

/* v7.0.14-FIX: fetchWithTimeout robusto para navegadores sin AbortController.abort(reason) */
function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT_MS){
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { controller.abort(); } catch(_){} }, timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal })
    .catch(err => {
      if (timedOut){
        const e = new Error(`Timeout after ${timeoutMs}ms`);
        e.name = 'TimeoutError';
        throw e;
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

const _lastCallBySource = { MusicBrainz: 0, Discogs: 0, 'Last.fm': 0 };
const _minDelayBySource = { MusicBrainz: 1000, Discogs: 1000, 'Last.fm': 250 };
async function throttleSource(source){
  const minMs = _minDelayBySource[source] ?? 500;
  const now = Date.now();
  const wait = Math.max(0, minMs - (now - (_lastCallBySource[source] || 0)));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastCallBySource[source] = Date.now();
}
let _mb503Until = 0, _discogs429Until = 0;

function stripParenthetical(s){
  return String(s||'').replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeYear(y){
  if (y === null || y === undefined || y === '') return null;
  const n = parseInt(String(y).slice(0, 4), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1900 || n > 2100) return null;
  return n;
}
function normMatch(s){ return String(s||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim(); }
function levenshtein(a, b){
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
function stripArticles(s){ return String(s||'').replace(/^(the|a|an|el|la|los|las|un|una)\s+/i,'').replace(/\s+(the|a|an|el|la|los|las|un|una)$/i,'').trim(); }
function similarity(a, b){
  const x = normMatch(stripArticles(a)), y = normMatch(stripArticles(b));
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const A = new Set(x.split(' ')), B = new Set(y.split(' '));
  const inter = [...A].filter(v => B.has(v)).length;
  const union = new Set([...A, ...B]).size;
  const j = union ? inter / union : 0;
  const lev = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  return Math.max(j, lev * 0.9);
}
function matchConfidence(t, i, cand){ return Math.round((similarity(t, cand.title) * 0.6 + similarity(i, cand.artist) * 0.4) * 100); }

function esSoloOrtografia(a, b){
  const A = String(a||'').trim(), B = String(b||'').trim();
  if (!A || !B) return false;
  const an = normMatch(A), bn = normMatch(B);
  if (an === bn) return true;
  const ap = normMatch(stripParenthetical(A));
  const bp = normMatch(stripParenthetical(B));
  if (ap && bp && ap === bp) return true;
  const sim = similarity(A, B);
  const lenDiff = Math.abs(A.length - B.length);
  if (sim >= 0.90 && lenDiff <= 3) return true;
  return false;
}

function corregirCampo(valorActual, valorAPI, confianza, replace, umbralMin = 85){
  const cur = String(valorActual || '').trim();
  const api = String(valorAPI  || '').trim();
  if (!api) return null;
  if (Number(confianza) < umbralMin) return null;
  if (cur === api) return null;
  if (!cur) return api;
  if (esSoloOrtografia(cur, api)) return api;
  if (replace) return api;
  return null;
}

function confidenceChip(conf){
  const n = Number(conf) || 0;
  const color = n >= 90 ? 'var(--ok)' : n >= 75 ? 'var(--accent2)' : 'var(--warn)';
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:.68rem;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}55">● ${n}%</span>`;
}

function limpiarTituloParaBusqueda(titulo){
  let t = String(titulo || '').trim();
  if (!t) return '';
  t = t.replace(/[*#]+/g, ' ');
  t = t.replace(/\.{2,}/g, ' ');
  const parts = t.split(/\s*\/\s*/);
  if (parts.length === 2 && normMatch(parts[0]) === normMatch(parts[1])) t = parts[0];
  t = t.replace(/\s*\(\s*(en\s+vivo|live)\s*\)\s*$/i, '').trim();
  t = t.replace(/\s+(CD|VOL|VOLUMEN|PARTE|DISC|DISCO)\s*#?\s*\d+\s*$/i, '').trim();
  t = t.replace(/\s+GIRA\s+/i, ' ').trim();
  t = t.replace(/\s+([AB])\s*$/i, (m) => {
    const sinLado = t.replace(/\s+([AB])\s*$/i, '').trim();
    return sinLado.length >= 5 ? '' : m;
  }).trim();
  return t.replace(/\s+/g, ' ').trim();
}

const TYPOS_INTERPRETES = {
  'soda estereo': 'Soda Stereo','soda estéreo': 'Soda Stereo','the beatle': 'The Beatles',
  'beatle': 'The Beatles','rolling stone': 'The Rolling Stones','led zeppelin': 'Led Zeppelin',
  'pink floid': 'Pink Floyd','ac dc': 'AC/DC','acdc': 'AC/DC','guns and roses': "Guns N' Roses",
  'gun n roses': "Guns N' Roses",'black sabath': 'Black Sabbath','charly garcia': 'Charly García',
  'charly garcía': 'Charly García','luis alberto spinetta': 'Luis Alberto Spinetta',
  'spinetta jade': 'Spinetta Jade','seru giran': 'Serú Girán','seru girá': 'Serú Girán',
  'fito paez': 'Fito Páez','fito páez': 'Fito Páez','enanos verdes': 'Enanitos Verdes',
  'los enanitos verdes': 'Enanitos Verdes','los fabulosos cadillacs': 'Los Fabulosos Cadillacs',
  'patricio rey': 'Patricio Rey y sus Redonditos de Ricota',
  'redonditos de ricota': 'Patricio Rey y sus Redonditos de Ricota'
};
function limpiarInterpreteParaBusqueda(interprete){
  let i = String(interprete || '').trim();
  if (!i) return '';
  i = i.replace(/[*#]+/g, ' ').trim();
  i = i.replace(/\s+/g, ' ').trim();
  const key = normMatch(i);
  if (TYPOS_INTERPRETES[key]) i = TYPOS_INTERPRETES[key];
  return i;
}

const ThemeManager = (() => {
  function load(){ try { const s = localStorage.getItem(THEME_KEY); if (s === 'light' || s === 'dark') return s; return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch(e){ return 'dark'; } }
  function apply(theme){
    document.body.classList.toggle('theme-light', theme === 'light');
    const btn = $('#themeToggle'); if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  function toggle(){
    const current = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch(e){}
    apply(next);
    Toast.show(next === 'light' ? '☀️ Tema claro' : '🌙 Tema oscuro', 'info', 1800);
  }
  function init(){ apply(load()); }
  return { init, toggle, apply };
})();

const FileSystemDefault = (() => {
  const DB_NAME = 'discografia_fs_v1', STORE = 'handles', HANDLE_KEY = 'defaultDir';
  const LS_PATH_KEY = 'discografia_folder_path_v1';
  let dirHandle = null;
  let folderPath = null;
  let mode = 'browser';

  function detectMode(){
    try {
      if (window.__DISCO_FS__ && typeof window.__DISCO_FS__.isAvailable === 'function' && window.__DISCO_FS__.isAvailable()) return 'tauri';
    } catch(e){}
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'showSaveFilePicker' in window) return 'browser';
    return 'unsupported';
  }
  function openDB(){ return new Promise((res, rej) => { const req = indexedDB.open(DB_NAME, 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); }; req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
  /* v7.0.14-FIX: cerrar la DB después de cada transacción para evitar bloqueos */
  async function idbPut(k, v){ const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(v, k); tx.oncomplete = () => { try { db.close(); } catch(_){} res(); }; tx.onerror = () => { try { db.close(); } catch(_){} rej(tx.error); }; }); }
  async function idbGet(k){ const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(k); r.onsuccess = () => { try { db.close(); } catch(_){} res(r.result); }; r.onerror = () => { try { db.close(); } catch(_){} rej(r.error); }; }); }
  async function idbDel(k){ const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(k); tx.oncomplete = () => { try { db.close(); } catch(_){} res(); }; tx.onerror = () => { try { db.close(); } catch(_){} rej(tx.error); }; }); }
  async function ensurePermission(h, m = 'readwrite'){
    if (!h) return false;
    try {
      const o = { mode: m };
      if ((await h.queryPermission(o)) === 'granted') return true;
      if ((await h.requestPermission(o)) === 'granted') return true;
    } catch(e){ return false; }
    return false;
  }
  async function load(){
    mode = detectMode();
    if (mode === 'tauri'){ try { folderPath = localStorage.getItem(LS_PATH_KEY) || null; } catch(e){ folderPath = null; } return; }
    if (mode === 'browser'){ try { const h = await idbGet(HANDLE_KEY); if (h) dirHandle = h; } catch(e){ console.warn('FS load:', e); } }
  }
  async function pickFolder(){
    if (mode === 'tauri'){ const p = await window.__DISCO_FS__.pickFolder(); if (!p) throw new Error('Sin selección'); folderPath = String(p); try { localStorage.setItem(LS_PATH_KEY, folderPath); } catch(e){} return { name: folderPath.split(/[\\/]/).filter(Boolean).pop() || folderPath }; }
    if (mode === 'browser'){ const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'discografia-default', startIn: 'documents' }); if (!(await ensurePermission(h, 'readwrite'))) throw new Error('Permiso denegado'); dirHandle = h; await idbPut(HANDLE_KEY, h); return h; }
    throw new Error('Navegador sin soporte');
  }
  async function clear(){
    if (mode === 'tauri'){ folderPath = null; try { localStorage.removeItem(LS_PATH_KEY); } catch(e){} return; }
    dirHandle = null;
    try { await idbDel(HANDLE_KEY); } catch(e){}
  }
  const getHandle = () => dirHandle;
  const getName = () => {
    if (mode === 'tauri') return folderPath ? (folderPath.split(/[\\/]/).filter(Boolean).pop() || folderPath) : null;
    return dirHandle?.name || null;
  };
  const isSet = () => (mode === 'tauri') ? !!folderPath : !!dirHandle;
  const isSupported = () => mode !== 'unsupported';
  const getMode = () => mode;
  async function ensureReady(m = 'readwrite'){
    if (mode === 'tauri') return !!folderPath;
    if (mode === 'browser'){ if (!dirHandle) return false; return await ensurePermission(dirHandle, m); }
    return false;
  }
  function joinPath(dir, name){
    if (!dir) return name;
    const sep = dir.indexOf('\\') !== -1 ? '\\' : '/';
    const clean = String(dir).replace(/[\\/]+$/, '');
    return clean + sep + name;
  }
  async function saveFile(name, content, mime = 'application/json'){
    if (mode === 'tauri'){ if (!folderPath) throw new Error('Sin carpeta'); const full = joinPath(folderPath, name); await window.__DISCO_FS__.save(full, content); return true; }
    if (mode === 'browser'){ if (!dirHandle) throw new Error('Sin carpeta'); if (!(await ensureReady('readwrite'))) throw new Error('Permiso denegado'); const fh = await dirHandle.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(new Blob([content], { type: mime + ';charset=utf-8' })); await w.close(); return true; }
    throw new Error('Navegador sin soporte');
  }
  async function listFiles(){
    if (mode === 'tauri'){ if (!folderPath) return []; const items = await window.__DISCO_FS__.list(folderPath); return (items || []).filter(it => it.isFile).map(it => ({ name: it.name, size: it.size || 0, modifiedTime: it.modifiedTime || 0, handle: null })).sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0)); }
    if (mode === 'browser'){ if (!dirHandle) return []; if (!(await ensureReady('read'))) return []; const out = []; for await (const [name, h] of dirHandle.entries()){ if (h.kind === 'file'){ try { const f = await h.getFile(); out.push({ name, size: f.size, modifiedTime: f.lastModified, handle: h }); } catch(e){} } } return out.sort((a, b) => b.modifiedTime - a.modifiedTime); }
    return [];
  }
  async function readFile(name){
    if (mode === 'tauri'){ if (!folderPath) throw new Error('Sin carpeta'); const full = joinPath(folderPath, name); return await window.__DISCO_FS__.read(full); }
    if (mode === 'browser'){ if (!dirHandle) throw new Error('Sin carpeta'); if (!(await ensureReady('read'))) throw new Error('Permiso denegado'); const fh = await dirHandle.getFileHandle(name); const f = await fh.getFile(); return await f.text(); }
    throw new Error('Navegador sin soporte');
  }
  async function deleteFile(name){
    if (mode === 'tauri'){ if (!folderPath) throw new Error('Sin carpeta'); const full = joinPath(folderPath, name); await window.__DISCO_FS__.del(full); return true; }
    if (mode === 'browser'){ if (!dirHandle) throw new Error('Sin carpeta'); if (!(await ensureReady('readwrite'))) throw new Error('Permiso denegado'); await dirHandle.removeEntry(name); return true; }
    throw new Error('Navegador sin soporte');
  }
  function refreshBadge(){
    const b = $("#folderBadge"); if (!b) return;
    const n = getName();
    if (n){ b.textContent = '· ' + n; b.style.display = 'inline'; b.style.cssText = 'display:inline-block;background:rgba(79,195,247,.25);color:var(--accent);border-radius:10px;padding:1px 7px;font-size:.62rem;font-weight:700;margin-left:6px'; }
    else { b.textContent = ''; b.style.display = 'none'; }
  }
  return { load, isSupported, isSet, getName, getHandle, pickFolder, clear, ensureReady, saveFile, listFiles, readFile, deleteFile, refreshBadge, getMode };
})();

async function saveOrDownload(filename, content, mimeType = "application/json"){
  if (FileSystemDefault.isSet() && FileSystemDefault.isSupported()){
    try { await FileSystemDefault.saveFile(filename, content, mimeType); Toast.show(`💾 Guardado en "${FileSystemDefault.getName()}"`, "ok", 3500); return true; }
    catch(err){ Toast.show(`No se pudo escribir: ${err.message}. Descargando…`, "warn", 5500); }
  }
  download(filename, content, mimeType);
  Toast.show("📥 Archivo descargado", "ok", 2800);
  return true;
}

const OwnerConfig = (() => {
  let data = { name: "", contact: "", email: "" };
  function load(){ try { const r = localStorage.getItem(OWNER_KEY); if (r) data = Object.assign(data, JSON.parse(r) || {}); } catch(e){} }
  function persist(){ try { localStorage.setItem(OWNER_KEY, JSON.stringify(data)); } catch(e){} }
  const get = () => ({ ...data });
  function set(d){ data = { name: String(d.name||'').trim(), contact: String(d.contact||'').trim(), email: String(d.email||'').trim() }; persist(); MB_USER_AGENT = buildMBUserAgent(); render(); }
  function clear(){ data = { name:'', contact:'', email:'' }; localStorage.removeItem(OWNER_KEY); MB_USER_AGENT = buildMBUserAgent(); render(); }
  const displayName = () => data.name || DEFAULT_AUTHOR;
  function contactLine(){ const p = []; if (data.contact) p.push(data.contact); if (data.email) p.push(data.email); return p.join(' · '); }
  function render(){
    const dc = contactLine() || DEFAULT_PHONE;
    const fl = $("#footerAuthorLine"); if (fl) fl.innerHTML = `<b>Autor:</b> ${esc(displayName())} <span class="sep">|</span><b>Tel:</b> ${esc(dc)} <span class="sep">|</span><span class="copy"><span class="footer-version">Discografía v${APP_VERSION}</span> · ${esc(COPYRIGHT_TEXT)}</span>`;
    const pl = $("#printOwnerLine"); if (pl) pl.innerHTML = `Lista generada el <span id="printDate">—</span> · ${esc(displayName())} · ${esc(dc)}`;
    const pf = $("#printFooterLine"); if (pf) pf.textContent = `Discografía v${APP_VERSION} — ${displayName()} — ${dc} — ${COPYRIGHT_TEXT}`;
    const mi = $("#manualOwnerInfo"); if (mi) mi.innerHTML = `<b>${esc(displayName())}</b><br>📞 ${esc(dc)}<br>${esc(COPYRIGHT_TEXT)}`;
  }
  return { load, persist, get, set, clear, render, displayName, contactLine };
})();

const MetadataCache = (() => {
  let cache = {};
  function load(){ try { const r = localStorage.getItem(METACACHE_KEY); if (r){ const p = JSON.parse(r); if (p && typeof p === 'object') cache = p; } } catch(e){ cache = {}; } }
  function persist(){ try { localStorage.setItem(METACACHE_KEY, JSON.stringify(cache)); } catch(e){} }
  const key = (t, i, y) => norm(`${i||''}|${t||''}|${y||''}`).replace(/\s+/g,' ').trim();
  /* v7.0.14-NOTA: el caché exige que exista portada para reusar datos.
     Si querés permitir cachear sin portada, cambiá el `if (!e.data || !e.data.portada) return null;`
     por un simple `if (!e.data) return null;`. Se deja como está por decisión de diseño. */
  function get(t, i, y){ const k = key(t, i, y); const e = cache[k]; if (!e) return null; if (Date.now() - (e.ts||0) > CACHE_TTL_MS){ delete cache[k]; return null; } return e.data; }
  function set(t, i, y, d){ if (!d) return; const c = Number(d.confidence||0); if (c < CACHE_MIN_CONFIDENCE) return; cache[key(t,i,y)] = { ts: Date.now(), data: d }; persist(); }
  function clear(){ cache = {}; try { localStorage.removeItem(METACACHE_KEY); } catch(e){} }
  return { load, persist, get, set, clear };
})();

const Toast = (() => {
  const container = $("#toasts");
  const icons = { ok:'✓', err:'✕', warn:'⚠', info:'ℹ' };
  return {
    show(msg, type="ok", ms=3200, action=null){
      const el = document.createElement("div");
      el.className = "toast " + type;
      el.innerHTML = `<div class="toast-icon">${icons[type]||icons.info}</div><div class="toast-content">${esc(msg)}</div>`;
      if (action){ const b = document.createElement("button"); b.type = "button"; b.textContent = action.label; b.onclick = () => { action.fn(); el.remove(); }; el.appendChild(b); }
      container.appendChild(el);
      setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 220); }, ms);
    }
  };
})();

const CustomFields = (() => {
  let fields = [];
  function load(){ try { const r = localStorage.getItem(CUSTOMFIELDS_KEY); if (r) fields = JSON.parse(r) || []; } catch(e){ fields = []; } }
  function persist(){ try { localStorage.setItem(CUSTOMFIELDS_KEY, JSON.stringify(fields)); } catch(e){} }
  const getAll = () => [...fields];
  function add({ name, type, options }){
    if (!name || !name.trim()) return false;
    const clean = name.trim().slice(0, 40);
    if (fields.some(f => f.name.toLowerCase() === clean.toLowerCase())){ Toast.show('Ya existe un campo con ese nombre', 'warn'); return false; }
    fields.push({ id: 'cf_' + Date.now().toString(36), name: clean, type: type || 'text', options: options ? options.split(',').map(o => o.trim()).filter(Boolean) : [] });
    persist(); return true;
  }
  function remove(id){ fields = fields.filter(f => f.id !== id); persist(); }
  function render(){
    const list = $('#cfList'); if (!list) return;
    if (!fields.length){ list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.82rem">Sin campos personalizados</div>'; return; }
    list.innerHTML = fields.map(f => `<div class="cf-item"><div class="cf-name">${esc(f.name)}</div><div class="cf-type">${esc(f.type)}</div><button type="button" data-cf-del="${esc(f.id)}" title="Eliminar">🗑️</button></div>`).join('');
    list.querySelectorAll('[data-cf-del]').forEach(btn => {
      btn.addEventListener('click', () => { if (!confirm('¿Eliminar este campo?')) return; remove(btn.dataset.cfDel); render(); Toast.show('Campo eliminado','warn'); });
    });
  }
  function renderInModal(values = {}){
    const host = $('#customFieldsHost'); if (!host) return;
    if (!fields.length){ host.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.82rem">No hay campos personalizados definidos.</div>'; return; }
    host.innerHTML = fields.map(f => {
      const val = values[f.id] ?? '';
      let input;
      if (f.type === 'number') input = `<input type="number" data-cf-input="${esc(f.id)}" value="${esc(val)}" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;color:var(--txt);font-size:.9rem">`;
      else if (f.type === 'date') input = `<input type="date" data-cf-input="${esc(f.id)}" value="${esc(val)}" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;color:var(--txt);font-size:.9rem">`;
      else if (f.type === 'boolean') input = `<select data-cf-input="${esc(f.id)}" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;color:var(--txt);font-size:.9rem"><option value="">—</option><option value="true"${val==='true'?' selected':''}>Sí</option><option value="false"${val==='false'?' selected':''}>No</option></select>`;
      else if (f.type === 'select') input = `<select data-cf-input="${esc(f.id)}" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;color:var(--txt);font-size:.9rem"><option value="">—</option>${f.options.map(o => `<option value="${esc(o)}"${val===o?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
      else input = `<input type="text" data-cf-input="${esc(f.id)}" data-uppercase value="${esc(val)}" style="width:100%;padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;color:var(--txt);font-size:.9rem">`;
      return `<div class="field"><label>${esc(f.name)} <span style="font-size:.6rem;color:var(--muted)">(${esc(f.type)})</span></label>${input}</div>`;
    }).join('');
  }
  function readFromModal(){
    const out = {};
    $$('#customFieldsHost [data-cf-input]').forEach(el => { const v = el.value.trim(); if (v !== '') out[el.dataset.cfInput] = v; });
    return out;
  }
  return { load, persist, getAll, add, remove, render, renderInModal, readFromModal };
})();

/* v7.0.14-FIX: HistoryLog con batch para evitar escribir en cada log */
const HistoryLog = (() => {
  const MAX = 200;
  let items = [];
  let _persistTimer = null;
  function load(){ try { const r = localStorage.getItem(HISTORY_KEY); if (r) items = JSON.parse(r) || []; } catch(e){ items = []; } }
  function _flush(){ _persistTimer = null; try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(-MAX))); } catch(e){} }
  function persist(){ if (_persistTimer) return; _persistTimer = setTimeout(_flush, 500); }
  function persistNow(){ if (_persistTimer){ clearTimeout(_persistTimer); _persistTimer = null; } _flush(); }
  function log(cat, title, detail){
    items.push({ id: 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6), cat: cat||'INFO', title: String(title||'').slice(0,120), detail: String(detail||'').slice(0,200), ts: new Date().toISOString() });
    if (items.length > MAX) items = items.slice(-MAX);
    persist();
  }
  const getAll = () => [...items].reverse();
  function clear(){ items = []; persistNow(); }
  function filtered(cat, search){
    let out = getAll();
    if (cat) out = out.filter(i => i.cat === cat);
    if (search){ const s = norm(search); out = out.filter(i => norm(i.title + ' ' + i.detail).includes(s)); }
    return out;
  }
  function render(){
    const list = $('#histList'); if (!list) return;
    const cat = $('#histFilter')?.value || '';
    const search = $('#histSearch')?.value || '';
    const fi = filtered(cat, search);
    if (!fi.length){ list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted);font-style:italic">Sin actividad registrada</div>'; return; }
    const icons = { CREATE:'➕', EDIT:'✏️', DELETE:'🗑️', IMPORT:'📥', ENRICH:'✨', LOAN:'📚', EXPORT:'📄', INFO:'ℹ️' };
    list.innerHTML = fi.map(i => `<div class="history-item cat-${esc(i.cat)}"><span class="hi-icon">${icons[i.cat]||'📌'}</span><div class="hi-text"><div class="hi-title">${esc(i.title)}</div>${i.detail ? `<div class="hi-detail">${esc(i.detail)}</div>` : ''}</div><div class="hi-time">${new Date(i.ts).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}</div></div>`).join('');
  }
  function exportCSV(){
    const all = getAll();
    if (!all.length){ Toast.show('Historial vacío','warn'); return; }
    const sep = ';';
    const e = v => { const s = String(v??''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [['Fecha','Categoría','Acción','Detalle'].join(sep)];
    for (const i of all) rows.push([i.ts, i.cat, i.title, i.detail].map(e).join(sep));
    saveOrDownload(`discografia_historial_${timestamp()}.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv');
  }
  window.addEventListener('beforeunload', persistNow);
  return { load, persist, persistNow, log, getAll, clear, filtered, render, exportCSV };
})();

const Store = (() => {
  let db = null;
  let _allCDsCache = null;
  /* v7.0.14-FIX: cache de categoría por CD para evitar O(n²) en render */
  let _cdCatCache = null;
  function invalidateCache(){ _allCDsCache = null; _cdCatCache = null; }
  function _buildCdCatCache(){
    _cdCatCache = new Map();
    for (const k of Object.keys(db.categories)){
      for (const cd of db.categories[k].cds){
        if (cd && cd.id) _cdCatCache.set(cd.id, k);
      }
    }
  }
  function findCatOfCD(cd){
    if (!cd || !cd.id || !db) return null;
    if (!_cdCatCache) _buildCdCatCache();
    return _cdCatCache.get(cd.id) || null;
  }
  function buildEmpty(){ return { version: 5, updated: null, seeded: true, categories: {}, prefs: { enrich: true, autoBackup: true, replaceOnEnrich: true } }; }
  function slugify(str){ return String(str||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,32) || "cat_" + Date.now().toString(36); }
  function uniqueKey(base, cats){ let k = base, i = 2; while (cats[k]) k = base + "_" + (i++); return k; }
  function sanitizeProvenance(p){
    if (!p || typeof p !== 'object') return {};
    const out = {};
    for (const k in p){
      const v = p[k]; if (!v || typeof v !== 'object') continue;
      out[k] = { source: v.source ? String(v.source) : null, confidence: (typeof v.confidence === 'number' && Number.isFinite(v.confidence)) ? v.confidence : null, date: v.date || null };
    }
    return out;
  }
  function genSubId(){ return 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
  function sanitizeSubcategories(arr){
    if (!Array.isArray(arr)) return [];
    return arr.map(s => ({ id: s.id || genSubId(), label: String(s.label || 'Sin nombre'), icon: String(s.icon || '📂') }));
  }
  function hydrate(cd){
    return {
      id: cd.id || (crypto.randomUUID ? crypto.randomUUID() : "cd_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2)),
      nro: cd.nro ?? 0,
      titulo: upper(cd.titulo),
      interprete: upper(cd.interprete),
      anio: cd.anio ?? null,
      anioEdicion: cd.anioEdicion ?? null,
      formato: cd.formato ?? "CD", estado: cd.estado ?? "Excelente",
      estadoDisco: cd.estadoDisco ?? "", estadoCaja: cd.estadoCaja ?? "",
      estadoFolleto: cd.estadoFolleto ?? "", estadoArte: cd.estadoArte ?? "",
      sello: upper(cd.sello), genero: upper(cd.genero), catalogo: upper(cd.catalogo),
      codigo: cd.codigo ?? "", isrc: (cd.isrc ?? "").toString().toUpperCase(), edicion: upper(cd.edicion), pais: upper(cd.pais),
      ubicacion: upper(cd.ubicacion), cantidad: cd.cantidad ?? 1,
      adquisicion: cd.adquisicion ?? "", valor: cd.valor ?? null, moneda: cd.moneda ?? "ARS",
      notas: cd.notas ?? "",
      mbId: cd.mbId ?? null, discogsId: cd.discogsId ?? null,
      portada: cd.portada ?? null, portadaSource: cd.portadaSource ?? null,
      enrichmentSource: cd.enrichmentSource ?? null, enrichmentConfidence: cd.enrichmentConfidence ?? null, enrichedAt: cd.enrichedAt ?? null,
      provenance: sanitizeProvenance(cd.provenance),
      prestadoA: upper(cd.prestadoA), fechaPrestamo: cd.fechaPrestamo ?? "",
      fechaDevolucion: cd.fechaDevolucion ?? "", notasPrestamo: upper(cd.notasPrestamo),
      customFields: (cd.customFields && typeof cd.customFields === 'object') ? { ...cd.customFields } : {},
      links: (cd.links && typeof cd.links === 'object' && !Array.isArray(cd.links)) ? { ...cd.links } : {},
      subcat: cd.subcat ?? null
    };
  }
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){
        const p = JSON.parse(raw);
        if (p && p.categories && typeof p.categories === 'object'){
          const clean = {};
          for (const k in p.categories){
            const c = p.categories[k] || {};
            clean[k] = { label: c.label || k, icon: c.icon || "📀", subcategories: sanitizeSubcategories(c.subcategories), cds: Array.isArray(c.cds) ? c.cds.map(hydrate) : [] };
          }
          db = { version: 5, updated: p.updated || null, seeded: p.seeded === true, categories: clean, prefs: Object.assign({ enrich: true, autoBackup: true, replaceOnEnrich: true }, p.prefs || {}) };
          invalidateCache();
          return;
        }
      }
    } catch(e){ console.warn("localStorage:", e); }
    db = buildEmpty();
    invalidateCache();
  }
  function persist(){
    try { db.updated = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); invalidateCache(); updateModifiedLabel(); }
    catch(e){
      if (isQuotaError(e)){
        freeLocalStorageCaches();
        try { db.updated = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); invalidateCache(); updateModifiedLabel(); Toast.show("⚠️ Storage lleno: se liberaron cachés y se reintentó guardar.", "warn", 8000); return; }
        catch(e2){ Toast.show("⚠️ Almacenamiento lleno. Exportá un backup YA (Ctrl+S) y vaciá caché en ⚙️.", "err", 12000); }
      } else Toast.show("No se pudo guardar: " + e.message, "err", 7000);
    }
  }
  const persistSilent = persist;
  function updateModifiedLabel(){
    const el = $("#fModified"); if (!el) return;
    if (db.updated){ const d = new Date(db.updated); el.innerHTML = `· 💾 ${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`; el.style.color = "var(--ok)"; }
    else { el.textContent = "· Sin cambios"; el.style.color = "var(--muted)"; }
  }
  function allCDs(){ if (!_allCDsCache) _allCDsCache = Object.values(db.categories).flatMap(c => c.cds); return _allCDsCache; }
  const total = () => allCDs().length;
  const get = cat => db.categories[cat];
  const getCDs = cat => db.categories[cat]?.cds || [];
  const categories = () => db.categories;
  const catKeys = () => Object.keys(db.categories);
  function resetAll(){ localStorage.removeItem(STORAGE_KEY); db = buildEmpty(); invalidateCache(); persist(); try { localStorage.removeItem(NOTFOUND_KEY); } catch(e){} if (typeof NotFoundList !== "undefined") NotFoundList.clear(); }
  function replaceAll(nd){
    db = { version: 5, updated: new Date().toISOString(), seeded: true, categories: {}, prefs: db?.prefs || { enrich: true, autoBackup: true, replaceOnEnrich: true } };
    const src = nd?.categories || {};
    for (const k in src){
      const c = src[k] || {};
      db.categories[k] = { label: c.label || k, icon: c.icon || "📀", subcategories: sanitizeSubcategories(c.subcategories), cds: Array.isArray(c.cds) ? c.cds.map(hydrate) : [] };
    }
    invalidateCache(); persist();
  }
  function addCategory({ label, icon } = {}){
    const key = uniqueKey(slugify(label), db.categories);
    db.categories[key] = { label: label || "Nueva categoría", icon: icon || "📀", subcategories: [], cds: [] };
    persist(); return key;
  }
  function updateCategory(key, { label, icon } = {}){
    if (!db.categories[key]) return false;
    if (label !== undefined) db.categories[key].label = label;
    if (icon !== undefined) db.categories[key].icon = icon;
    persist(); return true;
  }
  function deleteCategory(key){ if (!db.categories[key]) return false; delete db.categories[key]; persist(); return true; }
  function addSubcategory(catKey, { label, icon } = {}){
    const cat = db.categories[catKey];
    if (!cat) return null;
    if (!Array.isArray(cat.subcategories)) cat.subcategories = [];
    const id = genSubId();
    cat.subcategories.push({ id, label: String(label || 'Subcategoría'), icon: icon || '📂' });
    persist();
    return id;
  }
  function updateSubcategory(catKey, subId, { label, icon } = {}){
    const cat = db.categories[catKey];
    if (!cat || !Array.isArray(cat.subcategories)) return false;
    const sub = cat.subcategories.find(s => s.id === subId);
    if (!sub) return false;
    if (label !== undefined) sub.label = label;
    if (icon !== undefined) sub.icon = icon;
    persist();
    return true;
  }
  function deleteSubcategory(catKey, subId){
    const cat = db.categories[catKey];
    if (!cat || !Array.isArray(cat.subcategories)) return false;
    const idx = cat.subcategories.findIndex(s => s.id === subId);
    if (idx === -1) return false;
    cat.subcategories.splice(idx, 1);
    for (const cd of cat.cds){ if (cd.subcat === subId) cd.subcat = null; }
    persist();
    return true;
  }
  function moveSubcategory(catKey, subId, dir){
    const cat = db.categories[catKey];
    if (!cat || !Array.isArray(cat.subcategories)) return false;
    const i = cat.subcategories.findIndex(s => s.id === subId);
    if (i === -1) return false;
    const j = dir === 'left' ? i - 1 : i + 1;
    if (j < 0 || j >= cat.subcategories.length) return false;
    [cat.subcategories[i], cat.subcategories[j]] = [cat.subcategories[j], cat.subcategories[i]];
    persist();
    return true;
  }
  function getSubcategories(catKey){
    const cat = db.categories[catKey];
    return (cat && Array.isArray(cat.subcategories)) ? cat.subcategories.map(s => ({ ...s })) : [];
  }
  function getSubcategory(catKey, subId){
    const cat = db.categories[catKey];
    if (!cat || !Array.isArray(cat.subcategories)) return null;
    const s = cat.subcategories.find(x => x.id === subId);
    return s ? { ...s } : null;
  }
  function renameCategoryKey(oldKey, newLabel){
    if (!db.categories[oldKey]) return null;
    const nk = uniqueKey(slugify(newLabel), db.categories);
    const rebuilt = {};
    for (const k in db.categories){ if (k === oldKey) rebuilt[nk] = db.categories[oldKey]; else rebuilt[k] = db.categories[k]; }
    db.categories = rebuilt; db.categories[nk].label = newLabel; persist(); return nk;
  }
  function moveCategory(key, dir){
    const keys = catKeys(); const i = keys.indexOf(key); if (i === -1) return false;
    const j = dir === 'left' ? i - 1 : i + 1;
    if (j < 0 || j >= keys.length) return false;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    const rebuilt = {}; for (const k of keys) rebuilt[k] = db.categories[k];
    db.categories = rebuilt; persist(); return true;
  }
  const getPref = (k, d) => db.prefs?.[k] ?? d;
  function setPref(k, v){ db.prefs = db.prefs || {}; db.prefs[k] = v; persist(); }
  return { load, persist, persistSilent, resetAll, replaceAll, allCDs, total, get, getCDs, categories, catKeys, addCategory, updateCategory, deleteCategory, renameCategoryKey, moveCategory, hydrate, buildEmpty, slugify, uniqueKey, getPref, setPref, addSubcategory, updateSubcategory, deleteSubcategory, moveSubcategory, getSubcategories, getSubcategory, findCatOfCD, get isEmpty(){ return total() === 0 && catKeys().length === 0; } };
})();

const NotFoundList = (() => {
  let items = [];
  function load(){ try { const r = localStorage.getItem(NOTFOUND_KEY); if (r){ const p = JSON.parse(r); if (Array.isArray(p)) items = p; } } catch(e){} updateBadge(); }
  function persist(){ try { localStorage.setItem(NOTFOUND_KEY, JSON.stringify(items)); } catch(e){} updateBadge(); }
  function add(cd){ const i = items.findIndex(x => x.catKey === cd.catKey && x.nro === cd.nro); if (i === -1) items.push({ ...cd, ts: new Date().toISOString() }); else items[i] = { ...items[i], ...cd, ts: new Date().toISOString() }; }
  function remove(catKey, nro){ const before = items.length; items = items.filter(x => !(x.catKey === catKey && x.nro === nro)); return items.length < before; }
  function clear(){ items = []; persist(); }
  const getAll = () => [...items];
  const count = () => items.length;
  function updateBadge(){ const b = $("#notFoundBadge"); const btn = $("#btnNotFound"); if (b) b.textContent = items.length; if (btn) btn.style.display = items.length > 0 ? "" : "none"; }
  return { load, persist, add, remove, clear, getAll, count, updateBadge };
})();

const AutoBackup = (() => {
  let changeCount = 0, pendingTimer = null, lastReason = "";
  const DEBOUNCE_MS = 4000, RE_ASK_MS = 120000;
  const getEnabled = () => { try { return Store.getPref("autoBackup", true); } catch(e){ return true; } };
  function setEnabled(v){ try { Store.setPref("autoBackup", !!v); } catch(e){} if (!v){ changeCount = 0; if (pendingTimer){ clearTimeout(pendingTimer); pendingTimer = null; } } updateBadge(); syncToggle(); }
  function syncToggle(){ const cb = $("#autoBackupToggle"); if (cb) cb.checked = getEnabled(); }
  function updateBadge(){ const b = $("#autobackupBadge"); if (!b) return; if (changeCount > 0 && getEnabled()){ b.textContent = changeCount; b.style.display = ""; } else b.style.display = "none"; }
  function markChange(reason){
    lastReason = reason || ''; changeCount++; updateBadge();
    if (!getEnabled()) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (changeCount <= 0) return;
      if (isAnyModalOpen()){ pendingTimer = setTimeout(() => { pendingTimer = null; if (changeCount > 0 && getEnabled() && !isAnyModalOpen()) askBackup(); }, 10000); return; }
      askBackup();
    }, DEBOUNCE_MS);
  }
  function askBackup(){
    $("#autoBackupCount").textContent = changeCount + " cambio" + (changeCount === 1 ? "" : "s");
    $("#autoBackupReason").textContent = lastReason || "modificación";
    $("#autoBackupModal").classList.add("open");
  }
  function doBackup(){
    $("#autoBackupModal").classList.remove("open");
    const dis = $("#autoBackupDisableAfter")?.checked;
    changeCount = 0; updateBadge();
    Promise.resolve(exportFullJSON()).catch(err => Toast.show("Error backup: " + (err?.message || err), "err", 6000));
    if (dis){ $("#autoBackupDisableAfter").checked = false; setEnabled(false); Toast.show("Backup automático desactivado.","warn"); }
  }
  function later(){
    $("#autoBackupModal").classList.remove("open");
    const dis = $("#autoBackupDisableAfter")?.checked;
    if (dis){ $("#autoBackupDisableAfter").checked = false; setEnabled(false); Toast.show("Backup automático desactivado","warn",4000); return; }
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { pendingTimer = null; if (changeCount > 0 && getEnabled() && !isAnyModalOpen()) askBackup(); }, RE_ASK_MS);
  }
  function reset(){ changeCount = 0; updateBadge(); }
  const hasPending = () => changeCount > 0 && getEnabled();
  return { markChange, askBackup, doBackup, later, getEnabled, setEnabled, updateBadge, syncToggle, reset, hasPending };
})();

const Undo = (() => {
  const stack = [];
  function updateBadge(){
    const b = $("#btnUndo"); if (!b) return;
    if (stack.length > 0){ b.classList.add("active"); b.title = `Deshacer: ${stack[stack.length-1].label} (Ctrl+Z) — ${stack.length} operación(es)`; }
    else { b.classList.remove("active"); b.title = "Nada que deshacer"; }
  }
  return {
    push(label, restore){ if (typeof restore !== "function") return; stack.push({ label, restore }); if (stack.length > UNDO_LIMIT) stack.shift(); updateBadge(); },
    pop(){ const op = stack.pop(); updateBadge(); if (!op){ Toast.show("Nada que deshacer","warn",1800); return; } op.restore(); Toast.show("Deshecho: " + op.label,"ok",2200); },
    clear(){ stack.length = 0; updateBadge(); },
    updateBadge
  };
})();

const Duplicates = (() => {
  function find(threshold = 0.92){
    const groups = [];
    const all = Store.allCDs().map(cd => {
      let cat = Store.findCatOfCD(cd);
      return { cd, cat };
    });
    const visited = new Set();
    for (let i = 0; i < all.length; i++){
      if (visited.has(i)) continue;
      const group = [all[i]]; visited.add(i);
      for (let j = i + 1; j < all.length; j++){
        if (visited.has(j)) continue;
        const a = all[i].cd, b = all[j].cd;
        const sT = similarity(a.titulo, b.titulo);
        const sA = similarity(a.interprete, b.interprete);
        const score = sT * 0.55 + sA * 0.35 + (a.anio && b.anio && a.anio === b.anio ? 0.10 : 0);
        if (score >= threshold){ group.push(all[j]); visited.add(j); }
      }
      if (group.length > 1) groups.push(group);
    }
    return groups;
  }
  function render(){
    const groups = find(0.92);
    const summary = $('#dupSummary'), list = $('#dupList');
    if (!summary || !list) return;
    if (!groups.length){
      summary.innerHTML = `✅ <b>No se detectaron duplicados</b> — analizados ${Store.total()} CDs con umbral 92%.`;
      summary.style.borderLeftColor = 'var(--ok)'; summary.style.background = 'rgba(93,220,154,.08)';
      list.innerHTML = ''; return;
    }
    const totalDup = groups.reduce((s, g) => s + g.length, 0);
    summary.innerHTML = `⚠️ <b>${groups.length} grupo${groups.length === 1 ? '' : 's'}</b> de posibles duplicados · <b>${totalDup}</b> CDs involucrados.`;
    summary.style.borderLeftColor = 'var(--warn)'; summary.style.background = 'rgba(255,169,77,.08)';
    list.innerHTML = groups.map((g, gi) => `<div class="dup-group"><div class="dup-group-head"><div class="dgh-title">🔍 Grupo #${gi+1} — ${g.length} CDs similares</div><div class="dgh-score">${Math.round(similarity(g[0].cd.titulo, g[1]?.cd.titulo||'')*100)}% similitud</div></div><div class="dup-items">${g.map(({cd, cat}) => `<div class="dup-item">${cd.portada ? `<img src="${esc(cd.portada)}" alt="">` : `<div class="dup-ph">💿</div>`}<div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cd.titulo)}</div><div style="font-size:.72rem;color:var(--muted)">${esc(cd.interprete)} · ${cd.anio ?? '—'} · Nº ${cd.nro} · ${esc(Store.get(cat)?.label || cat || '—')}</div></div><button type="button" class="btn danger" data-dup-del="${esc(cdKey(cat, cd))}" title="Eliminar">🗑️</button></div>`).join('')}</div></div>`).join('');
    list.querySelectorAll('[data-dup-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { cat, id } = parseCDKey(btn.dataset.dupDel);
        const cd = Store.getCDs(cat).find(c => c.id === id);
        if (!cd) return;
        if (!confirm(`¿Eliminar "${cd.titulo}" de "${Store.get(cat).label}"?`)) return;
        const before = snapshotAll();
        const list = Store.getCDs(cat);
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) list.splice(idx, 1);
        Undo.push('eliminar duplicado', () => restoreAll(before));
        Store.persist();
        HistoryLog.log('DELETE', `Duplicado eliminado: ${cd.titulo}`, cd.interprete);
        AutoBackup.markChange('eliminación de duplicado');
        render(); renderTabs(); renderAll();
        Toast.show('Duplicado eliminado', 'ok');
      });
    });
  }
  function exportCSV(){
    const groups = find(0.92);
    if (!groups.length){ Toast.show('Sin duplicados', 'warn'); return; }
    const sep = ';';
    const e = v => { const s = String(v??''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [['Grupo','Nº','Título','Intérprete','Año','Categoría'].join(sep)];
    groups.forEach((g, gi) => { g.forEach(({cd, cat}) => { rows.push([gi+1, cd.nro, cd.titulo, cd.interprete, cd.anio ?? '', Store.get(cat)?.label || cat || ''].map(e).join(sep)); }); });
    saveOrDownload(`discografia_duplicados_${timestamp()}.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv');
  }
  return { find, render, exportCSV };
})();

const DuplicateChecker = (() => {
  let _set = null;
  function rebuild(){ const g = Duplicates.find(0.92); const s = new Set(); for (const grp of g){ for (const {cd, cat} of grp){ s.add(cdKey(cat, cd)); } } _set = s; }
  function isDuplicate(cd){ if (!_set) rebuild(); for (const k of Store.catKeys()){ if (Store.getCDs(k).includes(cd)) return _set.has(cdKey(k, cd)); } return false; }
  function invalidate(){ _set = null; }
  return { isDuplicate, invalidate };
})();

const Loans = (() => {
  const isLoaned = cd => !!(cd.prestadoA && cd.prestadoA.trim());
  function isOverdue(cd){ if (!isLoaned(cd) || !cd.fechaDevolucion) return false; return new Date(cd.fechaDevolucion) < new Date(); }
  function getAll(){
    const out = [];
    for (const k of Store.catKeys()){ for (const cd of Store.getCDs(k)){ if (isLoaned(cd)) out.push({ cd, cat: k }); } }
    return out.sort((a, b) => {
      const da = a.cd.fechaDevolucion || '9999-12-31';
      const dbv = b.cd.fechaDevolucion || '9999-12-31';
      return da.localeCompare(dbv);
    });
  }
  function render(){
    const all = getAll();
    const summary = $('#loansSummary'), list = $('#loansList');
    if (!summary || !list) return;
    if (!all.length){ summary.innerHTML = '✅ <b>No hay CDs prestados</b> actualmente.'; summary.style.borderLeftColor = 'var(--ok)'; summary.style.background = 'rgba(93,220,154,.08)'; list.innerHTML = ''; return; }
    const overdue = all.filter(({cd}) => isOverdue(cd)).length;
    summary.innerHTML = `📚 <b>${all.length}</b> CD${all.length === 1 ? '' : 's'} prestado${all.length === 1 ? '' : 's'}${overdue > 0 ? ` · <b style="color:var(--danger)">${overdue} vencido${overdue === 1 ? '' : 's'}</b>` : ''}.`;
    list.innerHTML = `<div style="display:grid;grid-template-columns:1fr;gap:6px">${all.map(({cd, cat}) => {
      const ov = isOverdue(cd);
      return `<div class="loan-info-box${ov ? ' overdue' : ''}" style="display:grid;grid-template-columns:60px 1fr auto;gap:12px;align-items:center">${cd.portada ? `<img src="${esc(cd.portada)}" style="width:48px;height:48px;border-radius:6px;object-fit:cover">` : `<div style="width:48px;height:48px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:1.2rem">💿</div>`}<div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cd.titulo)}</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px">${esc(cd.interprete)} · Nº ${cd.nro} · ${esc(Store.get(cat)?.label || cat)}</div><div style="font-size:.72rem;margin-top:4px"><b>Prestado a:</b> ${esc(cd.prestadoA)}${cd.fechaDevolucion ? ` · <b>Devolución:</b> ${new Date(cd.fechaDevolucion).toLocaleDateString('es-AR')}${ov ? ' <span style="color:var(--danger);font-weight:700">(VENCIDO)</span>' : ''}` : ''}</div></div><button type="button" class="btn" data-loan-return="${esc(cdKey(cat, cd))}">↩️ Devolver</button></div>`;
    }).join('')}</div>`;
    list.querySelectorAll('[data-loan-return]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { cat, id } = parseCDKey(btn.dataset.loanReturn);
        const cd = Store.getCDs(cat).find(c => c.id === id);
        if (!cd) return;
        if (!confirm(`¿Marcar "${cd.titulo}" como devuelto?`)) return;
        const before = snapshotAll();
        cd.prestadoA = ''; cd.fechaPrestamo = ''; cd.fechaDevolucion = ''; cd.notasPrestamo = '';
        Undo.push('devolver CD', () => restoreAll(before));
        Store.persist();
        HistoryLog.log('LOAN', `Devuelto: ${cd.titulo}`, cd.interprete);
        AutoBackup.markChange('devolución');
        render(); renderAll();
        Toast.show('Marcado como devuelto', 'ok');
      });
    });
  }
  function exportCSV(){
    const all = getAll();
    if (!all.length){ Toast.show('Sin préstamos', 'warn'); return; }
    const sep = ';';
    const e = v => { const s = String(v??''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [['Nº','Título','Intérprete','Categoría','Prestado a','Fecha préstamo','Fecha devolución','Estado'].join(sep)];
    for (const {cd, cat} of all){ rows.push([cd.nro, cd.titulo, cd.interprete, Store.get(cat)?.label || cat, cd.prestadoA || '', cd.fechaPrestamo || '', cd.fechaDevolucion || '', isOverdue(cd) ? 'VENCIDO' : 'En plazo'].map(e).join(sep)); }
    saveOrDownload(`discografia_prestamos_${timestamp()}.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv');
  }
  return { isLoaned, isOverdue, getAll, render, exportCSV };
})();

/* =========================================================================
   v7.0.14-FIX: BarcodeScanner con lazy-load de html5-qrcode + advertencia
   ═════════════════════════════════════════════════════════════════════════
   - Navegadores con BarcodeDetector nativo (Chrome/Edge): usa nativo.
   - Navegadores sin BarcodeDetector (Safari/Firefox): carga html5-qrcode
     bajo demanda (lazy load) y muestra una advertencia visual al usuario.
   - Si la librería no se puede cargar: fallback a entrada manual.
   - La cámara se detiene al cambiar de pestaña (ahorro de batería).
   ========================================================================= */

const Html5QrLazyLoader = (() => {
  const SRC = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  let _promise = null;
  function load(){
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Html5Qrcode) return Promise.resolve(true);
    if (_promise) return _promise;
    _promise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => {
        const ok = typeof window.Html5Qrcode !== 'undefined';
        console.log(ok ? '[BarcodeScanner] ✓ html5-qrcode cargado (lazy)' : '[BarcodeScanner] ✗ html5-qrcode cargó pero Html5Qrcode no existe');
        resolve(ok);
      };
      s.onerror = () => {
        console.warn('[BarcodeScanner] ✗ No se pudo cargar html5-qrcode desde CDN.');
        _promise = null;
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return _promise;
  }
  return { load };
})();

const BarcodeScanner = (() => {
  let stream = null;
  let nativeDetector = null;
  let html5Scanner = null;
  let rafId = null;
  let running = false;
  let onDetected = null;

  const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const hasHtml5Qr = typeof window !== 'undefined' && typeof window.Html5Qrcode !== 'undefined';

  function showCompatWarning(reason){
    const modal = $('#scannerModal');
    if (!modal) return;
    let warn = modal.querySelector('#scanCompatWarning');
    if (!warn){
      warn = document.createElement('div');
      warn.id = 'scanCompatWarning';
      warn.className = 'scan-compat-warning';
      const body = modal.querySelector('.modal-body');
      if (body) body.insertBefore(warn, body.firstChild);
    }
    warn.style.display = 'flex';
    warn.classList.remove('error');
    warn.innerHTML = `
      <span class="scw-icon">⚠️</span>
      <div class="scw-text">
        <b>Modo de compatibilidad activado.</b>
        Tu navegador no tiene el escáner nativo (<code>BarcodeDetector</code>).
        Se usará la librería <b>html5-qrcode</b> cargada desde CDN.
        ${reason ? `<br><span class="scw-reason">${esc(reason)}</span>` : ''}
      </div>
    `;
  }
  function hideCompatWarning(){
    const warn = document.querySelector('#scanCompatWarning');
    if (warn) warn.style.display = 'none';
  }
  function showLibError(msg){
    const modal = $('#scannerModal');
    if (!modal) return;
    let warn = modal.querySelector('#scanCompatWarning');
    if (!warn){
      warn = document.createElement('div');
      warn.id = 'scanCompatWarning';
      warn.className = 'scan-compat-warning error';
      const body = modal.querySelector('.modal-body');
      if (body) body.insertBefore(warn, body.firstChild);
    }
    warn.style.display = 'flex';
    warn.classList.add('error');
    warn.innerHTML = `
      <span class="scw-icon">❌</span>
      <div class="scw-text">
        <b>No se pudo cargar el escáner.</b>
        ${esc(msg || 'Verificá tu conexión a internet.')}
        <br>Podés ingresar el código manualmente abajo.
      </div>
    `;
  }

  async function start(callback){
    onDetected = callback;
    hideCompatWarning();

    if (hasNativeDetector){
      console.log('[BarcodeScanner] Usando BarcodeDetector nativo.');
      return startNative();
    }

    console.log('[BarcodeScanner] Sin BarcodeDetector nativo. Cargando html5-qrcode (lazy)…');
    showCompatWarning('Cargando librería desde CDN…');
    const st = $('#scanStatus');
    if (st){ st.textContent = 'Cargando escáner compatible…'; st.className = 'scanner-status'; }

    const loaded = await Html5QrLazyLoader.load();
    if (loaded){
      showCompatWarning('Librería cargada correctamente.');
      setTimeout(() => {
        const w = document.querySelector('#scanCompatWarning');
        if (w){ w.style.transition = 'opacity .4s'; w.style.opacity = '0'; setTimeout(() => { if (w){ w.style.display = 'none'; w.style.opacity = '1'; } }, 450); }
      }, 2500);
      return startHtml5();
    }

    console.warn('[BarcodeScanner] html5-qrcode no disponible. Fallback manual.');
    showLibError('La librería html5-qrcode no se pudo descargar.');
    const fb = $('#scanFallback');
    if (fb){ fb.style.display = 'block'; fb.innerHTML = '⚠️ No se pudo cargar el escáner compatible. Ingresá el código manualmente abajo.'; }
    const sw = $('#scanWrap'); if (sw) sw.style.display = 'none';
    if (st){ st.textContent = 'Escaneo automático no disponible.'; st.className = 'scanner-status err'; }
  }

  async function startNative(){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = $('#scanVideo'); video.srcObject = stream; await video.play();
      nativeDetector = new window.BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128'] });
      running = true;
      $('#scanStatus').textContent = 'Apuntá al código de barras…';
      $('#scanStatus').className = 'scanner-status';
      scanLoopNative();
    } catch(err){
      $('#scanStatus').textContent = 'No se pudo acceder a la cámara: ' + err.message;
      $('#scanStatus').className = 'scanner-status err';
    }
  }

  async function scanLoopNative(){
    if (!running) return;
    const video = $('#scanVideo');
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA){ rafId = requestAnimationFrame(scanLoopNative); return; }
    try {
      const results = await nativeDetector.detect(video);
      if (results && results.length){
        const code = results[0].rawValue;
        running = false;
        $('#scanStatus').textContent = '✓ Código detectado: ' + code;
        $('#scanStatus').className = 'scanner-status ok';
        if (typeof onDetected === 'function') onDetected(code);
        stop();
        return;
      }
    } catch(e){}
    rafId = requestAnimationFrame(scanLoopNative);
  }

  async function startHtml5(){
    try {
      const container = $('#scanWrap');
      const video = $('#scanVideo');
      const overlay = container?.querySelector('.scan-overlay');
      if (video) video.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      let host = document.getElementById('html5qrReader');
      if (!host){
        host = document.createElement('div');
        host.id = 'html5qrReader';
        host.style.width = '100%';
        host.style.height = '100%';
        if (container) container.appendChild(host);
      }
      host.style.display = '';
      html5Scanner = new window.Html5Qrcode('html5qrReader', { verbose: false });
      const config = { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.333 };
      running = true;
      $('#scanStatus').textContent = 'Apuntá al código de barras…';
      $('#scanStatus').className = 'scanner-status';
      await html5Scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!running) return;
          running = false;
          $('#scanStatus').textContent = '✓ Código detectado: ' + decodedText;
          $('#scanStatus').className = 'scanner-status ok';
          if (typeof onDetected === 'function') onDetected(decodedText);
          stop();
        },
        () => {}
      );
    } catch(err){
      $('#scanStatus').textContent = 'No se pudo acceder a la cámara: ' + (err.message || err);
      $('#scanStatus').className = 'scanner-status err';
    }
  }

  function stop(){
    running = false;
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
    if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $('#scanVideo'); if (v){ v.srcObject = null; v.style.display = ''; }
    const overlay = $('#scanWrap')?.querySelector('.scan-overlay');
    if (overlay) overlay.style.display = '';
    if (html5Scanner){
      try { Promise.resolve(html5Scanner.stop()).then(() => { try { html5Scanner.clear(); } catch(_){} }).catch(()=>{}); } catch(e){}
      html5Scanner = null;
    }
    const host = document.getElementById('html5qrReader');
    if (host) host.style.display = 'none';
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running){
      console.log('[BarcodeScanner] Pestaña oculta → deteniendo cámara para ahorrar batería.');
      stop();
      const st = $('#scanStatus');
      if (st){ st.textContent = 'Escaneo detenido (cambiaste de pestaña).'; st.className = 'scanner-status'; }
    }
  });

  return {
    start,
    stop,
    isSupported: () => hasNativeDetector || hasHtml5Qr || true,
    hasNative: () => hasNativeDetector,
    loadHtml5: () => Html5QrLazyLoader.load()
  };
})();

const AdvancedSearch = (() => {
  function tokenize(query){
    const tokens = []; let cur = ''; let inQ = false;
    for (let i = 0; i < query.length; i++){
      const ch = query[i];
      if (ch === '"'){ inQ = !inQ; continue; }
      if (!inQ && /\s/.test(ch)){ if (cur) { tokens.push(cur); cur = ''; } } else cur += ch;
    }
    if (cur) tokens.push(cur);
    return tokens;
  }
  function matches(cd, query){
    const tokens = tokenize(query);
    if (!tokens.length) return true;
    let result = true, pendingOp = 'AND';
    for (const tk of tokens){
      if (tk === 'AND' || tk === 'OR'){ pendingOp = tk; continue; }
      if (!tk || tk === '-' || tk === '--') continue;
      const neg = tk.startsWith('-');
      const clean = neg ? tk.slice(1) : tk;
      if (!clean) continue;
      let hit;
      if (clean.includes(':')){
        const idx = clean.indexOf(':');
        const f = clean.slice(0, idx).toLowerCase();
        const v = clean.slice(idx + 1);
        if (!v) continue;
        hit = matchField(cd, f, v);
      } else { hit = matchGlobal(cd, clean); }
      if (neg) hit = !hit;
      result = pendingOp === 'OR' ? (result || hit) : (result && hit);
      pendingOp = 'AND';
    }
    return result;
  }
  function matchField(cd, field, value){
    const v = norm(value);
    const cmp = value.match(/^(>=|<=|>|<|=)/);
    const isCmp = !!cmp;
    function compare(target){
      if (isCmp){
        const n1 = parseFloat(target), n2 = parseFloat(value.replace(cmp[0], ''));
        if (isNaN(n1) || isNaN(n2)) return false;
        switch(cmp[0]){ case '>': return n1 > n2; case '<': return n1 < n2; case '>=': return n1 >= n2; case '<=': return n1 <= n2; case '=': return n1 === n2; }
      }
      return norm(target).includes(v);
    }
    switch(field){
      case 'artist': case 'artista': case 'interprete': case 'intérprete': return compare(cd.interprete);
      case 'title': case 'titulo': case 'título': return compare(cd.titulo);
      case 'year': case 'anio': case 'año': return compare(String(cd.anio ?? ''));
      case 'genre': case 'genero': case 'género': return compare(cd.genero);
      case 'label': case 'sello': return compare(cd.sello);
      case 'format': case 'formato': return compare(cd.formato);
      case 'catalog': case 'catalogo': case 'catálogo': return compare(cd.catalogo);
      case 'isrc': return compare(cd.isrc);
      case 'country': case 'pais': case 'país': return compare(cd.pais);
      case 'location': case 'ubicacion': case 'ubicación': return compare(cd.ubicacion);
      case 'nro': case 'numero': case 'número': return compare(String(cd.nro));
      case 'loaned': case 'prestado': const isL = Loans.isLoaned(cd); return value === 'true' ? isL : value === 'false' ? !isL : isL;
      default: return matchGlobal(cd, value);
    }
  }
  function matchGlobal(cd, term){
    const t = norm(term); if (!t) return true;
    const h = norm([cd.titulo, cd.interprete, cd.sello, cd.anio, cd.genero, cd.ubicacion, cd.catalogo, cd.pais, cd.edicion, cd.notas].join(' '));
    return h.includes(t);
  }
  function isAdvanced(query){
    const q = String(query || '').trim();
    if (!q) return false;
    if (/\b[a-zA-Z_ñÑáéíóúÁÉÍÓÚ]+\s*:\s*\S+/.test(q)) return true;
    if (/(^|\s)(AND|OR)(\s|$)/.test(q)) return true;
    if (/(^|\s)-[^\s-]/.test(q)) return true;
    return false;
  }
  return { matches, isAdvanced };
})();

/* =========================================================================
   [FIN app-core-1-base.js]
   Ahora pegá el contenido de app-core-2-api.js justo debajo.
   ========================================================================= */