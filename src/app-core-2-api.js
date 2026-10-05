/* =========================================================================
   DISCOGRAFÍA v7.0.14 — Core Parte 2/3: Discogs API, MusicBrainz, streaming
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   Depende de: app-core-1-base.js
   =========================================================================
   [PARTE 2/3] INICIO
   ========================================================================= */

function enrichMeta(base, t, i, pre){
  base.confidence = typeof pre === 'number'
    ? pre
    : matchConfidence(t, i, { title: base._title || t, artist: base._artist || i });
  base.enrichedAt = new Date().toISOString();
  return base;
}
function makeProvenance(source, confidence){ return { source: source || null, confidence: (typeof confidence === 'number' && Number.isFinite(confidence)) ? confidence : null, date: new Date().toISOString() }; }
function verificarFechaEmision(info, userYear){
  if (!info) return info;
  const y = parseInt(userYear); if (!y || !info.anio) return info;
  const d = info.anio - y;
  info.yearUser = y; info.yearFound = info.anio;
  if (d === 0) info.confidence = Math.min(100, (info.confidence||0)+5);
  else if (Math.abs(d) <= 1){}
  else if (d < 0 && Math.abs(d) > 20){ info.yearReissue = true; info.confidence = Math.min(100, (info.confidence||0)+3); }
  else if (d > 0 && d <= 5){ info.confidence = Math.max(0, (info.confidence||0)-10); info.yearWarning = true; }
  else if (d > 5){ info.confidence = Math.max(0, (info.confidence||0)-25); info.yearMismatch = true; }
  else info.yearWarning = true;
  return info;
}

/* ─── Discogs config ─── */
function getDiscogsConfig(){
  try { return JSON.parse(localStorage.getItem(DISCOGS_CONFIG_KEY) || '{}') || {}; }
  catch(e){ return {}; }
}
function getDiscogsToken(){ return String(getDiscogsConfig().token || '').trim(); }
function getDiscogsProxy(){ return String(getDiscogsConfig().proxy || '').trim(); }
function saveDiscogsConfig(token, proxy){
  const t = String(token || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Discogs\s+token\s*=\s*/i, '').replace(/^Bearer\s+/i, '').replace(/\s+/g, '');
  const p = String(proxy || '').trim();
  if (!t && !p){ try { localStorage.removeItem(DISCOGS_CONFIG_KEY); } catch(e){} return true; }
  const payload = JSON.stringify({ token: t, proxy: p, updatedAt: new Date().toISOString() });
  try { localStorage.setItem(DISCOGS_CONFIG_KEY, payload); return true; }
  catch(e1){
    if (!isQuotaError(e1)){ console.error('saveDiscogsConfig', e1); return false; }
    const freed = freeLocalStorageCaches();
    console.warn('[Discogs] Quota excedida. Liberados ~', freed, 'chars de caché. Reintentando…');
    try {
      localStorage.setItem(DISCOGS_CONFIG_KEY, payload);
      try { if (typeof Toast !== 'undefined') Toast.show('⚠️ Storage lleno: se liberaron cachés y se guardó el token.', 'warn', 6000); } catch(_){}
      return true;
    } catch(e2){
      console.error('saveDiscogsConfig retry failed', e2);
      try { if (typeof Toast !== 'undefined') Toast.show('Storage lleno. Exportá un backup (Ctrl+S) y vaciá caché en ⚙️.', 'err', 9000); } catch(_){}
      return false;
    }
  }
}
function clearDiscogsConfig(){ try { localStorage.removeItem(DISCOGS_CONFIG_KEY); } catch(e){} }

