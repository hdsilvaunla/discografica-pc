/* =========================================================================
   DISCOGRAFÍA v7.0.14 — Core Parte 3/3: Enriquecimiento, Bulk, Legal,
   NotFound, Red, Carpetas, Lightbox
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   Depende de: app-core-1-base.js, app-core-2-api.js, lastfm.js
   =========================================================================
   [PARTE 3/3] INICIO
   ========================================================================= */

async function firmarAceptacionLegal(){
  const payload = `v${APP_VERSION}|${Date.now()}|${navigator.userAgent}|${location.origin}`;
  try {
    if (crypto?.subtle?.digest){
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
  } catch(e){}
  let h = 0;
  const s = `v${APP_VERSION}|${Date.now()}|${navigator.userAgent}`;
  for (let i = 0; i < s.length; i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
  return 'fallback_' + Math.abs(h).toString(16);
}

function buildLegalBodyHTML(){
  const sig = (() => { try { return JSON.parse(localStorage.getItem(LEGAL_SIGNATURE_KEY) || 'null'); } catch(e){ return null; } })();
  const accepted = localStorage.getItem(LEGAL_NOTICE_KEY) === '1';
  const acceptedLine = (accepted && sig)
    ? `<div class="lg-sig"><b>Aceptado:</b> ${esc(sig.acceptedAt || '—')}<br><b>Firma SHA-256:</b> ${esc(sig.hash || '—')}<br><b>Versión:</b> ${esc(sig.version || APP_VERSION)}</div>` : '';
  return `
    <div class="legal-hero">
      <span class="lh-icon">⚖️</span>
      <div>
        <h3>Información importante sobre el uso de la app</h3>
        <p>Discografía v${APP_VERSION} es una herramienta de catalogación personal.</p>
      </div>
    </div>
    <div class="lg-box yes"><b>✅ Lo que SÍ hace</b><ul>
      <li>Abre el reproductor oficial del servicio elegido.</li>
      <li>Pre-carga la búsqueda del álbum.</li>
      <li>Usa APIs públicas (iTunes Search, MusicBrainz; Odesli si disponible).</li>
      <li>Guarda localmente el link directo si el usuario lo confirma.</li>
    </ul></div>
    <div class="lg-box no"><b>❌ Lo que NO hace</b><ul>
      <li>NO descarga audio ni video.</li>
      <li>NO reproduce contenido de forma no autorizada.</li>
      <li>NO evade DRM ni extrae streams.</li>
      <li>NO comparte tu colección con terceros.</li>
    </ul></div>
    <div class="lg-box info"><b>🛡️ Whitelist de dominios</b>
      <ul>${ALLOWED_STREAM_DOMAINS.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </div>
    <label class="lg-check">
      <input type="checkbox" id="legalAcepto">
      <span>He leído y acepto los términos. Entiendo que la app <b>NO descarga contenido</b>.</span>
    </label>
    ${acceptedLine}
  `;
}

function openLegalModal(){
  const m = $("#legalModal");
  const body = $("#legalBody");
  if (!m || !body) return;
  body.innerHTML = buildLegalBodyHTML();
  const chk = $("#legalAcepto");
  const btn = $("#legalAceptar");
  if (chk && btn){
    chk.checked = false;
    btn.disabled = true;
    btn.style.opacity = '.45';
    btn.style.cursor = 'not-allowed';
    if (chk._legalHandler){ try { chk.removeEventListener('change', chk._legalHandler); } catch(_){} chk._legalHandler = null; }
    const handler = () => {
      btn.disabled = !chk.checked;
      btn.style.opacity = chk.checked ? '1' : '.45';
      btn.style.cursor = chk.checked ? 'pointer' : 'not-allowed';
    };
    chk.addEventListener('change', handler);
    chk._legalHandler = handler;
  }
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLegalModal(){
  const chk = $("#legalAcepto");
  if (chk && chk._legalHandler){ try { chk.removeEventListener('change', chk._legalHandler); } catch(_){} chk._legalHandler = null; }
  $("#legalModal")?.classList.remove('open');
  document.body.style.overflow = '';
}

async function aceptarLegal(){
  const chk = $("#legalAcepto");
  if (chk && !chk.checked){ Toast.show('⚠️ Marcá la casilla primero', 'warn', 3000); return; }
  const hash = await firmarAceptacionLegal();
  try {
    localStorage.setItem(LEGAL_NOTICE_KEY, '1');
    localStorage.setItem(LEGAL_SIGNATURE_KEY, JSON.stringify({
      hash, version: APP_VERSION,
      acceptedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      origin: location.origin
    }));
  } catch(e){}
  closeLegalModal();
  HistoryLog.log('INFO', 'Aviso legal aceptado', `Firma: ${hash.slice(0,16)}…`);
  Toast.show(`✅ Aviso aceptado · Firma: ${hash.slice(0,12)}…`, 'ok', 3500);
}

function exportLegalPDF(){
  const sig = (() => { try { return JSON.parse(localStorage.getItem(LEGAL_SIGNATURE_KEY) || 'null'); } catch(e){ return null; } })();
  const o = OwnerConfig.get();
  const now = new Date().toLocaleString('es-AR');
  const win = window.open('', '_blank');
  if (!win){ Toast.show('Permitir popups', 'warn', 5000); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Aviso legal — Discografía v${APP_VERSION}</title>
  <style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Roboto,sans-serif;color:#1a2332;line-height:1.6;padding:24px;font-size:11pt}h1{margin:0 0 6px;font-size:20pt;color:#1976d2}h2{margin:22px 0 10px;font-size:13pt;color:#333;border-bottom:2px solid #1976d2;padding-bottom:6px}.meta{font-size:9pt;color:#666;margin-bottom:20px}ul{padding-left:22px;margin:8px 0}li{margin:5px 0}.box{padding:12px 14px;border-radius:8px;margin:12px 0;font-size:10.5pt}.yes{background:#e8f5e9;border-left:4px solid #2ea043}.no{background:#ffebee;border-left:4px solid #d32f2f}.info{background:#e3f2fd;border-left:4px solid #1976d2}.sig{font-family:ui-monospace,Menlo,monospace;font-size:8.5pt;background:#f5f7fa;padding:12px;border-radius:6px;word-break:break-all;margin-top:14px}.foot{margin-top:40px;padding-top:14px;border-top:1px solid #ddd;font-size:9pt;color:#888;text-align:center}@media print{body{padding:0}}</style></head><body>
  <h1>⚖️ Aviso legal — Discografía v${APP_VERSION}</h1>
  <div class="meta">Generado: ${esc(now)} · ${esc(o.name || DEFAULT_AUTHOR)} · ${esc(OwnerConfig.contactLine() || DEFAULT_PHONE)}</div>
  <h2>1. Qué es</h2><p>Herramienta de catalogación personal de CDs.</p>
  <h2>2. Lo que SÍ hace</h2><div class="box yes"><ul><li>Abre el reproductor oficial.</li><li>Usa APIs públicas.</li></ul></div>
  <h2>3. Lo que NO hace</h2><div class="box no"><ul><li>NO descarga audio.</li><li>NO evade DRM.</li><li>NO sube datos a servidores propios.</li></ul></div>
  <h2>4. Whitelist</h2><div class="box info"><ul>${ALLOWED_STREAM_DOMAINS.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
  ${sig ? `<h2>5. Firma SHA-256</h2><div class="sig"><b>Hash:</b> ${esc(sig.hash || '—')}<br><b>Fecha:</b> ${esc(sig.acceptedAt || '—')}</div>` : ''}
  <div class="foot">Discografía v${APP_VERSION} — ${esc(o.name || DEFAULT_AUTHOR)} — ${esc(COPYRIGHT_TEXT)}</div>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  win.document.close();
  HistoryLog.log('EXPORT', 'Aviso legal exportado a PDF');
}

function maybeShowLegalOnFirstRun(){
  if (localStorage.getItem(LEGAL_NOTICE_KEY) === '1') return;
  setTimeout(() => { if (!isAnyModalOpen()) openLegalModal(); }, 1500);
}

/* ─── MusicBrainz ─── */
async function enrichFromMusicBrainz(titulo, interprete, hints = {}){
  if (!titulo || !interprete) return null;
  const waitMs = _mb503Until - Date.now();
  if (waitMs > 0){ _lastCallBySource.MusicBrainz = 0; throw new Error('COOLDOWN'); }

  const tituloLimpio = limpiarTituloParaBusqueda(titulo);
  const interpreteLimpio = limpiarInterpreteParaBusqueda(interprete);

  const strategies = [
    { name: 'exacta',        query: `release:"${titulo}" AND artist:"${interprete}"` },
    { name: 'limpia',        query: `release:"${tituloLimpio}" AND artist:"${interpreteLimpio}"` },
    { name: 'sin-comillas',  query: `release:${tituloLimpio} AND artist:${interpreteLimpio}` },
    { name: 'solo-titulo',   query: `release:"${tituloLimpio}"` }
  ];
  const seen = new Set();
  const uniqueStrategies = strategies.filter(s => { if (seen.has(s.query)) return false; seen.add(s.query); return true; });

  let lastError = 'no-results';
  for (const strat of uniqueStrategies){
    try {
      await throttleSource("MusicBrainz");
      const q = encodeURIComponent(strat.query);
      const res = await fetchWithTimeout(`${MB_API}release?query=${q}&fmt=json&limit=10&inc=release-groups`, { headers: { 'User-Agent': MB_USER_AGENT } });
      if (res.status === 503){ _mb503Until = Date.now() + 60000; console.warn(`[MB] ❄️ 503 — enfriando 60s`); throw new Error('COOLDOWN'); }
      if (res.status === 429){ const ra = parseInt(res.headers.get('Retry-After') || '60'); _mb503Until = Date.now() + Math.max(60000, ra * 1000); throw new Error('COOLDOWN'); }
      if (!res.ok){ lastError = 'HTTP ' + res.status; continue; }
      const d = await res.json();
      if (!d.releases?.length){ lastError = 'no-results'; continue; }

      const añosH = hints.anio ? parseInt(hints.anio) : null;
      const ranked = d.releases.map(r => {
        const ct = r.title;
        const ca = (r["artist-credit"] || []).map(x => x.name || x.artist?.name).join(" ");
        let sc = matchConfidence(tituloLimpio, interpreteLimpio, { title: ct, artist: ca });
        const rgd = r['release-group']?.['first-release-date'];
        if (añosH && rgd){ const y = parseInt(String(rgd).slice(0, 4), 10); if (Number.isFinite(y) && Math.abs(y - añosH) <= 1) sc = Math.min(100, sc + 8); }
        if (Array.isArray(r.format) && r.format.some(f => /cd/i.test(f))) sc = Math.min(100, sc + 3);
        const rgTitle = r['release-group']?.title || '';
        if (rgTitle && normMatch(rgTitle) === normMatch(tituloLimpio)) sc = Math.min(100, sc + 15);
        return { r, ct, ca, sc };
      }).sort((a, b) => b.sc - a.sc);

      if (!ranked.length || ranked[0].sc < 40){ lastError = 'low-confidence'; continue; }

      let best = null, coverUrl = null, externalLinks = {};
      for (const c of ranked.slice(0, 3)){
        const [cc, lk] = await Promise.all([fetchCoverArtFromCAA(c.r.id), fetchExternalLinks(c.r.id)]);
        if (cc){ best = c; coverUrl = cc; externalLinks = lk; break; }
        if (!best){ best = c; externalLinks = lk; }
      }
      if (!best){ lastError = 'no-cover'; continue; }

      const r = best.r;
      let anio = null;
      const rgDate = r['release-group']?.['first-release-date'];
      if (rgDate) anio = normalizeYear(String(rgDate).slice(0, 4));
      if (!anio && r.date) anio = normalizeYear(String(r.date).slice(0, 4));
      if (!anio && Array.isArray(r['release-events']) && r['release-events'][0]?.date){ anio = normalizeYear(String(r['release-events'][0].date).slice(0, 4)); }
      const anioPrensada = normalizeYear(r.date ? String(r.date).slice(0, 4) : null);

      console.log(`[MB] ✅ "${strat.name}" → ${best.ct} — ${best.ca} (score ${best.sc})`);
      return enrichMeta({
        source: "MusicBrainz", anio, anioPrensada, anioMaster: anio,
        sello: r['label-info']?.[0]?.label?.name || '', pais: r.country || '',
        catalogo: r['label-info']?.[0]?.['catalog-number'] || '',
        genero: r['release-group']?.genres?.[0]?.name || r.genres?.[0]?.name || r.tags?.[0]?.name || '',
        mbId: r.id, releaseGroupId: r['release-group']?.id || null,
        portada: coverUrl, portadaSource: coverUrl ? "MusicBrainz CAA" : null,
        links: externalLinks,
        _title: upper(best.ct), _artist: upper(best.ca),
        _strategy: strat.name
      }, titulo, interprete, best.sc);
    } catch(err){
      if (err.message === 'COOLDOWN') throw err;
      lastError = err.message;
    }
  }
  console.warn(`[MB] ❌ "${titulo}" de "${interprete}" → ${lastError}`);
  return null;
}

/* ─── Discogs ─── */
async function enrichFromDiscogs(titulo, interprete, hints = {}){
  if (!getDiscogsToken()) return null;
  if (!titulo && !interprete && !hints.barcode) return null;
  const waitMs = _discogs429Until - Date.now();
  if (waitMs > 0){ _lastCallBySource.Discogs = 0; throw new Error('COOLDOWN'); }

  const tituloLimpio = limpiarTituloParaBusqueda(titulo);
  const interpreteLimpio = limpiarInterpreteParaBusqueda(interprete);
  const tituloParaQuery = tituloLimpio || titulo;
  const interpreteParaQuery = interpreteLimpio || interprete;

  const añosH  = hints.anio ? parseInt(hints.anio) : null;
  const paísH  = (hints.pais     || '').trim().toLowerCase();
  const selloH = (hints.sello    || '').trim().toLowerCase();
  const catH   = (hints.catalogo || '').trim().toLowerCase();
  const bcClean = hints.barcode ? String(hints.barcode).replace(/\s+/g,'') : '';
  let results = [];
  try {
    if (bcClean){
      await throttleSource("Discogs");
      const params = new URLSearchParams({ barcode: bcClean, type: 'release', per_page: '10' });
      const res = await fetchDiscogs(`${DISCOGS_API}/database/search?${params.toString()}`);
      if (res.status === 429){ const ra = parseInt(res.headers.get('Retry-After') || '60'); _discogs429Until = Date.now() + Math.max(30000, ra*1000); throw new Error('COOLDOWN'); }
      if (res.ok){ const d = await res.json(); if (d.results?.length) results = d.results; }
    }
    if (!results.length && tituloParaQuery && interpreteParaQuery){
      await throttleSource("Discogs");
      const params = new URLSearchParams({ artist: interpreteParaQuery, release_title: tituloParaQuery, type: 'release', per_page: '10' });
      const res = await fetchDiscogs(`${DISCOGS_API}/database/search?${params.toString()}`);
      if (res.status === 429){ const ra = parseInt(res.headers.get('Retry-After') || '60'); _discogs429Until = Date.now() + Math.max(30000, ra*1000); throw new Error('COOLDOWN'); }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      if (d.results?.length) results = d.results;
    }
    if (!results.length) return null;
    const ranked = results.map(r => {
      const rt = String(r.title || '');
      const sep = rt.includes(' – ') ? ' – ' : ' - ';
      const parts = rt.split(sep);
      const ca = parts.length > 1 ? parts[0].trim() : '';
      const ct = parts.length > 1 ? cleanDiscogsTitle(parts.slice(1).join(sep)) : cleanDiscogsTitle(rt);
      const bs = matchConfidence(tituloLimpio || ct, interpreteLimpio || ca, { title: ct, artist: ca || interpreteLimpio });
      let bonus = 0;
      if (añosH && r.year && Math.abs(parseInt(r.year) - añosH) <= 1) bonus += 8;
      if (paísH && r.country && normMatch(r.country).includes(normMatch(paísH))) bonus += 5;
      if (selloH && Array.isArray(r.label) && r.label.some(l => normMatch(l).includes(normMatch(selloH)))) bonus += 8;
      if (catH && r.catno && normMatch(r.catno).includes(normMatch(catH))) bonus += 15;
      if (Array.isArray(r.format) && r.format.some(f => /cd/i.test(f))) bonus += 3;
      if (bcClean && r.barcode && String(r.barcode).replace(/\s+/g,'') === bcClean) bonus += 25;
      const hc = (r.cover_image && !r.cover_image.includes('spacer.gif')) || (r.thumb && !r.thumb.includes('spacer.gif'));
      if (hc) bonus += 6;
      return { r, ct, ca, score: Math.min(100, bs + bonus), hc };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.hc !== b.hc) return b.hc ? 1 : -1;
      return 0;
    });
    const best = ranked[0];
    if (!best || Number(best.score || 0) < 70) return null;
    const r = best.r;
    let portada = null;
    if (r.cover_image && !r.cover_image.includes('spacer.gif')) portada = r.cover_image;
    else if (r.thumb && !r.thumb.includes('spacer.gif')) portada = r.thumb;
    let anioSearch = normalizeYear(r.year);
    let masterYear = null;
    if (r.master_id){ const master = await fetchDiscogsMasterDetails(r.master_id); if (master){ if (master.year) masterYear = master.year; if (!portada && master.cover) portada = master.cover; } }
    if (masterYear) anioSearch = masterYear;
    if (!portada || !anioSearch){ const det = await fetchDiscogsReleaseDetails(r.id); if (det){ if (!portada) portada = det.cover; if (!anioSearch) anioSearch = det.year; } }
    anioSearch = normalizeYear(anioSearch);
    return enrichMeta({
      source: 'Discogs', anio: anioSearch, anioPrensada: normalizeYear(r.year), anioMaster: masterYear,
      sello: upper(Array.isArray(r.label) ? (r.label[0] || '') : ''), pais: upper(r.country || ''),
      catalogo: upper(r.catno || ''), genero: upper(Array.isArray(r.genre) ? (r.genre[0] || '') : ''),
      discogsId: r.id, discogsMasterId: r.master_id || null,
      discogsUrl: r.uri ? `https://www.discogs.com${r.uri}` : null,
      portada, portadaSource: portada ? 'Discogs' : null,
      links: r.uri ? { discogs: `https://www.discogs.com${r.uri}` } : {},
      _title: upper(best.ct), _artist: upper(best.ca || interprete),
      _strategy: 'discogs-search'
    }, titulo || best.ct, interprete || best.ca, best.score);
  } catch(err){
    if (err.message === 'COOLDOWN') throw err;
    console.warn('[Discogs]', err.message);
    return null;
  }
}

/* ─── Cadena de enriquecimiento ─── */
async function enrichFromChain(titulo, interprete, options = {}){
  const { onSource = null, useSources = null, minConfidence = 70, useCache = true, hints = {}, prioridad = 'discogs' } = options;
  const cy = hints.anio || "";
  if (useCache){
    /* v7.0.14-NOTA: el caché exige que exista portada. Si querés permitir
       cachear sin portada, cambiá `if (c && c.portada)` por `if (c)`. */
    const c = MetadataCache.get(titulo, interprete, cy);
    if (c && c.portada){ if (onSource){ ["Discogs","MusicBrainz","Last.fm"].forEach(s => onSource(s, s === c.source ? "ok" : "skipped")); } return { ...c, _fromCache: true }; }
  }
  const hT = !!getDiscogsToken();
  const hL = (typeof lastfmReady === 'function') && lastfmReady();
  const allSources = [
    { name: "Discogs",      fn: (t,i,h) => enrichFromDiscogs(t,i,h),      enabled: hT },
    { name: "MusicBrainz",  fn: (t,i,h) => enrichFromMusicBrainz(t,i,h),  enabled: true },
    { name: "Last.fm",      fn: (t,i,h) => (typeof enrichFromLastFm === 'function') ? enrichFromLastFm(t,i,h) : null, enabled: hL }
  ];
  let ordered;
  if (prioridad === 'musicbrainz'){ ordered = [allSources[1], allSources[0], allSources[2]]; }
  else if (prioridad === 'lastfm'){ ordered = [allSources[2], allSources[0], allSources[1]]; }
  else { ordered = [allSources[0], allSources[1], allSources[2]]; }
  const sources = ordered.filter(s => s.enabled && (!useSources || useSources.includes(s.name)));
  if (onSource) allSources.filter(s => !s.enabled).forEach(s => onSource(s.name, "skipped"));
  let best = null;
  for (const s of sources){
    if (onSource) onSource(s.name, "querying");
    let info = null;
    try { info = await s.fn(titulo, interprete, hints); }
    catch(err){
      if (err.message === 'COOLDOWN'){ if (onSource) onSource(s.name, "skipped"); continue; }
      if (onSource) onSource(s.name, "fail");
      continue;
    }
    if (info){
      verificarFechaEmision(info, hints.anio);
      if (onSource) onSource(s.name, "ok");
      if (!best || Number(info.confidence || 0) > Number(best.confidence || 0)) best = info;
      if (Number(info.confidence || 0) >= 95 && info.portada) break;
      if (best && best.portada && Number(best.confidence || 0) >= 85) break;
    } else if (onSource) onSource(s.name, "fail");
    await new Promise(r => setTimeout(r, 200));
  }
  if (best && Number(best.confidence || 0) < minConfidence) return null;
  if (best && useCache) MetadataCache.set(titulo, interprete, cy, best);
  return best;
}

function showEnrichBar(msg, active = true){ const b = $("#enrichBar"); if (!b) return; b.style.display = "flex"; b.classList.toggle("active", active); $("#enrichMsg").textContent = msg; }
function showEnrichResult(txt, src){ const b = $("#enrichBar"); if (!b) return; b.style.display = "flex"; b.classList.remove("active"); $("#enrichMsg").textContent = src ? `✓ Encontrado en ${src}` : "✓ Info encontrada"; $("#enrichResult").innerHTML = txt; setTimeout(() => b.style.display = "none", 3500); }
function showEnrichSources(states){
  const c = $("#enrichSources"); if (!c) return;
  const s = Object.keys(states);
  if (!s.length){ c.style.display = "none"; c.innerHTML = ""; return; }
  c.style.display = "flex";
  c.innerHTML = `<span class="label">Fuentes:</span>` + s.map(n => {
    const st = states[n] || "";
    const cl = st === "ok" ? "chip ok" : st === "querying" ? "chip querying" : st === "skipped" ? "chip skipped" : st === "fail" ? "chip fail" : "chip";
    return `<span class="${cl}"><span class="dot"></span>${n}</span>`;
  }).join("");
}
function renderCoverPreview(url, source){
  const img = $("#coverPreviewImg"), info = $("#coverPreviewSource"), clr = $("#btnClearCover");
  if (!img || !info) return;
  if (!url){ img.innerHTML = `<div class="cover-empty">💿</div>`; info.textContent = "Sin portada"; if (clr) clr.style.display = "none"; return; }
  img.innerHTML = `<img src="${esc(url)}" alt="Portada" loading="lazy">`;
  info.innerHTML = `<code>${esc(url.slice(0, 45))}${url.length > 45 ? "…" : ""}</code>${source ? `<br><b>${esc(source)}</b>` : ""}`;
  if (clr) clr.style.display = "";
}
async function fetchCoverManually(){
  const t = $("#fTitulo").value.trim(), i = $("#fInterprete").value.trim();
  if (!t || !i){ Toast.show("Completá título e intérprete", "warn"); return; }
  const btn = $("#btnFetchCover"); const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner-xs"></span> Buscando…`;
  const states = {};
  try {
    const info = await enrichFromChain(t, i, { hints: { anio: $("#fAnio")?.value, pais: $("#fPais")?.value, sello: $("#fSello")?.value, catalogo: $("#fCatalogo")?.value, barcode: $("#fCodigo")?.value }, useCache: false, onSource: (n, s) => {
      if (s === 'querying'){ states[n] = 'querying'; showEnrichBar(`Buscando en ${n}…`); } else { states[n] = s === 'ok' ? 'ok' : s === 'skipped' ? 'skipped' : 'fail'; }
      showEnrichSources(states);
    }});
    if (info && info.portada){
      $("#fCoverUrl").value = info.portada;
      $("#fCoverUrl").dataset.enrichmentSource = info.source || "";
      $("#fCoverUrl").dataset.enrichmentConfidence = info.confidence ?? "";
      $("#fCoverUrl").dataset.enrichedAt = info.enrichedAt || "";
      renderCoverPreview(info.portada, info.portadaSource);
      showEnrichBar(`✓ Portada en ${info.source}`);
    } else showEnrichBar("Sin portada");
    setTimeout(() => { $("#enrichBar").style.display = "none"; $("#enrichSources").style.display = "none"; }, 2500);
  } finally { btn.disabled = false; btn.innerHTML = orig; }
}

let _enrichTimer = null, _enrichRequestId = 0;
function scheduleEnrichment(delay = 750){ if (_enrichTimer) clearTimeout(_enrichTimer); _enrichTimer = setTimeout(() => { _enrichTimer = null; autoEnrich(); }, delay); }
async function autoEnrich(){
  const tg = $("#enrichToggle"); if (!tg || !tg.checked) return;
  const t = $("#fTitulo").value.trim(), i = $("#fInterprete").value.trim();
  if (!t || !i) return;
  const myId = ++_enrichRequestId;
  const rc = $("#replaceToggle"); const re = rc ? rc.checked : Store.getPref("replaceOnEnrich", true);
  showEnrichBar("Buscando…"); const states = {};
  const info = await enrichFromChain(t, i, { hints: { anio: $("#fAnio")?.value, pais: $("#fPais")?.value, sello: $("#fSello")?.value, catalogo: $("#fCatalogo")?.value, barcode: $("#fCodigo")?.value }, onSource: (n, s) => {
    if (s === 'querying'){ states[n] = 'querying'; showEnrichBar(`Consultando ${n}…`); } else { states[n] = s === 'ok' ? 'ok' : s === 'skipped' ? 'skipped' : 'fail'; }
    showEnrichSources(states);
  }});
  if (myId !== _enrichRequestId) return;
  if (!info){ showEnrichBar("Sin datos"); setTimeout(() => { $("#enrichBar").style.display = "none"; $("#enrichSources").style.display = "none"; }, 2500); return; }
  const campos = [], reps = [];
  const cv = s => String($(s)?.value ?? "").trim();
  function ap(sel, nv, l){
    if (nv === null || nv === undefined || nv === "") return;
    const ov = cv(sel);
    if (re){ if (ov && ov !== String(nv)) reps.push(`${l}: ${ov} → ${nv}`); $(sel).value = nv; campos.push(l); }
    else if (!ov){ $(sel).value = nv; campos.push(l); }
  }
  (function(){
    const anioAlbumActual = parseInt(cv("#fAnio")) || null;
    const anioApi = info.anio;
    if (anioApi && anioAlbumActual && (anioApi - anioAlbumActual) > 5){
      const anioEdActual = parseInt(cv("#fAnioEdicion")) || null;
      if (re || !anioEdActual){
        if (anioEdActual !== anioApi){ $("#fAnioEdicion").value = anioApi; campos.push("📅 Año edición"); }
      }
    } else { ap("#fAnio", anioApi, "Año álbum"); }
  })();
  ap("#fSello", upper(info.sello), "Sello");
  ap("#fGenero", upper(info.genero), "Género");
  ap("#fPais", upper(info.pais), "País");
  ap("#fCatalogo", upper(info.catalogo), "Catálogo");
  if (info._title){
    const nuevo = corregirCampo(cv("#fTitulo"), upper(info._title), info.confidence, re);
    if (nuevo && nuevo !== cv("#fTitulo")){ reps.push(`Título: "${cv("#fTitulo")}" → "${nuevo}"`); $("#fTitulo").value = upper(nuevo); campos.push("🎵 Título"); }
  }
  if (info._artist){
    const nuevo = corregirCampo(cv("#fInterprete"), upper(info._artist), info.confidence, re);
    if (nuevo && nuevo !== cv("#fInterprete")){ reps.push(`Intérprete: "${cv("#fInterprete")}" → "${nuevo}"`); $("#fInterprete").value = upper(nuevo); campos.push("🎤 Intérprete"); }
  }
  if (info.portada){
    const oc = cv("#fCoverUrl");
    if (re || !oc){
      if (oc && oc !== info.portada) reps.push("Portada reemplazada");
      $("#fCoverUrl").value = info.portada;
      $("#fCoverUrl").dataset.enrichmentSource = info.source || "";
      $("#fCoverUrl").dataset.enrichmentConfidence = info.confidence ?? "";
      $("#fCoverUrl").dataset.enrichedAt = info.enrichedAt || "";
      renderCoverPreview(info.portada, info.portadaSource);
      campos.push("🖼️ Portada");
    }
  }
  if (info.links && Object.keys(info.links).length){
    const actuales = (() => { try { return JSON.parse($("#fLinks").value || '{}'); } catch(e){ return {}; } })();
    const merged = re ? { ...actuales, ...info.links } : { ...info.links, ...actuales };
    $("#fLinks").value = JSON.stringify(merged);
    campos.push("🎧 Links streaming");
  }
  showEnrichSources(states);
  if (reps.length) Toast.show(`🔄 ${reps.join(" · ")}`, "info", 5500);
  if (campos.length) showEnrichResult(campos.join(" · ") + " " + confidenceChip(info.confidence), info.source);
  else { showEnrichBar(`Sin campos nuevos`); setTimeout(() => { $("#enrichBar").style.display = "none"; $("#enrichSources").style.display = "none"; }, 2500); }
}

/* ─── Bulk Enrich ─── */
const BulkEnrich = (() => {
  let running = false, cancelled = false;
  let stats = { total: 0, ok: 0, skip: 0, fail: 0, fields: 0, covers: 0, cached: 0, links: 0, requeued: 0 };
  let items = [], requeueIdx = [], sourceStats = {}, notFoundInRun = [];

  function log(icon, cls, title, detail){
    const el = $("#bulkLog"); if (!el) return;
    const e = document.createElement("div"); e.className = "log-entry";
    e.innerHTML = `<span class="log-icon">${icon}</span><span class="log-${cls}"><span class="log-title">${esc(title)}</span>${detail ? ` <span class="log-detail">— ${esc(detail)}</span>` : ""}</span>`;
    el.appendChild(e); el.scrollTop = el.scrollHeight;
  }
  function updateSourcesViz(states){
    const el = $("#bulkSourcesViz"); if (!el) return;
    el.innerHTML = ["Discogs","MusicBrainz","Last.fm"].map(s => {
      const st = states[s] || "";
      const cl = st === "ok" ? "sv-chip ok" : st === "querying" ? "sv-chip querying" : st === "skipped" ? "sv-chip skipped" : st === "fail" ? "sv-chip fail" : "sv-chip";
      return `<span class="${cl}"><span class="sv-dot"></span>${s}</span>`;
    }).join("");
  }
  function updateRequeueBadge(){
    const el = $("#bulkRequeue"); if (!el) return;
    if (requeueIdx.length > 0) el.innerHTML = `<span class="requeue-badge">🔁 ${requeueIdx.length} re-encolados</span>`;
    else el.innerHTML = '';
  }
  function reset(){
    running = false; cancelled = false;
    stats = { total: 0, ok: 0, skip: 0, fail: 0, fields: 0, covers: 0, cached: 0, links: 0, requeued: 0 };
    items = []; requeueIdx = []; sourceStats = {}; notFoundInRun = [];
    $("#bulkLog").innerHTML = ""; $("#bulkBar").style.width = "0%"; $("#bulkCurrent").textContent = "0"; $("#bulkTotal").textContent = "0";
    $("#bulkEta").textContent = ""; $("#bulkSourcesViz").innerHTML = "";
    $("#bulkEnrichConfig").style.display = "";
    $("#bulkEnrichProgress").style.display = "none";
    $("#bulkEnrichSummary").style.display = "none";
    $("#bulkEnrichStart").style.display = ""; $("#bulkEnrichStart").disabled = false;
    $("#bulkEnrichStop").style.display = "none"; $("#bulkEnrichStop").disabled = false;
    $("#bulkEnrichStop").textContent = "⏹️ Detener";
    $("#bulkNotFoundActions").style.display = "none";
    const rq = $("#bulkRequeue"); if (rq) rq.innerHTML = '';
  }
  function getFields(){ return { anio: $("#optAnio")?.checked, anioEdicion: $("#optAnioEdicion")?.checked, sello: $("#optSello")?.checked, genero: $("#optGenero")?.checked, pais: $("#optPais")?.checked, catalogo: $("#optCatalogo")?.checked, portada: $("#optPortada")?.checked, links: $("#optLinks")?.checked }; }
  function activeSources(){
    const s = [];
    if ($("#srcDiscogs")?.checked && getDiscogsToken()) s.push("Discogs");
    if ($("#srcMB")?.checked) s.push("MusicBrainz");
    if ($("#srcLastFm")?.checked && (typeof lastfmReady === 'function') && lastfmReady()) s.push("Last.fm");
    return s;
  }
  function needs(cd, f){ if (f.anio && !cd.anio) return true; if (f.anioEdicion && !cd.anioEdicion) return true; if (f.sello && !cd.sello) return true; if (f.genero && !cd.genero) return true; if (f.pais && !cd.pais) return true; if (f.catalogo && !cd.catalogo) return true; if (f.portada && !cd.portada) return true; if (f.links && (!cd.links || !Object.keys(cd.links).length)) return true; return false; }
  function isVarious(cd){ const i = norm(cd.interprete); return i.includes("various") || i.includes("varios") || i.includes("vv.aa") || i.includes("vv aa") || i === ""; }
  function computeItems(){
    const f = getFields();
    const scope = document.querySelector('input[name="scope"]:checked')?.value || "incomplete";
    const forceAll = scope === "all-force";
    const sd = forceAll ? false : ($("#optSkipDone")?.checked !== false);
    const sv = $("#optSkipVarious")?.checked !== false;
    let src = [];
    if (scope === "category"){ if (App.cat && App.cat !== ALL_CATS) src = Store.getCDs(App.cat).map(cd => ({ cd, cat: App.cat })); else for (const k of Store.catKeys()) for (const cd of Store.getCDs(k)) src.push({ cd, cat: k }); }
    else { for (const k of Store.catKeys()) for (const cd of Store.getCDs(k)) src.push({ cd, cat: k }); }
    items = src.filter(({cd}) => { if (sv && isVarious(cd)) return false; if (!forceAll && sd && !needs(cd, f)) return false; return true; });
    return items;
  }
  function updatePreview(){
    const list = computeItems(); const el = $("#bulkPreview"); if (!el) return;
    const f = getFields(); const af = Object.entries(f).filter(([,v]) => v).map(([k]) => k);
    const as = activeSources(); const re = $("#optReplace")?.checked !== false;
    let warn = '';
    if ($("#srcDiscogs")?.checked && !getDiscogsToken()){ warn = `<div class="bulk-token-warning">⚠️ <b>Discogs está tildado pero NO tenés token configurado.</b> Se usará solo MusicBrainz + Last.fm.</div>`; }
    if ($("#srcLastFm")?.checked && !((typeof lastfmReady === 'function') && lastfmReady())){ warn += `<div class="bulk-token-warning">⚠️ <b>Last.fm está tildado pero NO tenés API key.</b> Configurala en ⚙️ → 🎵.</div>`; }
    if (!af.length){ el.innerHTML = `⚠️ Seleccioná al menos un campo.${warn}`; $("#bulkEnrichStart").disabled = true; return; }
    if (!as.length){ el.innerHTML = `⚠️ Sin fuentes activas.${warn}`; $("#bulkEnrichStart").disabled = true; return; }
    if (!list.length){ el.innerHTML = `ℹ️ No hay CDs para enriquecer.${warn}`; $("#bulkEnrichStart").disabled = true; return; }
    const modo = re ? "🔄 REEMPLAZO" : "✨ solo vacíos";
    el.innerHTML = `🎯 <b>${list.length}</b> CDs · Modo: <b>${modo}</b>.<br><span style="font-size:.78rem">Campos: <b>${af.join(", ")}</b> · Fuentes: <b>${as.join(" → ")}</b></span>${warn}`;
    $("#bulkEnrichStart").disabled = false;
  }
  async function processOne(idx, as, re, tnf, uc, retry, f){
    const { cd, cat } = items[idx];
    $("#bulkCurrent").textContent = idx + 1; $("#bulkTotal").textContent = items.length;
    $("#bulkBar").style.width = ((idx+1)/items.length*100).toFixed(1) + "%";
    log("🔍", "info", `Buscando: ${cd.titulo}`);
    const rowKey = cdKey(cat, cd); const row = findRowByKey(rowKey);
    if (row && (App.cat === ALL_CATS || cat === App.cat)) row.classList.add("enriching");
    let info = null; const tried = [], states = {};
    if (uc){ const c = MetadataCache.get(cd.titulo, cd.interprete, cd.anio); if (c){ info = { ...c, _fromCache: true }; stats.cached++; states[c.source || "Discogs"] = "ok"; } }
    if (!info){
      for (const sn of as){
        if (sn === "MusicBrainz" && Date.now() < _mb503Until){
          states[sn] = "skipped";
          const waitS = Math.ceil((_mb503Until - Date.now())/1000);
          log("❄️", "warn", "MB enfriando", `${waitS}s · re-encolando`);
          if (!requeueIdx.includes(idx)){ requeueIdx.push(idx); updateRequeueBadge(); }
          continue;
        }
        if (sn === "Discogs" && Date.now() < _discogs429Until){
          states[sn] = "skipped";
          const waitS = Math.ceil((_discogs429Until - Date.now())/1000);
          log("❄️", "warn", "Discogs enfriando", `${waitS}s · re-encolando`);
          if (!requeueIdx.includes(idx)){ requeueIdx.push(idx); updateRequeueBadge(); }
          continue;
        }
        tried.push(sn); states[sn] = "querying"; updateSourcesViz(states);
        let att = 0;
        while (att <= (retry ? 1 : 0)){
          try {
            if (sn === "Discogs") info = await enrichFromDiscogs(cd.titulo, cd.interprete, { anio: cd.anio, pais: cd.pais, sello: cd.sello, catalogo: cd.catalogo, barcode: cd.codigo });
            else if (sn === "MusicBrainz") info = await enrichFromMusicBrainz(cd.titulo, cd.interprete, { anio: cd.anio });
            else if (sn === "Last.fm" && typeof enrichFromLastFm === 'function') info = await enrichFromLastFm(cd.titulo, cd.interprete, { anio: cd.anio });
          } catch(err){
            if (err.message === 'COOLDOWN'){ if (!requeueIdx.includes(idx)){ requeueIdx.push(idx); updateRequeueBadge(); } break; }
          }
          if (info && info.portada) break;
          if (info && !f.portada) break;
          att++;
          if (att <= (retry ? 1 : 0)) await new Promise(r => setTimeout(r, 1000));
          if (info) break;
        }
        if (info){ verificarFechaEmision(info, cd.anio); states[sn] = "ok"; if (uc) MetadataCache.set(cd.titulo, cd.interprete, cd.anio, info); }
        else states[sn] = "fail";
        updateSourcesViz(states);
        if (info && info.portada) break;
        if (info && !f.portada) break;
      }
    }
    if (row && (App.cat === ALL_CATS || cat === App.cat)) row.classList.remove("enriching");
    if (!info){
      stats.fail++; log("❌", "err", cd.titulo, "Sin resultados");
      if (tnf) notFoundInRun.push({ catKey: cat, catLabel: Store.get(cat)?.label || cat, nro: cd.nro, titulo: cd.titulo, interprete: cd.interprete, anio: cd.anio ?? null, sources: tried.join(", ") });
      return;
    }
    let changes = 0, reps = 0; const dp = []; const prov = cd.provenance || {}; const stamp = makeProvenance(info.source, info.confidence);
    function ap(k, nv, ov, l){
      if (nv === null || nv === undefined || nv === "") return false;
      const ho = ov !== null && ov !== undefined && String(ov).trim() !== "";
      if (re){ cd[k] = upper(nv); prov[k] = stamp; if (ho && String(ov) !== String(nv)){ dp.push(`${l} ${ov}→${nv}`); reps++; } else dp.push(l); return true; }
      else if (!ho){ cd[k] = upper(nv); prov[k] = stamp; dp.push(l); return true; }
      return false;
    }
    if (info._title && Number(info.confidence) >= 85){
      const nuevo = corregirCampo(cd.titulo, upper(info._title), info.confidence, re);
      if (nuevo && nuevo !== cd.titulo){ if (cd.titulo){ dp.push(`Título "${cd.titulo}"→"${nuevo}"`); reps++; } else dp.push("Título"); cd.titulo = upper(nuevo); prov.titulo = stamp; changes++; }
    }
    if (info._artist && Number(info.confidence) >= 85){
      const nuevo = corregirCampo(cd.interprete, upper(info._artist), info.confidence, re);
      if (nuevo && nuevo !== cd.interprete){ if (cd.interprete){ dp.push(`Intérprete "${cd.interprete}"→"${nuevo}"`); reps++; } else dp.push("Intérprete"); cd.interprete = upper(nuevo); prov.interprete = stamp; changes++; }
    }
    if (f.anio && info.anio){
      const esReed = cd.anio && (info.anio - cd.anio) > 5;
      if (esReed){
        if (f.anioEdicion){
          const prev = cd.anioEdicion;
          if (re){ if (prev !== info.anio){ if (prev) dp.push(`Año edición ${prev}→${info.anio}`); else dp.push("Año edición"); cd.anioEdicion = info.anio; prov.anioEdicion = stamp; changes++; } }
          else if (!prev){ cd.anioEdicion = info.anio; prov.anioEdicion = stamp; dp.push("Año edición"); changes++; }
        }
      } else { if (ap("anio", info.anio, cd.anio, "Año álbum")) changes++; }
    } else if (f.anioEdicion && info.anio && !cd.anioEdicion && !cd.anio){
      cd.anioEdicion = info.anio; prov.anioEdicion = stamp; dp.push("Año edición"); changes++;
    }
    if (f.sello && info.sello && ap("sello", info.sello, cd.sello, "Sello")) changes++;
    if (f.genero && info.genero && ap("genero", info.genero, cd.genero, "Género")) changes++;
    if (f.pais && info.pais && ap("pais", info.pais, cd.pais, "País")) changes++;
    if (f.catalogo && info.catalogo && ap("catalogo", info.catalogo, cd.catalogo, "Catálogo")) changes++;
    if (f.portada && info.portada){
      const hc = !!cd.portada;
      if (re || !hc){
        if (hc && cd.portada !== info.portada){ dp.push("Portada reemplazada"); reps++; } else dp.push("Portada");
        cd.portada = info.portada; cd.portadaSource = info.portadaSource; prov.portada = stamp;
        changes++; stats.covers++;
      }
    }
    if (f.links && info.links && Object.keys(info.links).length){
      const prev = cd.links || {};
      const merged = re ? { ...prev, ...info.links } : { ...info.links, ...prev };
      const nuevos = Object.keys(merged).filter(k => !prev[k]).length;
      if (nuevos > 0 || re){ cd.links = merged; if (nuevos > 0){ dp.push(`🎧 ${nuevos} link${nuevos === 1 ? '' : 's'}`); changes++; stats.links += nuevos; } }
    }
    if (info.mbId && !cd.mbId) cd.mbId = info.mbId;
    if (info.discogsId && !cd.discogsId) cd.discogsId = info.discogsId;
    if (info.source){ cd.enrichmentSource = info.source; cd.enrichmentConfidence = info.confidence ?? null; cd.enrichedAt = info.enrichedAt || new Date().toISOString(); }
    cd.provenance = prov;
    if (changes > 0){
      stats.ok++; stats.fields += changes; sourceStats[info.source] = (sourceStats[info.source] || 0) + 1;
      const strategyTag = info._strategy ? ` [${info._strategy}]` : '';
      log(reps > 0 ? "🔄" : "✅", reps > 0 ? "warn" : "ok", cd.titulo, `[${info.source}${strategyTag}] ${dp.join(", ")}`);
    } else { stats.skip++; log("⏭️", "warn", cd.titulo, "Sin cambios"); }
  }
  async function run(){
    if (running) return;
    reset(); computeItems();
    if (!items.length){ Toast.show("No hay CDs para enriquecer", "warn"); return; }
    const f = getFields(); const retry = $("#optRetry")?.checked !== false; const as = activeSources();
    if (!as.length){ Toast.show("Sin fuentes activas", "warn", 6000); return; }
    const tnf = $("#optTrackNotFound")?.checked !== false; const uc = $("#optUseCache")?.checked !== false; const re = $("#optReplace")?.checked !== false;
    running = true; cancelled = false; stats.total = items.length;
    $("#bulkEnrichConfig").style.display = "none"; $("#bulkEnrichProgress").style.display = "";
    $("#bulkEnrichStart").style.display = "none"; $("#bulkEnrichStop").style.display = "";
    log("🚀", "info", `Iniciando${re ? " (REEMPLAZO)" : ""}`, `${items.length} CDs · ${as.join(" → ")}`);
    let saveC = 0;
    for (let i = 0; i < items.length; i++){
      if (cancelled){ log("⏹️", "warn", "Cancelado"); break; }
      await processOne(i, as, re, tnf, uc, retry, f);
      saveC++; if (saveC >= 5){ Store.persistSilent(); saveC = 0; }
      if (i < items.length - 1 && !cancelled) await new Promise(r => setTimeout(r, 1200));
    }
    if (requeueIdx.length > 0 && !cancelled){
      const req = [...requeueIdx]; requeueIdx = []; updateRequeueBadge();
      log("🔁", "info", `Re-procesando ${req.length} CDs saltados`, "esperando fin de cooldown…");
      while (Date.now() < _mb503Until && !cancelled){
        const waitS = Math.ceil((_mb503Until - Date.now())/1000);
        $("#bulkEta").textContent = `⏸️ Esperando ${waitS}s (rate limit)`;
        await new Promise(r => setTimeout(r, 2000));
      }
      stats.requeued = req.length;
      for (const idx of req){
        if (cancelled) break;
        log("🔁", "info", `Retry: ${items[idx].cd.titulo}`);
        await processOne(idx, as, re, tnf, uc, retry, f);
        Store.persistSilent();
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    if (saveC > 0) Store.persistSilent();
    Store.persist();
    if (notFoundInRun.length){ for (const it of notFoundInRun) NotFoundList.add(it); NotFoundList.persist(); }
    running = false;
    $("#bulkEnrichProgress").style.display = "none";
    $("#bulkEnrichSummary").style.display = "";
    $("#bulkEnrichStop").style.display = "none";
    const sb = Object.entries(sourceStats).map(([s, n]) => `<div class="sum-item"><div class="sum-icon">📡</div><div class="sum-label">${s}</div><div class="sum-value ok">${n}</div></div>`).join("");
    $("#bulkSummaryGrid").innerHTML = `
      <div class="sum-item"><div class="sum-icon">📊</div><div class="sum-label">Procesados</div><div class="sum-value">${stats.total}</div></div>
      <div class="sum-item"><div class="sum-icon">✅</div><div class="sum-label">Enriquecidos</div><div class="sum-value ok">${stats.ok}</div></div>
      <div class="sum-item"><div class="sum-icon">💨</div><div class="sum-label">Desde caché</div><div class="sum-value">${stats.cached}</div></div>
      <div class="sum-item"><div class="sum-icon">⏭️</div><div class="sum-label">Sin cambios</div><div class="sum-value warn">${stats.skip}</div></div>
      <div class="sum-item"><div class="sum-icon">❌</div><div class="sum-label">Sin resultados</div><div class="sum-value err">${stats.fail}</div></div>
      <div class="sum-item"><div class="sum-icon">📝</div><div class="sum-label">Campos</div><div class="sum-value ok">${stats.fields}</div></div>
      <div class="sum-item"><div class="sum-icon">🖼️</div><div class="sum-label">Portadas</div><div class="sum-value ok">${stats.covers}</div></div>
      <div class="sum-item"><div class="sum-icon">🎧</div><div class="sum-label">Links streaming</div><div class="sum-value ok">${stats.links}</div></div>
      ${stats.requeued > 0 ? `<div class="sum-item"><div class="sum-icon">🔁</div><div class="sum-label">Re-encolados</div><div class="sum-value ok">${stats.requeued}</div></div>` : ''}
      ${sb}`;
    if (notFoundInRun.length){ $("#bulkNotFoundActions").style.display = "flex"; $("#bulkNotFoundCount").textContent = notFoundInRun.length; }
    $("#bulkLogFinal").innerHTML = $("#bulkLog").innerHTML;
    renderTabs(); renderAll();
    if (stats.ok > 0){ AutoBackup.markChange(`enriquecimiento masivo (${stats.ok})`); HistoryLog.log('ENRICH', `Enriquecimiento masivo`, `${stats.ok} CDs · ${stats.fields} campos · ${stats.covers} portadas · ${stats.links} links`); }
    Toast.show(`Terminado: ${stats.ok} CDs · ${stats.fields} campos · ${stats.covers} portadas · ${stats.links} links`, "ok", 6000);
  }
  function stop(){ if (!running) return; if (!confirm("¿Detener?")) return; cancelled = true; $("#bulkEnrichStop").disabled = true; $("#bulkEnrichStop").textContent = "Deteniendo…"; }
  function open(){
    reset(); updatePreview();
    $("#bulkEnrichModal").classList.add("open");
    if (!getDiscogsToken()) setTimeout(() => { Toast.show("💡 Sin token de Discogs. Se usará MusicBrainz + Last.fm.", "warn", 7000); }, 500);
    if (!((typeof lastfmReady === 'function') && lastfmReady())) setTimeout(() => { Toast.show("💡 Sin API key de Last.fm. Configurala en ⚙️ → 🎵.", "info", 7000); }, 800);
  }
  function close(){ if (running){ if (!confirm("¿Detener?")) return; cancelled = true; } $("#bulkEnrichModal").classList.remove("open"); if (running) setTimeout(() => { renderTabs(); renderAll(); }, 500); }
  return { open, close, run, stop, updatePreview, isRunning: () => running };
})();

/* ─── Diagnóstico de red ─── */
async function runNetworkDiagnostics(){
  const host = $("#networkDiagContent"); if (!host) return;
  host.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted)"><span class="disc-loader"></span> Ejecutando…</div>`;
  const results = [];
  const checks = [
    { name: "MusicBrainz", fetcher: () => fetchWithTimeout(`${MB_API}release?query=release:%22test%22&fmt=json&limit=1`, { headers: { 'User-Agent': MB_USER_AGENT } }, 8000) },
    { name: "Discogs", fetcher: () => { if (!getDiscogsToken()) return Promise.reject(new Error('SIN_TOKEN')); return fetchDiscogs(`${DISCOGS_API}/database/search?q=test&per_page=1`, 8000); } },
    { name: "Last.fm", fetcher: () => { if (!((typeof lastfmReady === 'function') && lastfmReady())) return Promise.reject(new Error('SIN_TOKEN')); return testLastFmConnection(); } },
    { name: "Cover Art Archive", fetcher: () => fetchWithTimeout(`https://coverartarchive.org/release/76df3287-6cda-33eb-8e9a-044b5e15ffdd`, {}, 8000) },
    { name: "iTunes Search", fetcher: () => fetchWithTimeout(`https://itunes.apple.com/search?term=test&entity=album&limit=1&country=US`, { cache: 'no-store' }, 8000) }
  ];
  for (const c of checks){
    const t0 = Date.now(); let st = "—", col = "var(--muted)", ic = "❔", det = "";
    try {
      const r = await c.fetcher();
      const el = Date.now() - t0; st = `HTTP ${r.status || 'OK'} · ${el}ms`;
      if (r.ok === true || (r.ok === undefined && c.name === "Last.fm" && r.artists !== undefined)){ col = "var(--ok)"; ic = "✅"; det = c.name === "Last.fm" ? `OK · ${r.artists || 0} artistas` : "OK"; }
      else if (r.ok === false){ col = "var(--warn)"; ic = "⚠️"; det = "Respuesta no OK"; }
    } catch (err){
      if (err.message === 'SIN_TOKEN'){
        const el = Date.now() - t0;
        st = `Sin token · ${el}ms`; col = "var(--warn)"; ic = "🔑"; det = c.name === "Last.fm" ? "Configurá API key en ⚙️ → 🎵" : "Configurá token Discogs.";
        results.push({ name: c.name, status: st, color: col, icon: ic, detail: det });
        continue;
      }
      const el = Date.now() - t0; st = `${err.name === 'AbortError' || err.name === 'TimeoutError' ? 'Timeout' : err.message} · ${el}ms`; col = "var(--danger)"; ic = "❌";
      det = (err.name === 'AbortError' || err.name === 'TimeoutError') ? "Timeout (>8s)." : "Error de red o CORS.";
    }
    results.push({ name: c.name, status: st, color: col, icon: ic, detail: det });
  }
  const tk = getDiscogsToken() ? `✅ (${getDiscogsToken().length} chars)` : `❌ NO configurado`;
  const lk = ((typeof lastfmReady === 'function') && lastfmReady()) ? `✅ (${getLastFmKey().length} chars)` : `❌ NO configurada`;
  const mbC = _mb503Until > Date.now() ? ` · ❄️ ${Math.ceil((_mb503Until-Date.now())/1000)}s` : '';
  const dcC = _discogs429Until > Date.now() ? ` · ❄️ ${Math.ceil((_discogs429Until-Date.now())/1000)}s` : '';
  host.innerHTML = `
    <div style="padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:10px;margin-bottom:14px;font-size:.82rem;line-height:1.7">
      Protocolo: <code>${esc(location.protocol)}//${esc(location.host || '…')}</code><br>
      Token Discogs: <b>${tk}</b><br>
      API Key Last.fm: <b>${lk}</b><br>
      UA: <code>${esc(MB_USER_AGENT)}</code>${mbC}${dcC}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="background:rgba(255,255,255,.03)"><th style="text-align:left;padding:10px 12px;font-size:.65rem;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Fuente</th><th style="text-align:left;padding:10px 12px;font-size:.65rem;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Estado</th><th style="text-align:left;padding:10px 12px;font-size:.65rem;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)">Detalle</th></tr></thead>
      <tbody>${results.map(r => `<tr><td style="padding:10px 12px;border-bottom:1px solid rgba(37,45,58,.5);font-weight:600">${r.icon} ${esc(r.name)}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(37,45,58,.5);color:${r.color};font-family:ui-monospace,monospace;font-size:.78rem">${esc(r.status)}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(37,45,58,.5);color:var(--muted);font-size:.8rem">${r.detail}</td></tr>`).join('')}</tbody>
    </table>`;
}
function openNetworkDiag(){ $("#networkDiagModal").classList.add("open"); runNetworkDiagnostics(); }
function closeNetworkDiag(){ $("#networkDiagModal")?.classList.remove("open"); }

/* ─── Carpetas ─── */
function updateFolderSupportStatus(){
  const el = $("#folderSupportStatus"); if (!el) return;
  const mode = FileSystemDefault.getMode();
  if (mode === 'tauri'){ el.innerHTML = '🟢 <b>Modo nativo (Tauri)</b>: usando plugin <code>dialog + fs</code> del sistema.'; el.style.borderLeft = "4px solid var(--ok)"; }
  else if (mode === 'browser'){ el.innerHTML = '🟢 <b>Modo navegador</b>: usando File System Access API.'; el.style.borderLeft = "4px solid var(--ok)"; }
  else { el.innerHTML = '🟠 <b>No soportado</b>. Se usará descarga clásica.'; el.style.borderLeft = "4px solid var(--warn)"; }
  const n = $("#folderCurrentName"); if (n) n.textContent = FileSystemDefault.getName() || "— Sin carpeta configurada —";
  const p = $("#folderPick"), c = $("#folderChange"), r = $("#folderRemove"), t = $("#folderTestPermission");
  const h = FileSystemDefault.isSet();
  if (p) p.style.display = h ? "none" : "";
  if (c) c.style.display = h ? "" : "none";
  if (r) r.style.display = h ? "" : "none";
  if (t) t.style.display = h ? "" : "none";
}
function openFolderConfig(){ updateFolderSupportStatus(); $("#folderConfigModal").classList.add("open"); }
function closeFolderConfig(){ $("#folderConfigModal")?.classList.remove("open"); }
async function pickDefaultFolder(){
  try { const h = await FileSystemDefault.pickFolder(); updateFolderSupportStatus(); FileSystemDefault.refreshBadge(); Toast.show(`📂 Carpeta: ${h.name}`, "ok", 4000); closeFolderConfig(); }
  catch (err){ if (err.name === "AbortError") return; Toast.show("Error: " + err.message, "err", 6500); }
}
async function removeDefaultFolder(){ if (!FileSystemDefault.isSet()) return; if (!confirm("¿Quitar la carpeta?")) return; await FileSystemDefault.clear(); FileSystemDefault.refreshBadge(); updateFolderSupportStatus(); Toast.show("Carpeta quitada", "warn", 3200); }
async function openFolderBrowser(){
  if (!FileSystemDefault.isSet()){ Toast.show("Configurá una carpeta primero", "warn"); openFolderConfig(); return; }
  $("#folderBrowserModal").classList.add("open"); await refreshFolderList();
}
function closeFolderBrowser(){ $("#folderBrowserModal")?.classList.remove("open"); }
async function refreshFolderList(){
  const host = $("#folderFileList"); if (!host) return;
  const n = $("#folderBrowserName"); if (n) n.textContent = FileSystemDefault.getName() || "—";
  host.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted)"><span class="disc-loader"></span> Cargando…</div>`;
  try {
    if (!(await FileSystemDefault.ensureReady("read"))){
      host.innerHTML = `<div style="padding:24px;text-align:center;color:var(--warn);line-height:1.6">🔐 El navegador requiere reautorizar.<br><br><button type="button" class="btn primary" id="folderReauth">🔓 Reautorizar acceso</button></div>`;
      $("#folderReauth")?.addEventListener("click", async () => { await FileSystemDefault.ensureReady("readwrite"); refreshFolderList(); });
      return;
    }
    const files = await FileSystemDefault.listFiles();
    const info = $("#folderBrowserInfo"); if (info) info.textContent = `${files.length} archivo${files.length === 1 ? "" : "s"} en la carpeta`;
    if (!files.length){
      host.innerHTML = `<div style="padding:32px 20px;text-align:center;color:var(--muted)">📭 Sin archivos.<br><br><button type="button" class="btn primary" id="folderUploadEmpty">💾 Guardar primer backup</button></div>`;
      $("#folderUploadEmpty")?.addEventListener("click", saveBackupToFolder);
      return;
    }
    host.innerHTML = files.map(f => {
      const s = f.size ? `${(f.size/1024).toFixed(1)} KB` : '—';
      const d = f.modifiedTime ? new Date(f.modifiedTime).toLocaleString('es-AR', {dateStyle:'short', timeStyle:'short'}) : '—';
      const i = f.name.endsWith('.csv') ? '📊' : f.name.endsWith('.md') ? '📝' : '💾';
      return `<div class="folder-row gdrive-row" data-name="${esc(f.name)}"><span class="gdrive-icon">${i}</span><span class="gdrive-info"><span class="gdrive-name" title="${esc(f.name)}">${esc(f.name)}</span><span class="gdrive-meta">${esc(d)} · ${esc(s)}</span></span><span class="gdrive-actions"><button type="button" class="btn primary" data-act="restore">⬇️ Restaurar</button><button type="button" class="btn danger" data-act="delete" title="Eliminar">🗑️</button></span></div>`;
    }).join("");
    host.querySelectorAll(".folder-row").forEach(row => {
      const n = row.dataset.name;
      row.querySelector('[data-act="restore"]')?.addEventListener("click", () => restoreFromFolder(n));
      row.querySelector('[data-act="delete"]')?.addEventListener("click", () => deleteFromFolder(n));
    });
  } catch (err){ host.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger)">Error: ${esc(err.message)}</div>`; }
}
async function saveBackupToFolder(){
  try {
    if (!FileSystemDefault.isSet()){ openFolderConfig(); return; }
    if (!(await FileSystemDefault.ensureReady("readwrite"))){ Toast.show("Permiso denegado", "err"); return; }
    const o = OwnerConfig.get();
    const pl = { version: 5, appVersion: APP_VERSION, exported: new Date().toISOString(), owner: o.name || DEFAULT_AUTHOR, contact: OwnerConfig.contactLine() || DEFAULT_PHONE, categories: {} };
    for (const k of Store.catKeys()){ const c = Store.get(k); pl.categories[k] = { label: c.label, icon: c.icon, subcategories: c.subcategories || [], cds: c.cds }; }
    const fn = `discografia_v${APP_VERSION}_backup_${timestamp()}.json`;
    await FileSystemDefault.saveFile(fn, JSON.stringify(pl, null, 2), "application/json");
    Toast.show(`💾 Guardado: ${fn}`, "ok", 4000);
    if ($("#folderBrowserModal")?.classList.contains("open")) refreshFolderList();
  } catch (err){ Toast.show("Error: " + err.message, "err", 6500); }
}
async function restoreFromFolder(name){
  if (!name) return;
  if (!confirm(`¿Restaurar "${name}"?`)) return;
  try {
    const text = await FileSystemDefault.readFile(name);
    const data = JSON.parse(text);
    const before = JSON.stringify(Store.categories());
    if (data && data.categories){
      Store.replaceAll(data); NotFoundList.clear();
      Undo.push("restaurar", () => { Store.replaceAll({ categories: JSON.parse(before) }); ensureValidCat(); renderTabs(); renderAll(); });
      App.artista = null; App.q = ""; App.selected.clear(); App.focusedKey = null; App.subcat = null;
      $("#q").value = ""; $("#searchBox").classList.remove("has-value");
      ensureValidCat(); renderTabs(); renderAll();
      HistoryLog.log('IMPORT', `Restaurado: ${name}`);
      AutoBackup.markChange("restauración");
      Toast.show("Backup restaurado", "ok", 4000);
      closeFolderBrowser();
    } else Toast.show("Formato inesperado", "err", 6000);
  } catch (err){ Toast.show("Error: " + err.message, "err", 7000); }
}
async function deleteFromFolder(name){
  if (!name) return;
  if (!confirm(`¿Eliminar "${name}"?`)) return;
  try { await FileSystemDefault.deleteFile(name); Toast.show("Eliminado", "ok"); refreshFolderList(); }
  catch (err){ Toast.show("Error: " + err.message, "err", 6000); }
}

/* ─── Lightbox ─── */
const Lightbox = (() => {
  let cur = [], idx = 0;
  function open(url, t, key){
    if (!url) return;
    cur = [];
    $$("#tbodyCD tr").forEach(tr => { const i = tr.querySelector(".cover-thumb"); if (i) cur.push({ url: i.src, titulo: i.dataset.title || "", key: i.dataset.key || tr.dataset.key }); });
    idx = cur.findIndex(x => x.key === key); if (idx === -1) idx = 0;
    render();
    $("#coverLightbox").classList.add("open"); document.body.style.overflow = "hidden";
  }
  function render(){
    if (!cur.length) return;
    const it = cur[idx];
    $("#lbImg").src = it.url;
    $("#lbInfo").textContent = `${it.titulo} (${idx+1} de ${cur.length})`;
    $("#lbPrev").style.display = cur.length > 1 ? "" : "none";
    $("#lbNext").style.display = cur.length > 1 ? "" : "none";
  }
  function next(){ if (cur.length < 2) return; idx = (idx + 1) % cur.length; render(); }
  function prev(){ if (cur.length < 2) return; idx = (idx - 1 + cur.length) % cur.length; render(); }
  function close(){ $("#coverLightbox").classList.remove("open"); document.body.style.overflow = ""; }
  return { open, next, prev, close };
})();

/* ─── NotFound ─── */
function openNotFoundModal(){
  App.notFoundFilter = "";
  const si = $("#notFoundSearch"); if (si) si.value = "";
  renderNotFoundTable();
  const d = new Date();
  const fmt = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
  const pd = $("#printDate"); if (pd) pd.textContent = fmt;
  OwnerConfig.render();
  $("#notFoundModal").classList.add("open");
}
function closeNotFoundModal(){ $("#notFoundModal").classList.remove("open"); }
function renderNotFoundTable(){
  const items = NotFoundList.getAll();
  const filter = norm(App.notFoundFilter || "").trim();
  const tbody = $("#notFoundTbody"); const cnt = $("#notFoundCount");
  if (cnt) cnt.textContent = items.length;
  if (!items.length){ tbody.innerHTML = `<tr><td colspan="7" class="nf-empty">✅ No hay CDs pendientes.</td></tr>`; return; }
  let f = items;
  if (filter) f = items.filter(x => norm([x.titulo, x.interprete, x.catLabel].join(" ")).includes(filter));
  if (!f.length){ tbody.innerHTML = `<tr><td colspan="7" class="nf-empty">Sin coincidencias.</td></tr>`; return; }
  tbody.innerHTML = f.map((item, i) => {
    const cleanT = limpiarTituloParaBusqueda(item.titulo);
    const cleanI = limpiarInterpreteParaBusqueda(item.interprete);
    const cleanInfo = (cleanT !== item.titulo || cleanI !== item.interprete)
      ? `<br><span style="font-size:.65rem;color:var(--ok);opacity:.85">🔍 "${esc(cleanT)}" · "${esc(cleanI)}"</span>` : '';
    return `<tr data-nf-idx="${i}">
      <td class="nf-num">${item.nro}</td>
      <td class="nf-cat">${esc(item.catLabel)}</td>
      <td class="nf-titulo">${highlight(upper(item.titulo), App.notFoundFilter)}${cleanInfo}</td>
      <td class="nf-interprete">${highlight(upper(item.interprete), App.notFoundFilter)}</td>
      <td class="nf-anio">${item.anio ?? "—"}</td>
      <td>${esc(item.sources || "—")}</td>
      <td>
        <button type="button" class="btn primary" data-nf-retry="${i}" title="Reintentar">🔁 Reintentar</button>
        <button type="button" class="btn" data-nf-search="${i}" title="Buscar en Google">🌐</button>
      </td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('[data-nf-retry]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.nfRetry, 10);
      const item = f[idx];
      if (!item) return;
      btn.disabled = true;
      const orig = btn.innerHTML;
      btn.innerHTML = '⏳';
      try {
        const info = await enrichFromChain(item.titulo, item.interprete, { hints: { anio: item.anio }, useCache: false });
        if (!info){ Toast.show('❌ Sigue sin encontrarse', 'warn', 3000); btn.innerHTML = '❌'; setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000); return; }
        const cat = item.catKey;
        const cd = Store.getCDs(cat).find(c => c.nro === item.nro);
        if (!cd){ Toast.show('CD no encontrado en la base', 'warn'); btn.innerHTML = orig; btn.disabled = false; return; }
        const prov = cd.provenance || {};
        const stamp = makeProvenance(info.source, info.confidence);
        if (info.anio && !cd.anio){ cd.anio = info.anio; prov.anio = stamp; }
        if (info.sello && !cd.sello){ cd.sello = upper(info.sello); prov.sello = stamp; }
        if (info.genero && !cd.genero){ cd.genero = upper(info.genero); prov.genero = stamp; }
        if (info.pais && !cd.pais){ cd.pais = upper(info.pais); prov.pais = stamp; }
        if (info.catalogo && !cd.catalogo){ cd.catalogo = upper(info.catalogo); prov.catalogo = stamp; }
        if (info.portada && !cd.portada){ cd.portada = info.portada; cd.portadaSource = info.portadaSource; prov.portada = stamp; }
        if (info.links && Object.keys(info.links).length){ cd.links = { ...(cd.links || {}), ...info.links }; }
        if (info._title && info.confidence >= 85 && cd.titulo) cd.titulo = upper(info._title);
        if (info._artist && info.confidence >= 85 && cd.interprete) cd.interprete = upper(info._artist);
        cd.enrichmentSource = info.source;
        cd.enrichmentConfidence = info.confidence ?? null;
        cd.enrichedAt = info.enrichedAt || new Date().toISOString();
        cd.provenance = prov;
        Store.persist();
        NotFoundList.remove(item.catKey, item.nro);
        NotFoundList.persist();
        AutoBackup.markChange('reintento OK');
        renderNotFoundTable(); renderTabs(); renderAll();
        Toast.show(`✅ Encontrado en ${info.source} (${info.confidence}%)`, 'ok', 3500);
        HistoryLog.log('ENRICH', `Reintento OK: ${cd.titulo}`, info.source);
      } catch(err){
        Toast.show('⚠️ ' + err.message, 'warn', 4000);
        btn.innerHTML = orig; btn.disabled = false;
      }
    });
  });
  tbody.querySelectorAll('[data-nf-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.nfSearch, 10);
      const item = f[idx];
      if (!item) return;
      const q = encodeURIComponent(`${item.interprete} ${item.titulo}${item.anio ? ' ' + item.anio : ''}`.trim());
      window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener');
    });
  });
}
function printNotFoundList(){ const m = $("#notFoundModal"); m.classList.add("printing"); setTimeout(() => { window.print(); setTimeout(() => m.classList.remove("printing"), 500); }, 100); }
async function exportNotFoundCSV(){
  const items = NotFoundList.getAll();
  if (!items.length){ Toast.show("Lista vacía", "warn"); return; }
  const sep = ";";
  const e = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const rows = [["Nº","Categoría","Título","Intérprete","Año","Fuentes"].join(sep)];
  for (const i of items) rows.push([i.nro, i.catLabel, i.titulo, i.interprete, i.anio ?? "", i.sources || ""].map(e).join(sep));
  await saveOrDownload(`discografia_no_encontrados_${timestamp()}.csv`, "\uFEFF" + rows.join("\r\n"), "text/csv");
}
async function exportNotFoundJSON(){
  const items = NotFoundList.getAll();
  if (!items.length){ Toast.show("Lista vacía", "warn"); return; }
  const o = OwnerConfig.get();
  await saveOrDownload(`discografia_no_encontrados_${timestamp()}.json`, JSON.stringify({ exported: new Date().toISOString(), appVersion: APP_VERSION, owner: o.name || null, contact: OwnerConfig.contactLine() || null, total: items.length, cds: items }, null, 2));
}
function clearNotFoundList(){ const n = NotFoundList.count(); if (!n) return; if (!confirm(`¿Limpiar los ${n} CDs?`)) return; NotFoundList.clear(); renderNotFoundTable(); Toast.show("Lista limpiada", "warn"); }

/* =========================================================================
   [FIN app-core-3-enrich.js]
   Ya tenés el core completo: 1-base + 2-api + 3-enrich
   Ahora seguí con lastfm.js (ya te lo paso en el próximo mensaje).
   ========================================================================= */