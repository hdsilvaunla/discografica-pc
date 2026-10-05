/* =========================================================================
   DISCOGRAFÍA v7.0.14 — Last.fm integration
   Búsqueda de álbumes vía Last.fm API + Cover Art Archive (fallback imgs)
   Requiere: app-core.js cargado primero (usa normMatch, matchConfidence, etc.)
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   ========================================================================= */

/* ═══════════════════════════════════════════════════════════════════
   CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════════════
   Obtener API key GRATIS (1 minuto):
   1. Ir a https://www.last.fm/api/account/create
   2. Completar:
      - Application name: Discografía
      - Application description: Gestor personal de colección de CDs
      - Application URL: (dejar vacío)
      - Callback URL: (dejar vacío)
   3. Aceptar términos → Submit
   4. Copiar la API key (32 caracteres hex) y pegarla acá abajo
   ═══════════════════════════════════════════════════════════════════ */
const LASTFM_API_KEY = '';  // ← PEGAR ACÁ (opcional: también se puede configurar desde la UI)
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_CONFIG_KEY = 'discografia_lastfm_config_v1';

function getLastFmConfig(){
  try {
    const fromLS = JSON.parse(localStorage.getItem(LASTFM_CONFIG_KEY) || '{}');
    if (fromLS.apiKey && String(fromLS.apiKey).trim()) return fromLS;
  } catch(e){}
  return { apiKey: LASTFM_API_KEY, updatedAt: null };
}

function getLastFmKey(){
  return String(getLastFmConfig().apiKey || '').trim();
}