function discogsUrl(url, tokenOverride = null, useProxy = false){
  const token = tokenOverride !== null ? String(tokenOverride).trim() : getDiscogsToken();
  let finalUrl = String(url);
  if (useProxy && token){ const sep = finalUrl.includes('?') ? '&' : '?'; finalUrl += sep + 'token=' + encodeURIComponent(token); }
  if (!useProxy) return finalUrl;
  const configuredProxy = getDiscogsProxy();
  const proxy = configuredProxy || DEFAULT_CORS_PROXY;
  if (/[?&]url=$/.test(proxy) || proxy.endsWith('=')){ return proxy + encodeURIComponent(finalUrl); }
  if (proxy.endsWith('/')){ return proxy + finalUrl.replace(/^https?:\/\//, ''); }
  return proxy + '?url=' + encodeURIComponent(finalUrl);
}
function discogsHeaders(tokenOverride = null){
  const token = tokenOverride !== null ? String(tokenOverride).trim() : getDiscogsToken();
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = 'Discogs token=' + token;
  return headers;
}
function isDiscogsNetworkError(err){
  if (!err) return false;
  const name = String(err.name || '');
  const msg  = String(err.message || '');
  return (name === 'TypeError' || name === 'AbortError' || name === 'TimeoutError' ||
    /failed to fetch/i.test(msg) || /network/i.test(msg) || /cors/i.test(msg) ||
    /aborted/i.test(msg) || /timeout/i.test(msg));
}
async function fetchDiscogsDirect(url, token, timeoutMs = DISCOGS_FETCH_TIMEOUT_MS){
  return await fetchWithTimeout(url, { method: 'GET', headers: discogsHeaders(token), credentials: 'omit', cache: 'no-store' }, timeoutMs);
}
async function fetchDiscogsProxy(url, token, timeoutMs = DISCOGS_FETCH_TIMEOUT_MS){
  const proxyUrl = discogsUrl(url, token, true);
  return await fetchWithTimeout(proxyUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, credentials: 'omit', cache: 'no-store' }, timeoutMs);
}
async function fetchDiscogs(url, timeoutMs = DISCOGS_FETCH_TIMEOUT_MS, tokenOverride = null){
  const token = tokenOverride !== null ? String(tokenOverride).trim() : getDiscogsToken();
  if (!token) throw new Error('No hay token de Discogs configurado.');
  const manualProxy = getDiscogsProxy();
  if (manualProxy){
    try { return await fetchDiscogsProxy(url, token, timeoutMs); }
    catch(err){ throw new Error('No se pudo conectar con Discogs mediante el proxy configurado.'); }
  }
  try { const response = await fetchDiscogsDirect(url, token, timeoutMs); return response; }
  catch(directError){ if (!isDiscogsNetworkError(directError)) throw directError; }
  try { const response = await fetchDiscogsProxy(url, token, Math.max(timeoutMs, 20000)); return response; }
  catch(proxyError){ throw new Error('No se pudo conectar con Discogs.'); }
}
async function testDiscogsConnection(tokenOverride = null, attempt = 1){
  const token = String(tokenOverride ?? getDiscogsToken()).trim();
  if (!token) throw new Error('No hay token configurado.');
  const MAX = 2;
  try {
    const res = await fetchDiscogs(`${DISCOGS_API}/oauth/identity`, DISCOGS_TEST_TIMEOUT_MS, token);
    if (!res.ok){
      let detail = 'HTTP ' + res.status;
      try { const json = await res.json(); if (json?.message) detail += ' · ' + json.message; } catch(_){}
      if (res.status === 401) detail += ' · Token inválido o expirado';
      if (res.status === 403) detail += ' · Acceso rechazado por Discogs';
      if (res.status === 429) detail += ' · Rate limit de Discogs';
      throw new Error(detail);
    }
    return await res.json();
  } catch(err){
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError' || /aborted|timeout/i.test(String(err?.message || ''));
    if (isTimeout && attempt < MAX){ await new Promise(r => setTimeout(r, 1500)); return testDiscogsConnection(tokenOverride, attempt + 1); }
    throw err;
  }
}
function updateDiscogsStatus(kind, text){
  const el = $("#discogsStatus"); if (!el) return;
  const icons = { ok: '🟢', warn: '🟠', error: '🔴', idle: '⚪' };
  el.innerHTML = `${icons[kind] || icons.idle} ${esc(text)}`;
}
function updateDiscogsProtoHint(){
  const el = $("#discogsProtoHint"); if (!el) return;
  const manualProxy = getDiscogsProxy();
  if (isFileProtocol()){
    el.style.display = 'block';
    el.style.background = 'rgba(93,220,154,.08)';
    el.style.borderLeft = '4px solid var(--ok)';
    if (manualProxy){ el.innerHTML = `🟢 <b>file:// + proxy manual:</b> <code>${esc(manualProxy)}</code>.`; }
    else { el.innerHTML = `🟢 <b>file://:</b> se intentará conexión directa y fallback automático.`; }
  } else {
    el.style.display = 'block';
    el.style.background = 'rgba(79,195,247,.08)';
    el.style.borderLeft = '4px solid var(--accent)';
    if (manualProxy){ el.innerHTML = `🟢 <b>Proxy manual activo:</b> <code>${esc(manualProxy)}</code>.`; }
    else { el.innerHTML = `ℹ️ Se usará <b>conexión directa</b> con Discogs (token por header).`; }
  }
  updateDiscogsSecurityWarning();
}
function updateDiscogsSecurityWarning(){
  const el = $("#discogsSecurityWarning"); if (!el) return;
  const manualProxy = getDiscogsProxy();
  const token = getDiscogsToken();
  const shouldShow = !!(token && (manualProxy || isFileProtocol()));
  el.style.display = shouldShow ? 'flex' : 'none';
  if (shouldShow){ el.innerHTML = `<div><b>Seguridad:</b> cuando se usa un proxy, el token viaja en la URL.</div>`; }
}
function openDiscogsConfig(){
  const modal = $("#discogsConfigModal"); if (!modal) return;
  const config = getDiscogsConfig();
  $("#discogsTokenInput").value = config.token || "";
  $("#discogsProxyInput").value = config.proxy || "";
  updateDiscogsStatus(config.token ? 'warn' : 'idle', config.token ? 'Token guardado.' : 'Sin configurar');
  updateDiscogsProtoHint();
  modal.classList.add('open');
}
function closeDiscogsConfig(){ $("#discogsConfigModal")?.classList.remove('open'); }

async function fetchDiscogsReleaseDetails(id){
  if (!id) return null;
  try { await throttleSource("Discogs"); const res = await fetchDiscogs(`${DISCOGS_API}/releases/${id}`); if (!res.ok) return null; const d = await res.json(); const p = d.images?.find(i => i.type === 'primary') || d.images?.[0]; const y = d.year ? parseInt(d.year) : null; return { cover: p?.uri || p?.uri150 || null, year: (y && y >= 1900) ? y : null }; }
  catch(e){ return null; }
}
async function fetchDiscogsMasterDetails(masterId){
  if (!masterId) return null;
  try { await throttleSource("Discogs"); const res = await fetchDiscogs(`${DISCOGS_API}/masters/${masterId}`); if (!res.ok) return null; const d = await res.json(); const y = d.year ? parseInt(d.year) : null; return { year: (y && y >= 1900 && y <= 2100) ? y : null, cover: (d.images?.find(i => i.type === 'primary') || d.images?.[0])?.uri || null, title: d.title || null, masterId: masterId }; }
  catch(e){ return null; }
}
async function fetchCoverArtFromCAA(mbId){
  if (!mbId) return null;
  try { const res = await fetchWithTimeout(`https://coverartarchive.org/release/${mbId}`, {}, 6000); if (!res.ok) return null; const d = await res.json(); if (!Array.isArray(d.images) || !d.images.length) return null; const f = d.images.find(i => i.front) || d.images[0]; return f.image || f.thumbnails?.["500"] || f.thumbnails?.large || f.thumbnails?.["250"] || null; }
  catch(e){ return null; }
}
function cleanDiscogsTitle(raw){ return String(raw||'').replace(/\s*\(\d+\)\s*$/, '').replace(/\s*\[[^\]]*\]\s*$/, '').trim(); }

async function fetchExternalLinks(mbid){
  if (!mbid) return {};
  try {
    await throttleSource("MusicBrainz");
    const res = await fetchWithTimeout(`${MB_API}release/${mbid}?inc=url-rels&fmt=json`, { headers: { 'User-Agent': MB_USER_AGENT } }, 8000);
    if (!res.ok) return {};
    const d = await res.json();
    const links = {};
    for (const rel of (d.relations || [])){
      const url = rel?.url?.resource;
      if (!url) continue;
      for (const svc of STREAMING_SERVICES){ if (svc.pattern.test(url) && !links[svc.key]) links[svc.key] = url; }
    }
    return links;
  } catch(e){ return {}; }
}

/* ─── Streaming ─── */
function isSafeStreamUrl(url){
  if (!url || typeof url !== 'string') return false;
  if (!/^https:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return ALLOWED_STREAM_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch(e){ return false; }
}

const ResolvedLinks = {
  _cache: null,
  _load(){
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(RESOLVED_LINKS_KEY) || '{}'); } catch(e){ this._cache = {}; }
    return this._cache;
  },
  get(cdId){
    const c = this._load();
    const e = c[cdId];
    if (!e) return null;
    if (Date.now() - (e.ts||0) > RESOLVED_TTL){ delete c[cdId]; this._persist(); return null; }
    return e.links;
  },
  set(cdId, links){
    const c = this._load();
    c[cdId] = { links, ts: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > RESOLVED_MAX){
      keys.sort((a,b) => (c[a].ts||0) - (c[b].ts||0));
      for (let i = 0; i < 100; i++) delete c[keys[i]];
    }
    this._persist();
  },
  _persist(){ try { localStorage.setItem(RESOLVED_LINKS_KEY, JSON.stringify(this._cache)); } catch(e){} },
  clear(){ this._cache = {}; try { localStorage.removeItem(RESOLVED_LINKS_KEY); } catch(e){} }
};