function saveLastFmConfig(apiKey){
  const key = String(apiKey || '').trim().replace(/^["']+|["']+$/g, '').replace(/\s+/g, '');
  if (!key){ try { localStorage.removeItem(LASTFM_CONFIG_KEY); } catch(e){} return true; }
  try {
    localStorage.setItem(LASTFM_CONFIG_KEY, JSON.stringify({ apiKey: key, updatedAt: new Date().toISOString() }));
    return true;
  } catch(e){ return false; }
}

function clearLastFmConfig(){ try { localStorage.removeItem(LASTFM_CONFIG_KEY); } catch(e){} }

function lastfmReady(){ return !!getLastFmKey(); }

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function _lastfmClean(str){
  return String(str || '')
    .replace(/[''`´]/g, '')
    .replace(/[&]/g, 'and')
    .replace(/[^\w\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _lastfmFuzzyArtist(a, b){
  if (!a || !b) return false;
  const na = normMatch(a), nb = normMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  const inter = wa.filter(w => wb.includes(w)).length;
  return inter >= 2 || (inter >= 1 && Math.max(wa.length, wb.length) === 1);
}

function _lastfmScoreAlbum(item, targetTitle, targetArtist){
  const name = normMatch(item.name || '');
  const artist = normMatch(item.artist?.name || item.artist || '');
  const nTitle = normMatch(targetTitle || '');
  const nArtist = normMatch(targetArtist || '');
  let s = 0;

  if (!name || !artist) return -1;

  if (nArtist){
    if (artist === nArtist) s += 100;
    else if (artist.includes(nArtist) || nArtist.includes(artist)) s += 50;
    else if (!_lastfmFuzzyArtist(artist, nArtist)) return -1;
    else s += 25;
  }

  if (nTitle){
    if (name === nTitle) s += 100;
    else if (name.includes(nTitle) || nTitle.includes(name)) s += 60;
    else {
      const tw = new Set(name.split(' ').filter(w => w.length > 2));
      const nw = new Set(nTitle.split(' ').filter(w => w.length > 2));
      const inter = [...tw].filter(w => nw.has(w)).length;
      const total = Math.max(tw.size, nw.size) || 1;
      const ratio = inter / total;
      if (ratio >= 0.5) s += 30;
      else return -1;
    }
  }

  if (item.playcount){
    const pc = parseInt(item.playcount, 10) || 0;
    s += Math.min(20, Math.log10(pc + 1) * 4);
  }

  return s;
}

/* ═══════════════════════════════════════════════════════════════════
   API: fetch + búsqueda
   ═══════════════════════════════════════════════════════════════════ */

async function _lastfmFetch(method, params = {}){
  const key = getLastFmKey();
  if (!key) throw new Error('Sin API key de Last.fm');

  const qs = new URLSearchParams({
    method,
    api_key: key,
    format: 'json',
    ...params
  });

  const url = `${LASTFM_API_BASE}?${qs.toString()}`;
  const r = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (data.error){
    throw new Error(`Last.fm: ${data.message || ('error ' + data.error)}`);
  }
  return data;
}

async function enrichFromLastFm(titulo, interprete, hints = {}){
  if (!lastfmReady()) return null;
  const cleanTitle = _lastfmClean(titulo);
  const cleanArtist = _lastfmClean(interprete);
  if (!cleanTitle && !cleanArtist) return null;

  const attempts = [];
  if (cleanArtist && cleanTitle) attempts.push({ method: 'album.search', params: { album: `${cleanArtist} ${cleanTitle}`, limit: 10 } });
  if (cleanTitle) attempts.push({ method: 'album.search', params: { album: cleanTitle, limit: 10 } });
  if (cleanArtist) attempts.push({ method: 'artist.getTopAlbums', params: { artist: cleanArtist, limit: 50, autocorrect: 1 } });

  let candidates = [];
  let lastError = 'no-results';

  for (const att of attempts){
    try {
      if (typeof throttleSource === 'function') await throttleSource('Last.fm').catch(() => {});
      const data = await _lastfmFetch(att.method, att.params);

      if (att.method === 'album.search'){
        const matches = data?.results?.albummatches?.album || [];
        candidates = candidates.concat(matches);
      } else if (att.method === 'artist.getTopAlbums'){
        const albums = data?.topalbums?.album || [];
        candidates = candidates.concat(albums);
      }

      if (candidates.length >= 5) break;
    } catch(e){
      lastError = e.message;
    }
  }

  if (!candidates.length){
    console.warn(`[Last.fm] ❌ "${titulo}" de "${interprete}" → ${lastError}`);
    return null;
  }

  const seen = new Set();
  const unique = [];
  for (const c of candidates){
    const k = c.mbid || `${normMatch(c.artist?.name || c.artist)}|${normMatch(c.name)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }

  const scored = unique
    .map(c => ({ c, s: _lastfmScoreAlbum(c, titulo, interprete) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!scored.length) return null;

  const best = scored[0];
  const item = best.c;

  let portada = null;
  let portadaSource = null;

  if (item.mbid){
    try {
      const caa = await fetchCoverArtFromCAA(item.mbid).catch(() => null);
      if (caa){ portada = caa; portadaSource = 'Cover Art Archive (Last.fm MBID)'; }
    } catch(_){}
  }

  if (!portada && Array.isArray(item.image)){
    const sizes = ['mega', 'extralarge', 'large', 'medium'];
    for (const sz of sizes){
      const url = item.image.find(i => i.size === sz)?.['#text'];
      if (url && url.trim()){
        portada = url; portadaSource = 'Last.fm';
        break;
      }
    }
  }

  let anio = null;
  if (item.wiki?.published){
    const y = parseInt(String(item.wiki.published).slice(-4), 10);
    if (Number.isFinite(y) && y >= 1900 && y <= 2100) anio = y;
  }

  const result = {
    source: 'Last.fm',
    anio,
    anioPrensada: null,
    anioMaster: anio,
    sello: '',
    pais: '',
    catalogo: '',
    genero: item.tags?.tag?.[0]?.name || '',
    mbId: item.mbid || null,
    lastfmUrl: item.url || null,
    portada,
    portadaSource,
    links: item.url ? { lastfm: item.url } : {},
    _title: upper(item.name || titulo),
    _artist: upper(item.artist?.name || item.artist || interprete),
    _strategy: 'lastfm'
  };

  return enrichMeta(result, titulo, interprete, best.s);
}

/* ═══════════════════════════════════════════════════════════════════
   TEST DE CONEXIÓN
   ═══════════════════════════════════════════════════════════════════ */

async function testLastFmConnection(apiKeyOverride = null){
  const key = String(apiKeyOverride ?? getLastFmKey()).trim();
  if (!key) throw new Error('No hay API key configurada');
  const qs = new URLSearchParams({
    method: 'chart.getTopArtists',
    api_key: key,
    format: 'json',
    limit: 1
  });
  const url = `${LASTFM_API_BASE}?${qs.toString()}`;
  const r = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(data.message || `Last.fm error ${data.error}`);
  return { ok: true, artists: data?.artists?.artist?.length || 0 };
}

/* ═══════════════════════════════════════════════════════════════════
   UI: modal de configuración Last.fm
   ═══════════════════════════════════════════════════════════════════ */

function _buildLastFmModal(){
  const modal = document.createElement('div');
  modal.id = 'lastfmConfigModal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '500'; // Asegurar que esté por encima del menú ⚙️
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3><span>🎵</span><span>Configuración de Last.fm</span></h3>
        <button type="button" class="close" id="lastfmConfigClose">✕</button>
      </div>
      <div class="modal-body">
        <div style="padding:12px 14px;border-radius:10px;border-left:4px solid var(--accent);background:rgba(79,195,247,.08);margin-bottom:16px;display:flex;gap:12px;font-size:.85rem;line-height:1.55">
          <span style="font-size:1.4rem;line-height:1">🔑</span>
          <div>
            <b>Last.fm requiere una API key gratuita.</b><br>
            1. Ir a <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener" style="color:var(--accent)">last.fm/api/account/create</a><br>
            2. Completar el formulario (es instantáneo)<br>
            3. Copiar la API key y pegarla abajo
          </div>
        </div>
        <div class="section-label">API Key</div>
        <div class="field">
          <label for="lastfmApiKeyInput">API Key de Last.fm</label>
          <div style="display:flex;gap:8px">
            <input type="password" id="lastfmApiKeyInput" autocomplete="off" spellcheck="false" placeholder="Pegá aquí tu API key (32 caracteres)">
            <button type="button" class="btn" id="lastfmApiKeyToggle">👁️</button>
          </div>
        </div>
        <div id="lastfmStatus" style="margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);font-size:.82rem">⚪ Sin configurar</div>
      </div>
      <div class="modal-foot">
        <div><button type="button" class="btn danger" id="lastfmClear">🗑️ Eliminar key</button></div>
        <div class="right">
          <button type="button" class="btn" id="lastfmConfigCancel">Cancelar</button>
          <button type="button" class="btn primary" id="lastfmTest">🔌 Probar</button>
          <button type="button" class="btn primary" id="lastfmSave">💾 Guardar</button>
        </div>
      </div>
    </div>`;

  const closeModal = () => modal.classList.remove('open');
  modal.querySelector('#lastfmConfigClose').addEventListener('click', closeModal);
  modal.querySelector('#lastfmConfigCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target.id === 'lastfmConfigModal') closeModal(); });

  modal.querySelector('#lastfmApiKeyToggle').addEventListener('click', () => {
    const i = modal.querySelector('#lastfmApiKeyInput');
    i.type = i.type === 'password' ? 'text' : 'password';
  });

  modal.querySelector('#lastfmSave').addEventListener('click', () => {
    const k = modal.querySelector('#lastfmApiKeyInput').value.trim();
    if (saveLastFmConfig(k)){
      updateLastFmStatus('ok', k ? '✅ API key guardada.' : 'Sin configurar.');
      if (typeof Toast !== 'undefined') Toast.show('✅ Last.fm guardado', 'ok', 2500);
    } else {
      updateLastFmStatus('error', 'No se pudo guardar en localStorage.');
    }
  });

  modal.querySelector('#lastfmTest').addEventListener('click', async () => {
    const k = modal.querySelector('#lastfmApiKeyInput').value.trim();
    if (!k){ updateLastFmStatus('error', 'Ingresá la API key primero.'); return; }
    const btn = modal.querySelector('#lastfmTest');
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Probando…';
    updateLastFmStatus('warn', 'Conectando…');
    try {
      await testLastFmConnection(k);
      saveLastFmConfig(k);
      updateLastFmStatus('ok', '✅ API key válida. Guardada.');
      if (typeof Toast !== 'undefined') Toast.show('✅ Last.fm OK', 'ok', 3000);
    } catch(err){
      updateLastFmStatus('error', '🔴 ' + err.message);
      if (typeof Toast !== 'undefined') Toast.show('❌ ' + err.message, 'err', 4000);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });

  modal.querySelector('#lastfmClear').addEventListener('click', () => {
    if (!confirm('¿Eliminar la API key de Last.fm?')) return;
    clearLastFmConfig();
    modal.querySelector('#lastfmApiKeyInput').value = '';
    updateLastFmStatus('idle', 'Eliminado.');
    if (typeof Toast !== 'undefined') Toast.show('Key eliminada', 'warn', 2500);
  });

  document.body.appendChild(modal);
  return modal;
}

function openLastFmConfig(){
  try {
    let modal = document.getElementById('lastfmConfigModal');
    if (!modal){
      modal = _buildLastFmModal();
    }

    // Pre-cargar la key actual
    const config = getLastFmConfig();
    const input = modal.querySelector('#lastfmApiKeyInput');
    if (input) input.value = config.apiKey || '';

    updateLastFmStatus(
      config.apiKey ? 'warn' : 'idle',
      config.apiKey ? '✅ API key guardada.' : 'Sin configurar.'
    );

    modal.classList.add('open');
    console.log('[Last.fm] ✓ Modal de configuración abierto');
  } catch(err){
    console.error('[Last.fm] Error abriendo modal:', err);
    if (typeof Toast !== 'undefined') Toast.show('❌ Error abriendo configuración: ' + err.message, 'err', 5000);
  }
}

function updateLastFmStatus(kind, text){
  const el = document.getElementById('lastfmStatus');
  if (!el) return;
  const icons = { ok: '🟢', warn: '🟠', error: '🔴', idle: '⚪' };
  el.innerHTML = `${icons[kind] || icons.idle} ${text}`;
}

/* ═══════════════════════════════════════════════════════════════════
   v7.0.14-FIX: se elimina el auto-bind defensivo para evitar el doble
   handler. El binding del botón `data-act="lastfm-config"` es
   responsabilidad EXCLUSIVA de app-ui-4-init.js.
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Exponer funciones en window para debugging
   ═══════════════════════════════════════════════════════════════════ */
if (typeof window !== 'undefined'){
  window.openLastFmConfig = openLastFmConfig;
  window.enrichFromLastFm = enrichFromLastFm;
  window.testLastFmConnection = testLastFmConnection;
  window.lastfmReady = lastfmReady;
  window.getLastFmKey = getLastFmKey;
  window.saveLastFmConfig = saveLastFmConfig;
  window.clearLastFmConfig = clearLastFmConfig;
}

/* ═══════════════════════════════════════════════════════════════════
   FIN lastfm.js v7.0.14
   ═══════════════════════════════════════════════════════════════════ */