function _itunesSanitize(str){
  return String(str || '')
    .replace(/[''`´]/g, '')
    .replace(/[&]/g, 'and')
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _itunesQueryVariants(interprete, titulo){
  const i = _itunesSanitize(interprete);
  const t = _itunesSanitize(titulo);
  const variants = [];
  if (i && t) variants.push(`${i} ${t}`);
  if (i && t) variants.push(`${i} - ${t}`);
  if (t) variants.push(t);
  if (i) variants.push(i);
  const iNoThe = i.replace(/^the\s+/i, '');
  if (iNoThe && iNoThe !== i){ if (t) variants.push(`${iNoThe} ${t}`); variants.push(iNoThe); }
  if (i){ const shortI = i.split(/\s+/).slice(0, 2).join(' '); if (t) variants.push(`${shortI} ${t.split(/\s+/).slice(0, 3).join(' ')}`.trim()); }
  return [...new Set(variants.filter(v => v.length >= 2))];
}

async function findAppleAlbumMatch(cd){
  const interprete = String(cd.interprete || '').trim();
  const titulo = String(cd.titulo || '').trim();
  if (!interprete && !titulo) return null;

  const nArtist = normMatch(interprete);
  const nTitle  = normMatch(titulo);
  const year    = cd.anio ? String(cd.anio) : '';
  const countries = ['US', 'AR', 'ES', 'MX', 'GB', 'DE', 'JP'];
  const variants = _itunesQueryVariants(interprete, titulo);

  let allResults = [];
  let triedQuery = '';

  outer:
  for (const country of countries){
    for (const term of variants){
      triedQuery = term;
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=50&country=${country}`;
        const r = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
        if (!r.ok) continue;
        const data = await r.json();
        if (data.results && data.results.length > 0){
          allResults = data.results;
          console.log(`[iTunes] ✓ "${term}" (${country}) → ${data.results.length} resultados`);
          break outer;
        }
      } catch(_){}
    }
  }

  if (!allResults.length){
    console.warn(`[iTunes] ❌ Sin resultados. Último intento: "${triedQuery}". Variantes: ${variants.length}. Países: ${countries.length}`);
    return null;
  }

  const albumsOnly = allResults.filter(r => {
    if (r.wrapperType !== 'collection') return false;
    if (r.collectionType === 'Single') return false;
    if ((r.trackCount || 0) < 3) return false;
    return true;
  });
  const pool = albumsOnly.length ? albumsOnly : allResults;

  const badWords = ['karaoke','tribute','made famous','in the style of','performed by','cover version','backing track'];

  function scoreAlbum(r){
    const ra = normMatch(r.artistName || '');
    const rt = normMatch(r.collectionName || '');
    const ry = (r.releaseDate || '').slice(0, 4);
    const tc = r.trackCount || 0;
    let s = 0;
    if (!ra || !nArtist) return -1;
    if (ra === nArtist) s += 100;
    else if (ra.includes(nArtist) || nArtist.includes(ra)) s += 50;
    else {
      const aw = new Set(ra.split(' '));
      const bw = new Set(nArtist.split(' '));
      const inter = [...aw].filter(w => bw.has(w) && w.length > 2).length;
      if (inter >= 2) s += 30;
      else return -1;
    }
    if (!rt || !nTitle) return -1;
    if (rt === nTitle) s += 100;
    else if (rt.includes(nTitle) || nTitle.includes(rt)) s += 60;
    else {
      const tw = new Set(rt.split(' ').filter(w => w.length > 2));
      const nw = new Set(nTitle.split(' ').filter(w => w.length > 2));
      const inter = [...tw].filter(w => nw.has(w)).length;
      const total = Math.max(tw.size, nw.size) || 1;
      const ratio = inter / total;
      if (ratio >= 0.5) s += 30;
      else return -1;
    }
    if (year && ry === year) s += 30;
    else if (year && Math.abs(parseInt(ry) - parseInt(year)) <= 1) s += 15;
    for (const bw of badWords){ if (rt.includes(bw) && !nTitle.includes(bw)) s -= 80; }
    if (tc >= 7 && tc <= 25) s += 10;
    return s;
  }

  const scored = pool.map(r => ({ r, s: scoreAlbum(r) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length){ console.warn(`[iTunes] Tenía ${pool.length} resultados pero ninguno pasó el scoring`); return null; }
  console.log(`[iTunes] 🎯 Match: "${scored[0].r.collectionName}" por "${scored[0].r.artistName}" (score ${scored[0].s})`);
  return scored[0].r;
}

const ODESLI_PLATFORM_MAP = {
  spotify: 'spotify',
  appleMusic: 'apple', itunes: 'apple',
  youtubeMusic: 'youtube', youtube: 'youtube'
};

async function resolveAllPlatformLinks(appleMusicUrl){
  const links = {};
  if (appleMusicUrl && isSafeStreamUrl(appleMusicUrl)) links.apple = appleMusicUrl;
  try {
    const odesliUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(appleMusicUrl)}&userCountry=US`;
    const r = await fetchWithTimeout(odesliUrl, { cache: 'no-store' }, 8000);
    if (r.ok){
      const data = await r.json();
      const platforms = data.linksByPlatform || {};
      for (const [odeKey, odeData] of Object.entries(platforms)){
        const ourKey = ODESLI_PLATFORM_MAP[odeKey];
        if (!ourKey || !odeData?.url) continue;
        if (!isSafeStreamUrl(odeData.url)) continue;
        if (!isAlbumUrl(odeData.url, ourKey)) continue;
        if (!links[ourKey]) links[ourKey] = odeData.url;
      }
    } else { console.warn('Odesli HTTP', r.status, '— usando solo Apple Music'); }
  } catch (err){ console.warn('Odesli no disponible:', err?.message || err); }
  return links;
}

function guardarLinksEnCD(cd, links){
  if (!cd.links) cd.links = {};
  let changed = false;
  for (const [k, v] of Object.entries(links)){
    if (v && isSafeStreamUrl(v) && isAlbumUrl(v, k) && !cd.links[k]){ cd.links[k] = v; changed = true; }
  }
  if (changed){
    Store.persist();
    HistoryLog.log('EDIT', `Links de streaming guardados`, cd.titulo);
    AutoBackup.markChange('links streaming');
  }
  return changed;
}

function mostrarModalConfirmacionAlbum(cd, match, links, svcName, svcIcon){
  return new Promise((resolve) => {
    const m = $("#albumConfirmModal");
    const body = $("#albumConfirmBody");
    if (!m || !body){ resolve('cancel'); return; }
    const available = Object.keys(links);
    const cover = match.artworkUrl100 ? match.artworkUrl100.replace('100x100', '300x300') : (cd.portada || '');
    const platformsList = available.map(k => {
      const svc = STREAMING_SERVICES.find(s => s.key === k);
      return svc ? `<span class="ca-plat">${esc(svc.icon)} ${esc(svc.name)}</span>` : '';
    }).join('');
    body.innerHTML = `
      <div class="ca-hero">
        ${cover ? `<img src="${esc(cover)}" alt="Portada" onerror="this.style.display='none'">` : `<div style="width:110px;height:110px;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:2.5rem;border:1px solid var(--line)">💿</div>`}
        <div class="ca-info">
          <h3>${esc(match.collectionName || cd.titulo)}</h3>
          <p>${esc(match.artistName || cd.interprete)}${match.releaseDate ? ` · ${match.releaseDate.slice(0,4)}` : ''}</p>
          <div style="font-size:.72rem;color:var(--muted);margin-top:8px">Se abrirá en <b style="color:var(--accent)">${esc(svcName)}</b></div>
        </div>
      </div>
      <div class="ca-plats">${platformsList || '<span style="color:var(--muted);font-size:.78rem">Sin plataformas disponibles</span>'}</div>
      <div class="ca-warn">⚠️ Si no es el álbum correcto (versión en vivo, cover, edición especial), elegí "Buscar manualmente".</div>
    `;
    const modalBox = m.querySelector('.modal');
    modalBox.querySelector('.ca-foot')?.remove();
    const footer = document.createElement('div');
    footer.className = 'ca-foot modal-foot';
    footer.innerHTML = `
      <button type="button" class="btn" data-dec="cancel">✗ Buscar manualmente</button>
      <button type="button" class="btn" data-dec="once">🔗 Solo abrir</button>
      <button type="button" class="btn primary" data-dec="save">⭐ Recordar</button>
    `;
    modalBox.appendChild(footer);
    function cleanup(dec){
      m.classList.remove('open');
      modalBox.querySelector('.ca-foot')?.remove();
      document.body.style.overflow = '';
      resolve(dec);
    }
    footer.querySelectorAll('button[data-dec]').forEach(b => { b.addEventListener('click', () => cleanup(b.dataset.dec)); });
    const closeBtn = $("#albumConfirmClose");
    const closeHandler = () => cleanup('cancel');
    closeBtn?.addEventListener('click', closeHandler, { once: true });
    const overlayHandler = (e) => { if (e.target.id === 'albumConfirmModal') cleanup('cancel'); };
    m.addEventListener('click', overlayHandler, { once: true });
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
}

/* =========================================================================
   v7.0.14 — SOLUCIÓN DEFINITIVA para file://
   =========================================================================
   Desde file:// los siguientes servicios bloquean CORS:
   - iTunes Search API (Apple)  → siempre bloquea
   - Odesli (a veces)
   - MusicBrainz (a veces)

   Por eso, cuando corremos desde file://, NO podemos depender de iTunes
   para resolver links. La estrategia es:

   1. Abrir INMEDIATAMENTE el buscador de la plataforma con <a>.click()
      (esto SÍ funciona desde file://, dentro del mismo tick del usuario).
   2. En paralelo (sin bloquear), intentar iTunes + Odesli. Si tienen éxito,
      guardamos los links en caché para la próxima vez.

   Resultado: el usuario SIEMPRE ve una respuesta instantánea (el buscador
   se abre), y si tenemos suerte, la próxima vez abrirá directo.
   ========================================================================= */

/**
 * Abre una URL externa de forma robusta incluso desde file://.
 * Crea un <a target="_blank"> y simula el click, lo que el navegador
 * trata como navegación legítima del usuario y NO bloquea.
 */
function _openExternal(url){
  if (!url) return;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { a.remove(); } catch(_){} }, 100);
  } catch(e){
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch(_){}
  }
}

/**
 * Construye la URL del buscador manual para una plataforma.
 */
function _buildManualSearchUrl(cd, svcKey){
  const q = encodeURIComponent(`${cd.interprete || ''} ${cd.titulo || ''}${cd.anio ? ' ' + cd.anio : ''}`.trim());
  const urls = {
    spotify: `https://open.spotify.com/search/${q}/albums`,
    youtube: `https://music.youtube.com/search?q=${q}&sp=EgIQAw%253D%253D`,
    apple: `https://music.apple.com/search?term=${q}&entity=album`,
    discogs: `https://www.discogs.com/search/?q=${q}&type=release`,
    lastfm: `https://www.last.fm/search/albums?q=${q}`
  };
  return urls[svcKey] || null;
}

/* v7.0.14-FIX: NO abrir una pestaña adicional si la target ya fue cerrada.
   En su lugar mostramos un toast y salimos silenciosamente. */
function abrirBuscadorWebManual(cd, svcKey, targetWindow){
  const url = _buildManualSearchUrl(cd, svcKey);
  if (!url || !isSafeStreamUrl(url)){
    if (targetWindow && !targetWindow.closed){ try { targetWindow.close(); } catch(_){} }
    return;
  }
  if (targetWindow){
    if (targetWindow.closed){
      Toast.show('ℹ️ La pestaña fue cerrada. Tocá de nuevo el botón para reintentar.', 'info', 3500);
      return;
    }
    try { targetWindow.location.href = url; return; }
    catch(e){ /* caer al fallback */ }
  }
  _openExternal(url);
}

function attachLongPress(el, callback, ms=600){
  let timer = null;
  let wasLong = false;
  const start = () => {
    wasLong = false;
    timer = setTimeout(() => { wasLong = true; if (navigator.vibrate) navigator.vibrate(30); callback(); }, ms);
  };
  const cancel = () => { if (timer){ clearTimeout(timer); timer = null; } };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", (e) => { cancel(); if (wasLong){ e.preventDefault(); e.stopPropagation(); } }, { passive: false });
  el.addEventListener("touchcancel", cancel);
  el.addEventListener("touchmove", cancel);
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", (e) => { cancel(); if (wasLong){ e.preventDefault(); e.stopPropagation(); } });
  el.addEventListener("mouseleave", cancel);
  el.addEventListener("click", (e) => { if (wasLong){ e.preventDefault(); e.stopPropagation(); wasLong = false; } }, true);
  el.addEventListener("contextmenu", e => e.preventDefault());
}

function removeResolvedLinkFromCD(cd, svcKey){
  if (!cd.links || !cd.links[svcKey]) return false;
  delete cd.links[svcKey];
  Store.persist();
  HistoryLog.log('EDIT', `Link quitado: ${svcKey}`, cd.titulo);
  AutoBackup.markChange('link quitado');
  return true;
}

function mostrarMenuQuitarLink(cd, svcKey, svcName, svcIcon){
  return new Promise(resolve => {
    const url = cd.links?.[svcKey] || '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '400';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width:460px">
        <div class="modal-head">
          <h3><span>🔗</span><span>Link guardado</span></h3>
          <button type="button" class="close" data-mql-x>✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:12px;align-items:center;padding:14px;background:rgba(93,220,154,.06);border:1px solid rgba(93,220,154,.3);border-radius:12px;margin-bottom:14px">
            <span style="font-size:1.8rem">${esc(svcIcon)}</span>
            <div style="min-width:0;flex:1">
              <div style="font-size:.9rem;font-weight:700">${esc(svcName)}</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">${esc(cd.titulo || '—')}</div>
            </div>
          </div>
          <div style="font-size:.76rem;color:var(--warn);padding:10px 12px;background:rgba(255,169,77,.06);border-left:3px solid var(--warn);border-radius:8px;line-height:1.55">
            Si quitás este link, la próxima vez que toques <b>${esc(svcIcon)} ${esc(svcName)}</b> te voy a preguntar de nuevo.
          </div>
          <div style="margin-top:10px;padding:10px 12px;background:rgba(79,195,247,.06);border-left:3px solid var(--accent);border-radius:8px;font-size:.72rem;color:var(--muted);line-height:1.5;word-break:break-all">
            <b>URL actual:</b><br>${esc(url)}
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn" data-mql-cancel>Cancelar</button>
          <div class="right"><button type="button" class="btn danger" data-mql-remove>🗑️ Quitar link</button></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = (resultado) => { overlay.remove(); resolve(resultado); };
    overlay.querySelector('[data-mql-x]').addEventListener('click', () => cerrar(false));
    overlay.querySelector('[data-mql-cancel]').addEventListener('click', () => cerrar(false));
    overlay.querySelector('[data-mql-remove]').addEventListener('click', () => cerrar(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
  });
}

function mostrarMenuResetearLinks(cd){
  return new Promise(resolve => {
    const links = cd.links || {};
    const keys = Object.keys(links).filter(k => STREAMING_SERVICES.some(s => s.key === k));
    if (!keys.length){ resolve(false); return; }
    const lista = keys.map(k => {
      const svc = STREAMING_SERVICES.find(s => s.key === k);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.82rem"><span style="font-size:1.1rem">${esc(svc?.icon||'🔗')}</span><span>${esc(svc?.name||k)}</span></div>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '400';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" style="max-width:460px">
        <div class="modal-head">
          <h3><span>🔄</span><span>Resetear links guardados</span></h3>
          <button type="button" class="close" data-mrl-x>✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:.82rem;color:var(--muted);line-height:1.55;margin-bottom:12px">
            Se van a quitar <b>${keys.length}</b> link${keys.length === 1 ? '' : 's'} de <b>${esc(cd.titulo || '—')}</b>.
          </div>
          <div style="padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:10px">${lista}</div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn" data-mrl-cancel>Cancelar</button>
          <div class="right"><button type="button" class="btn danger" data-mrl-reset>🗑️ Quitar todos</button></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = (resultado) => { overlay.remove(); resolve(resultado); };
    overlay.querySelector('[data-mrl-x]').addEventListener('click', () => cerrar(false));
    overlay.querySelector('[data-mrl-cancel]').addEventListener('click', () => cerrar(false));
    overlay.querySelector('[data-mrl-reset]').addEventListener('click', () => cerrar(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
  });
}

function wireStreamingSectionEvents(section, cd){
  if (!section || !cd) return;
  section.querySelectorAll('[data-smart-search]').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    const svcKey = btn.dataset.smartSearch;
    const svcDef = STREAMING_SERVICES.find(s => s.key === svcKey);
    if (!svcDef) return;
    btn.addEventListener('click', () => {
      if (btn.dataset.busy === '1') return;
      btn.dataset.busy = '1';
      buscarYReproducir(cd, svcDef.key, svcDef.name, svcDef.icon, btn).finally(() => { delete btn.dataset.busy; });
    });
  });
  section.querySelectorAll('[data-saved-key]').forEach(el => {
    const svcKey = el.dataset.savedKey;
    const svcDef = STREAMING_SERVICES.find(s => s.key === svcKey);
    if (!svcDef) return;
    if (!el.dataset.wired){
      el.dataset.wired = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const url = cd.links?.[svcKey];
        if (url && isSafeStreamUrl(url)) window.open(url, '_blank', 'noopener');
        else Toast.show('🔒 URL no permitida', 'warn', 3000);
      });
      attachLongPress(el, async () => {
        const quitar = await mostrarMenuQuitarLink(cd, svcKey, svcDef.name, svcDef.icon);
        if (quitar){
          removeResolvedLinkFromCD(cd, svcKey);
          refreshStreamingSectionInDetail(cd);
          Toast.show(`🗑️ Link de ${svcDef.name} quitado`, 'info', 2500);
        }
      });
    }
  });
  const resetBtn = section.querySelector('#resetLinksBtn');
  if (resetBtn && !resetBtn.dataset.wired){
    resetBtn.dataset.wired = '1';
    resetBtn.addEventListener('click', async () => {
      const confirmar = await mostrarMenuResetearLinks(cd);
      if (confirmar){
        const keys = Object.keys(cd.links || {}).filter(k => STREAMING_SERVICES.some(s => s.key === k));
        keys.forEach(k => delete cd.links[k]);
        Store.persist();
        HistoryLog.log('EDIT', `Links reseteados`, `${keys.length} · ${cd.titulo}`);
        AutoBackup.markChange('reset links');
        refreshStreamingSectionInDetail(cd);
        Toast.show(`🗑️ ${keys.length} link${keys.length === 1 ? '' : 's'} quitado${keys.length === 1 ? '' : 's'}`, 'info', 2800);
      }
    });
  }
}

function refreshStreamingSectionInDetail(cd){
  const viewBody = $("#viewBody");
  if (!viewBody) return;
  const oldSection = viewBody.querySelector('.stream-section');
  if (!oldSection) return;
  const temp = document.createElement('div');
  temp.innerHTML = renderStreamingSection(cd);
  const newSection = temp.firstElementChild;
  if (!newSection) return;
  oldSection.replaceWith(newSection);
  wireStreamingSectionEvents(newSection, cd);
}

/* ─────────────────────────────────────────────────────────────────────────
   v7.0.14 — buscarYReproducir (CORREGIDO)
   ─────────────────────────────────────────────────────────────────────────
   Este método ya no depende de abrir una pestaña en blanco (que los
   navegadores bloquean). En su lugar:

   1. Abre el buscador de la plataforma INMEDIATAMENTE (dentro del clic
      del usuario), lo que evita el bloqueo de pop-ups.
   2. En paralelo, intenta buscar el álbum exacto con iTunes + Odesli.
   3. Si encuentra el link directo, lo guarda en caché para la próxima vez.
   ───────────────────────────────────────────────────────────────────────── */
async function buscarYReproducir(cd, svcKey, svcName, svcIcon, triggerBtn){
  const original = triggerBtn ? triggerBtn.innerHTML : '';

  // 1) Si ya hay un link guardado en el CD, abrirlo directamente.
  if (cd.links && cd.links[svcKey]){
    const url = cd.links[svcKey];
    if (!isSafeStreamUrl(url)){ Toast.show('🔒 URL no permitida', 'warn', 3500); return; }
    _openExternal(url);
    return;
  }

  // 2) Si hay caché de sesión, abrirlo directamente.
  const cached = ResolvedLinks.get(cd.id);
  if (cached && cached[svcKey]){
    const url = cached[svcKey];
    if (!isSafeStreamUrl(url)){ Toast.show('🔒 URL no permitida', 'warn', 3000); return; }
    _openExternal(url);
    return;
  }

  // 3) Si no hay link guardado, abrimos el buscador inmediatamente y buscamos en segundo plano.
  // Esto evita el bloqueo de ventanas emergentes.
  const manualUrl = _buildManualSearchUrl(cd, svcKey);
  if (!manualUrl || !isSafeStreamUrl(manualUrl)){
    Toast.show('🔒 URL de búsqueda no permitida', 'warn', 3500);
    return;
  }
  
  // Abrimos el buscador AHORA MISMO (dentro del clic del usuario)
  _openExternal(manualUrl);
  Toast.show(`🔎 Abriendo buscador de ${svcName}…`, 'info', 2500);

  // En paralelo, intentamos iTunes + Odesli para cachear links futuros.
  (async () => {
    try {
      await new Promise(r => setTimeout(r, 500));

      let appleMatch = null;
      try { appleMatch = await findAppleAlbumMatch(cd); } catch(e){ console.warn('[buscarYReproducir] iTunes falló:', e); }

      if (!appleMatch || !appleMatch.collectionViewUrl){
        console.log('[buscarYReproducir] iTunes sin resultados. El buscador ya está abierto.');
        return;
      }

      let links = {};
      try { links = await resolveAllPlatformLinks(appleMatch.collectionViewUrl); }
      catch(e){ console.warn('[buscarYReproducir] Odesli falló:', e); links = { apple: appleMatch.collectionViewUrl }; }

      const directUrl = links[svcKey];
      if (directUrl && isSafeStreamUrl(directUrl)){
        ResolvedLinks.set(cd.id, links);
        if (App.detailCD && App.detailCD.id === cd.id){
          setTimeout(() => refreshStreamingSectionInDetail(cd), 300);
        }
        Toast.show(`✨ Encontré ${svcName} directo para "${cd.titulo}". La próxima vez abrirá al instante.`, 'ok', 5000);
      } else {
        console.log(`[buscarYReproducir] Odesli no trajo link directo para ${svcKey}.`);
      }
    } catch(err){
      console.warn('[buscarYReproducir] Error en búsqueda paralela:', err);
    }
  })();
}

function renderStreamingSection(cd){
  const cdLinks = cd.links || {};
  const knownKeys = STREAMING_SERVICES.map(s => s.key);
  const directCount = Object.keys(cdLinks).filter(k => knownKeys.includes(k) && isSafeStreamUrl(cdLinks[k])).length;
  const otherLinks = Object.entries(cdLinks).filter(([k, v]) => !knownKeys.includes(k) && isSafeStreamUrl(v));

  const parts = [];
  if (cd.titulo)     parts.push(`"${cd.titulo}"`);
  if (cd.interprete) parts.push(`"${cd.interprete}"`);
  if (cd.anio)       parts.push(String(cd.anio));
  const q = encodeURIComponent(parts.join(' ').trim());

  const discogsSearch = `https://www.discogs.com/search/?q=${q}&type=release`;
  const SMART_SERVICES = new Set(['spotify', 'youtube', 'apple', 'lastfm']);

  const badge = directCount > 0
    ? `<span class="stream-count">✅ ${directCount} guardado${directCount === 1 ? '' : 's'}</span>`
    : `<span class="stream-count" style="background:rgba(255,169,77,.15);color:var(--warn);border-color:rgba(255,169,77,.4)">🎯 Búsqueda inteligente</span>`;

  const items = STREAMING_SERVICES.map(svc => {
    const direct = cdLinks[svc.key];
    if (direct && isSafeStreamUrl(direct)){
      return `<button type="button" class="stream-btn direct" style="--svc-color:${svc.color}" data-saved-key="${svc.key}" data-url="${esc(direct)}" title="Abrir en ${esc(svc.name)} — mantené presionado para gestionar">
        <span class="si">${esc(svc.icon)}</span><span class="sn">${esc(svc.name)}</span><span class="sx">↗</span>
      </button>`;
    }
    if (svc.key === 'discogs'){
      return `<a href="${esc(discogsSearch)}" target="_blank" rel="noopener" class="stream-btn search" style="--svc-color:${svc.color}" title="Buscar en Discogs">
        <span class="si">${esc(svc.icon)}</span><span class="sn">${esc(svc.name)}</span><span class="sx">🔍</span>
      </a>`;
    }
    if (SMART_SERVICES.has(svc.key)){
      return `<button type="button" class="stream-btn search" style="--svc-color:${svc.color}" data-smart-search="${svc.key}" title="Búsqueda inteligente en ${esc(svc.name)}">
        <span class="si">${esc(svc.icon)}</span><span class="sn">${esc(svc.name)}</span><span class="sx">🎯</span>
      </button>`;
    }
    return '';
  }).join('');

  const othersHTML = otherLinks.length ? `
    <div style="margin-top:12px">
      <div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">🔗 Otros enlaces</div>
      <div class="stream-grid">${otherLinks.filter(([,url]) => isSafeStreamUrl(url)).map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" class="stream-btn direct" style="--svc-color:var(--purple)"><span class="si">🔗</span><span class="sn">${esc(k)}</span><span class="sx">↗</span></a>`).join('')}</div>
    </div>` : '';

  let note = '';
  if (directCount === 0 && !otherLinks.length){
    note = `<div class="stream-hint-note stream-hint-warn">💡 <b style="color:var(--warn)">Sin links guardados.</b> Tocá un servicio 🎯. Te muestro el álbum encontrado y podés <b style="color:var(--accent2)">⭐ Recordar</b> para que la próxima abra directo.</div>`;
  } else if (directCount > 0){
    note = `<div class="stream-hint-note stream-hint-ok">
      💾 <b style="color:var(--ok)">${directCount} link${directCount === 1 ? '' : 's'} guardado${directCount === 1 ? '' : 's'}</b>. Tocá cualquiera y abre directo.
      <div style="margin-top:8px;font-size:.68rem;color:var(--muted);line-height:1.5">🔧 <b>¿Te equivocaste con alguno?</b> Mantené presionado el link guardado (600 ms) para quitarlo.</div>
    </div>`;
  }

  const resetBtn = directCount > 0 ? `<button type="button" id="resetLinksBtn">🔄 Resetear todos los links guardados</button>` : '';

  return `<div class="stream-section">
    <div class="stream-head">
      <span>🎧 Escuchar en ${badge}</span>
      <span class="lock">🔒 Solo streaming</span>
    </div>
    <div class="stream-grid">${items}</div>
    ${othersHTML}
    ${note}
    ${resetBtn}
    <div class="stream-note">✅ <b style="color:var(--ok)">Solo reproducción legal.</b> Este visor <b>no descarga</b> ni aloja contenido.</div>
  </div>`;
}

/* =========================================================================
   [FIN app-core-2-api.js]
   Ahora pegá el contenido de app-core-3-enrich.js justo debajo.
   ========================================================================= */