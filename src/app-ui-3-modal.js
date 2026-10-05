/* =========================================================================
   DISCOGRAFÍA v7.0.14 — UI Parte 3/4: Modal CD, vista, exportar, importar, bulk
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   Depende de: app-core-*.js, lastfm.js, app-ui-1-estado.js, app-ui-2-render.js
   =========================================================================
   [PARTE 3/4] INICIO
   ========================================================================= */

const setVal = (s, v) => { const el = $(s); if (el) el.value = v; };
const getVal = s => $(s)?.value ?? "";
function fillDatalist(sel, set){ const dl = $(sel); if (!dl) return; dl.innerHTML = ""; [...set].sort((a, b) => a.localeCompare(b, "es")).forEach(v => { const o = document.createElement("option"); o.value = upper(v); dl.appendChild(o); }); }
function switchModalTab(n){ $$(".modal-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === n)); $$(".tab-panel").forEach(p => p.style.display = p.dataset.panel === n ? "" : "none"); }
function clearValidation(){ $$(".field.invalid").forEach(f => f.classList.remove("invalid")); }

function abrirVista(cd){
  if (!cd) return;
  App.detailCD = cd;
  const v = (val, fb = "—") => (val === null || val === undefined || val === "") ? fb : val;
  const cov = cd.portada ? `<img src="${esc(cd.portada)}" alt="Portada" style="width:180px;height:180px;border-radius:12px;object-fit:cover;border:1px solid var(--line);box-shadow:0 8px 30px rgba(0,0,0,.5);cursor:zoom-in" data-lb-key="${esc(cdKeyForView(cd))}">` : `<div style="width:180px;height:180px;border-radius:12px;background:linear-gradient(135deg,var(--bg3),var(--bg2));border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:.4">💿</div>`;
  const secs = [
    { t: "📀 Edición", c: [["Formato", v(cd.formato)], ["Año álbum", v(cd.anio)], ["Año edición", v(cd.anioEdicion)], ["Sello", v(upper(cd.sello))], ["Género", v(upper(cd.genero))], ["Nº catálogo", v(upper(cd.catalogo))], ["Código de barras", v(cd.codigo)], ["ISRC", v(cd.isrc)], ["Edición", v(upper(cd.edicion))], ["País", v(upper(cd.pais))]] },
    { t: "🔍 Estado físico", c: [["Estado general", v(cd.estado)], ["Disco", v(cd.estadoDisco)], ["Caja", v(cd.estadoCaja)], ["Folleto", v(cd.estadoFolleto)], ["Arte / carátula", v(cd.estadoArte)]] },
    { t: "📍 Ubicación y valor", c: [["Ubicación", v(upper(cd.ubicacion))], ["Cantidad", v(cd.cantidad, 1)], ["Fecha ingreso", v(cd.adquisicion)], ["Valor", cd.valor != null ? `${cd.moneda || "ARS"} ${Number(cd.valor).toLocaleString("es-AR")}` : "—"], ["Moneda", v(cd.moneda)]] }
  ];
  if (Loans.isLoaned(cd)) secs.push({ t: "📚 Préstamo", c: [["Prestado a", v(upper(cd.prestadoA))], ["Fecha préstamo", v(cd.fechaPrestamo)], ["Fecha devolución", v(cd.fechaDevolucion)], ["Notas", v(upper(cd.notasPrestamo))]] });
  const cf = cd.customFields || {};
  const cfs = CustomFields.getAll().filter(f => cf[f.id]);
  if (cfs.length) secs.push({ t: "📝 Personalizados", c: cfs.map(f => [f.name, v(cf[f.id])]) });
  const rSec = (s) => `<div style="margin-bottom:18px"><div class="section-label" style="margin-top:0">${s.t}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 18px">${s.c.map(([k, val]) => `<div><div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;font-weight:600">${esc(k)}</div><div style="font-size:.88rem;color:var(--txt);word-break:break-word;text-transform:uppercase">${esc(String(val))}</div></div>`).join("")}</div></div>`;
  $("#viewTitle").textContent = upper(cd.titulo) || "Detalles del CD";
  const realCat = findCategoryOfCD(cd) || App.cat;
  const realCatObj = Store.get(realCat);
  const subObj = cd.subcat ? Store.getSubcategory(realCat, cd.subcat) : null;
  $("#viewBody").innerHTML = `
    <div style="display:flex;gap:20px;flex-wrap:wrap;padding:16px;background:linear-gradient(135deg,rgba(79,195,247,.07),rgba(167,139,250,.05));border:1px solid rgba(79,195,247,.22);border-radius:12px;margin-bottom:20px;align-items:flex-start">
      <div style="flex:0 0 auto">${cov}</div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:.62rem;color:var(--accent);text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:6px">🎵 Título</div>
        <div style="font-size:1.25rem;font-weight:700;color:var(--txt);margin-bottom:14px;line-height:1.25;text-transform:uppercase">${esc(upper(cd.titulo) || "—")}</div>
        <div style="font-size:.62rem;color:var(--accent);text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:6px">🎤 Intérprete</div>
        <div style="font-size:1rem;color:var(--txt);margin-bottom:14px;text-transform:uppercase">${esc(upper(cd.interprete) || "—")}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div><div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Nº</div><div style="font-size:1rem;font-weight:700;color:var(--accent2)">${cd.nro ?? "—"}</div></div>
          <div><div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Año álbum</div><div style="font-size:1rem;font-weight:700;color:var(--accent2)">${cd.anio ?? "—"}</div></div>
          ${cd.anioEdicion ? `<div><div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Año edición</div><div style="font-size:1rem;font-weight:700;color:var(--purple)">${cd.anioEdicion}</div></div>` : ''}
          <div><div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Categoría</div><div style="font-size:1rem;font-weight:600;color:var(--txt)">${esc(realCatObj?.label || "—")}</div></div>
          ${subObj ? `<div><div style="font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Subcategoría</div><div style="font-size:1rem;font-weight:600;color:var(--purple)">${esc(subObj.icon)} ${esc(subObj.label)}</div></div>` : ''}
        </div>
      </div>
    </div>
    ${secs.map(rSec).join("")}
    ${renderStreamingSection(cd)}
    ${cd.notas ? `<div style="margin-top:8px"><div class="section-label" style="margin-top:0">📝 Observaciones</div><div style="font-size:.85rem;color:var(--txt);line-height:1.6;padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:10px;white-space:pre-wrap">${esc(cd.notas)}</div></div>` : ""}
    ${cd.enrichmentSource ? `<div style="margin-top:16px;padding:10px 14px;background:rgba(79,195,247,.06);border-left:3px solid var(--accent);border-radius:8px;font-size:.75rem;color:var(--muted)">✨ Enriquecido desde <b style="color:var(--accent)">${esc(cd.enrichmentSource)}</b>${cd.enrichmentConfidence != null ? ` · Confianza: <b>${cd.enrichmentConfidence}%</b>` : ""}${cd.enrichedAt ? ` · ${new Date(cd.enrichedAt).toLocaleDateString('es-AR')}` : ""}</div>` : ""}`;
  const m = $("#viewModal"); m.dataset.editKey = cdKeyForView(cd); m.classList.add("open");
  document.body.style.overflow = "hidden";
  const img = $("#viewBody img[data-lb-key]");
  if (img) img.addEventListener("click", () => Lightbox.open(cd.portada, `${cd.titulo} — ${cd.interprete}`, cdKeyForView(cd)));
  const streamSection = $("#viewBody .stream-section");
  if (streamSection) wireStreamingSectionEvents(streamSection, cd);
}
function cerrarVista(){ $("#viewModal").classList.remove("open"); document.body.style.overflow = ""; App.detailCD = null; }

function abrirModal(modo, cd = null){
  _cdSaving = false;
  const _sb = $("#btnSave"), _sn = $("#btnSaveAndNew");
  if (_sb) _sb.disabled = false;
  if (_sn) _sn.disabled = false;
  if (!Store.catKeys().length){ Toast.show("Creá una categoría primero", "warn"); abrirModalCategoria("crear"); return; }
  App.editing = modo === "editar" ? { cat: (App.cat === ALL_CATS ? findCategoryOfCD(cd) : App.cat), original: cd } : null;
  $("#modalIcon").textContent = modo === "editar" ? "✏️" : "➕";
  $("#modalTitle").textContent = modo === "editar" ? "Editar CD" : "Nuevo CD";
  $("#enrichBar").style.display = "none"; $("#enrichResult").textContent = ""; $("#enrichSources").style.display = "none";
  $("#fCoverUrl").value = ""; delete $("#fCoverUrl").dataset.enrichmentSource; delete $("#fCoverUrl").dataset.enrichmentConfidence; delete $("#fCoverUrl").dataset.enrichedAt;
  $("#fLinks").value = modo === "editar" && cd && cd.links ? JSON.stringify(cd.links) : "";
  $("#wrapCoverUrl").style.display = "none"; renderCoverPreview(null, null);
  const tg = $("#enrichToggle"); if (tg) tg.checked = Store.getPref("enrich", true);
  const rt = $("#replaceToggle"); if (rt) rt.checked = Store.getPref("replaceOnEnrich", true);
  const sel = $("#fCat"); sel.innerHTML = "";
  for (const k of Store.catKeys()){ const c = Store.get(k); const o = document.createElement("option"); o.value = k; o.textContent = c.icon + " " + c.label;
    const preselected = (modo === "editar" && App.editing?.cat === k) || (modo === "nuevo" && App.cat !== ALL_CATS && k === App.cat) || (modo === "nuevo" && App.cat === ALL_CATS && k === Store.catKeys()[0]);
    if (preselected) o.selected = true;
    sel.appendChild(o);
  }
  sel.disabled = false;
  const iS = new Set(), sS = new Set(), gS = new Set();
  for (const k of Store.catKeys()){ for (const c of Store.getCDs(k)){ if (c.interprete) iS.add(c.interprete); if (c.sello) sS.add(c.sello); if (c.genero) gS.add(c.genero); } }
  fillDatalist("#interpreteList", iS); fillDatalist("#selloList", sS); fillDatalist("#generoList", gS);
  populateSubcatOptions(sel.value, modo === "editar" && cd ? (cd.subcat || "") : "");
  switchModalTab("edicion"); clearValidation();
  const loanBanner = $("#loanActiveBanner");
  if (modo === "editar" && cd){
    setVal("#fNro", cd.nro); setVal("#fTitulo", upper(cd.titulo)); setVal("#fInterprete", upper(cd.interprete)); setVal("#fAnio", cd.anio ?? ""); setVal("#fAnioEdicion", cd.anioEdicion ?? ""); setVal("#fFormato", cd.formato || "CD");
    setVal("#fEstado", cd.estado || "Excelente"); setVal("#fSello", upper(cd.sello)); setVal("#fGenero", upper(cd.genero)); setVal("#fCatalogo", upper(cd.catalogo));
    setVal("#fCodigo", cd.codigo || ""); setVal("#fISRC", cd.isrc || ""); setVal("#fEdicion", upper(cd.edicion)); setVal("#fPais", upper(cd.pais));
    setVal("#fUbicacion", upper(cd.ubicacion)); setVal("#fCantidad", cd.cantidad || 1); setVal("#fAdquisicion", cd.adquisicion || "");
    setVal("#fValor", cd.valor ?? ""); setVal("#fNotas", cd.notas || ""); setVal("#fMoneda", cd.moneda || "ARS");
    setVal("#fEstadoDisco", cd.estadoDisco || ""); setVal("#fEstadoCaja", cd.estadoCaja || ""); setVal("#fEstadoFolleto", cd.estadoFolleto || ""); setVal("#fEstadoArte", cd.estadoArte || "");
    setVal("#fPrestadoA", upper(cd.prestadoA)); setVal("#fFechaPrestamo", cd.fechaPrestamo || ""); setVal("#fFechaDevolucion", cd.fechaDevolucion || ""); setVal("#fNotasPrestamo", upper(cd.notasPrestamo));
    if (cd.portada){ $("#fCoverUrl").value = cd.portada; renderCoverPreview(cd.portada, cd.portadaSource); }
    if (Loans.isLoaned(cd)){ loanBanner.style.display = "block"; loanBanner.innerHTML = `📚 <b>Prestado a:</b> ${esc(upper(cd.prestadoA))}${cd.fechaDevolucion ? ` · Devolución: ${esc(cd.fechaDevolucion)}` : ''}`; } else loanBanner.style.display = "none";
    CustomFields.renderInModal(cd.customFields || {});
  } else {
    const targetCat = sel.value || Store.catKeys()[0];
    const cds = Store.getCDs(targetCat) || [];
    const mx = cds.reduce((m, c) => Math.max(m, c.nro || 0), 0);
    setVal("#fNro", mx + 1); setVal("#fTitulo", ""); setVal("#fInterprete", App.artista ? upper(App.artista) : ""); setVal("#fAnio", ""); setVal("#fAnioEdicion", "");
    setVal("#fFormato", "CD"); setVal("#fEstado", "Excelente"); setVal("#fSello", ""); setVal("#fGenero", ""); setVal("#fCatalogo", "");
    setVal("#fCodigo", ""); setVal("#fISRC", ""); setVal("#fEdicion", ""); setVal("#fPais", "");
    setVal("#fUbicacion", ""); setVal("#fCantidad", 1); setVal("#fAdquisicion", new Date().toISOString().slice(0, 10));
    setVal("#fValor", ""); setVal("#fNotas", ""); setVal("#fMoneda", "ARS");
    setVal("#fEstadoDisco", ""); setVal("#fEstadoCaja", ""); setVal("#fEstadoFolleto", ""); setVal("#fEstadoArte", "");
    setVal("#fPrestadoA", ""); setVal("#fFechaPrestamo", ""); setVal("#fFechaDevolucion", ""); setVal("#fNotasPrestamo", "");
    loanBanner.style.display = "none";
    CustomFields.renderInModal({});
  }
  $("#modal").classList.add("open");
  setTimeout(() => $("#fTitulo").focus(), 80);
}
function cerrarModal(){
  if (_enrichTimer){ clearTimeout(_enrichTimer); _enrichTimer = null; }
  _enrichRequestId++;
  $("#modal").classList.remove("open");
  App.editing = null;
  _cdSaving = false;
  const sb = $("#btnSave"), sn = $("#btnSaveAndNew");
  if (sb) sb.disabled = false;
  if (sn) sn.disabled = false;
}
function validarForm(){
  clearValidation(); let ok = true, tt = null;
  const nro = parseInt(getVal("#fNro"), 10);
  const t = getVal("#fTitulo").trim(); const i = getVal("#fInterprete").trim();
  const a = getVal("#fAnio").trim(); const v = getVal("#fValor").trim(); const isr = getVal("#fISRC").trim().toUpperCase();
  if (!Number.isFinite(nro) || nro < 1){ $("#wrapNro").classList.add("invalid"); ok = false; }
  if (!t){ $("#wrapTitulo").classList.add("invalid"); ok = false; }
  if (!i){ $("#wrapInterprete").classList.add("invalid"); ok = false; }
  if (a !== ""){ const n = parseInt(a); if (isNaN(n) || n < 1900 || n > 2100){ $("#wrapAnio").classList.add("invalid"); ok = false; } }
  const aE = getVal("#fAnioEdicion").trim();
  if (aE !== ""){ const n = parseInt(aE); if (isNaN(n) || n < 1900 || n > 2100){ $("#wrapAnioEdicion").classList.add("invalid"); ok = false; tt = tt || "edicion"; } }
  if (v !== ""){ const n = Number(v); if (!Number.isFinite(n) || n < 0){ $("#wrapValor").classList.add("invalid"); ok = false; tt = "ubicacion"; } }
  if (isr !== "" && !ISRC_REGEX.test(isr)){ $("#wrapISRC").classList.add("invalid"); ok = false; tt = tt || "edicion"; }
  if (tt) switchModalTab(tt);
  return ok;
}
function guardarCD(e){
  if (e) e.preventDefault();
  if (_cdSaving) return false;
  if (!validarForm()){ Toast.show("Revisá los campos marcados", "err"); return false; }
  const cat = getVal("#fCat"); if (!Store.get(cat)){ Toast.show("Categoría inexistente", "err"); return false; }
  _cdSaving = true;
  const saveBtn = $("#btnSave"), saveNewBtn = $("#btnSaveAndNew");
  if (saveBtn){ saveBtn.disabled = true; }
  if (saveNewBtn){ saveNewBtn.disabled = true; }
  const unlockCD = () => { _cdSaving = false; if (saveBtn) saveBtn.disabled = false; if (saveNewBtn) saveNewBtn.disabled = false; };
  const nro = parseInt(getVal("#fNro"), 10);
  const aRaw = getVal("#fAnio").trim(); const vRaw = getVal("#fValor").trim(); const cov = $("#fCoverUrl").value.trim(); const isr = getVal("#fISRC").trim().toUpperCase();
  let valor = null; if (vRaw !== ""){ const n = Number(vRaw); if (Number.isFinite(n) && n >= 0) valor = n; }
  const data = {
    nro,
    titulo: upper(getVal("#fTitulo").trim()),
    interprete: upper(getVal("#fInterprete").trim()),
    anio: aRaw === "" ? null : parseInt(aRaw),
    anioEdicion: (() => { const e2 = getVal("#fAnioEdicion").trim(); if (e2 === "") return null; const n = parseInt(e2); return (Number.isFinite(n) && n >= 1900 && n <= 2100) ? n : null; })(),
    formato: getVal("#fFormato") || "CD", estado: getVal("#fEstado") || "Excelente",
    estadoDisco: getVal("#fEstadoDisco") || "", estadoCaja: getVal("#fEstadoCaja") || "",
    estadoFolleto: getVal("#fEstadoFolleto") || "", estadoArte: getVal("#fEstadoArte") || "",
    sello: upper(getVal("#fSello").trim()), genero: upper(getVal("#fGenero").trim()),
    catalogo: upper(getVal("#fCatalogo").trim()), codigo: upper(getVal("#fCodigo").trim()), isrc: isr,
    edicion: upper(getVal("#fEdicion").trim()), pais: upper(getVal("#fPais").trim()),
    ubicacion: upper(getVal("#fUbicacion").trim()), cantidad: Math.max(1, parseInt(getVal("#fCantidad")) || 1),
    adquisicion: getVal("#fAdquisicion") || "", valor, moneda: getVal("#fMoneda") || "ARS",
    notas: getVal("#fNotas").trim(), portada: cov || null,
    enrichmentSource: $("#fCoverUrl")?.dataset.enrichmentSource || null,
    enrichmentConfidence: $("#fCoverUrl")?.dataset.enrichmentConfidence ? Number($("#fCoverUrl").dataset.enrichmentConfidence) : null,
    enrichedAt: $("#fCoverUrl")?.dataset.enrichedAt || null,
    prestadoA: upper(getVal("#fPrestadoA").trim()), fechaPrestamo: getVal("#fFechaPrestamo") || "",
    fechaDevolucion: getVal("#fFechaDevolucion") || "", notasPrestamo: upper(getVal("#fNotasPrestamo").trim()),
    customFields: CustomFields.readFromModal(),
    subcat: getVal("#fSubcat") || null,
    links: (() => { try { const l = JSON.parse($("#fLinks").value || '{}'); return (l && typeof l === 'object' && !Array.isArray(l)) ? l : {}; } catch(e){ return {}; } })()
  };
  const wE = !!App.editing; const before = snapshotAll();
  if (wE){
    const oCat = App.editing.cat; const oList = Store.getCDs(oCat); const idx = oList.indexOf(App.editing.original);
    if (idx === -1){ Toast.show("No se encontró el original", "err"); cerrarModal(); unlockCD(); return false; }
    const oData = oList[idx];
    const cProv = { ...(oData.provenance || {}) };
    if (data.portada && data.enrichmentSource){ cProv.portada = makeProvenance(data.enrichmentSource, data.enrichmentConfidence); }
    const merged = { ...oData, ...data, provenance: cProv };
    if (oCat === cat){
      const dup = oList.findIndex((c, i2) => i2 !== idx && c.nro === nro);
      if (dup !== -1 && !confirm(`Ya existe Nº ${nro}. ¿Continuar?`)){ unlockCD(); return false; }
      oList[idx] = merged;
      /* v7.0.14-FIX: si la vista está abierta en este mismo CD, actualizamos
         App.detailCD para evitar referencias obsoletas al objeto editado. */
      if (App.detailCD && App.detailCD.id === merged.id) App.detailCD = merged;
      HistoryLog.log('EDIT', `CD editado: ${data.titulo}`, data.interprete);
      Toast.show("CD actualizado", "ok");
    } else {
      const tList = Store.getCDs(cat); let fNro = nro;
      if (tList.some(c => c.nro === fNro)){ const mx = tList.reduce((m, c) => Math.max(m, c.nro || 0), 0); const sug = mx + 1; if (!confirm(`Nº ${fNro} ocupado. ¿Usar ${sug}?`)){ unlockCD(); return false; } fNro = sug; }
      merged.nro = fNro;
      const oKey = `${oCat}|${oData.id}`; const nKey = `${cat}|${merged.id}`;
      oList.splice(idx, 1); tList.push(merged);
      if (App.selected.has(oKey)){ App.selected.delete(oKey); App.selected.add(nKey); }
      if (App.focusedKey === oKey) App.focusedKey = nKey;
      if (App.cat !== ALL_CATS) App.cat = cat;
      App.artista = null;
      if (App.detailCD && App.detailCD.id === merged.id) App.detailCD = merged;
      HistoryLog.log('EDIT', `CD movido: ${data.titulo}`, `${oCat} → ${cat}`);
      Toast.show(`Movido a "${Store.get(cat).label}" · Nº ${fNro}`, "ok", 3800);
    }
    Undo.push(oCat === cat ? "editar CD" : "mover CD", () => restoreAll(before));
  } else {
    const list = Store.getCDs(cat);
    if (list.some(c => c.nro === nro) && !confirm(`Ya existe Nº ${nro}. ¿Agregar?`)){ unlockCD(); return false; }
    const nuevo = Store.hydrate(data);
    if (data.portada && data.enrichmentSource){ nuevo.provenance = { portada: makeProvenance(data.enrichmentSource, data.enrichmentConfidence) }; }
    list.push(nuevo);
    Undo.push("agregar CD", () => restoreAll(before));
    HistoryLog.log('CREATE', `CD agregado: ${data.titulo}`, data.interprete);
    Toast.show("CD agregado a " + Store.get(cat).label, "ok");
  }
  Store.persist(); cerrarModal(); renderTabs(); renderAll();
  AutoBackup.markChange(wE ? "edición de CD" : "nuevo CD");
  return true;
}
function eliminarCD(cd){
  if (!confirm(`¿Eliminar?\n\nNº ${cd.nro}\n"${cd.titulo}"\n${cd.interprete}`)) return;
  const cat = (App.cat === ALL_CATS) ? findCategoryOfCD(cd) : App.cat;
  if (!cat){ Toast.show("No se pudo determinar la categoría", "err"); return; }
  const list = Store.getCDs(cat); const before = JSON.stringify(list);
  /* v7.0.14-FIX: buscar por id en lugar de por referencia para mayor robustez */
  const idx = list.findIndex(c => c.id === cd.id);
  if (idx === -1) return;
  list.splice(idx, 1);
  Undo.push("eliminar CD", () => { const a = Store.getCDs(cat); a.length = 0; JSON.parse(before).forEach(x => a.push(x)); Store.persist(); renderTabs(); renderAll(); });
  Store.persist(); renderTabs(); renderAll();
  HistoryLog.log('DELETE', `CD eliminado: ${cd.titulo}`, cd.interprete);
  AutoBackup.markChange("eliminación CD");
  Toast.show("CD eliminado", "warn");
}

/* ─── Exportaciones ─── */
async function exportFullJSON(){
  const o = OwnerConfig.get();
  const pl = { version: 5, appVersion: APP_VERSION, exported: new Date().toISOString(), owner: o.name || DEFAULT_AUTHOR, contact: OwnerConfig.contactLine() || DEFAULT_PHONE, categories: {} };
  for (const k of Store.catKeys()){ const c = Store.get(k); pl.categories[k] = { label: c.label, icon: c.icon, subcategories: c.subcategories || [], cds: c.cds }; }
  await saveOrDownload(`discografia_v${APP_VERSION}_backup_${timestamp()}.json`, JSON.stringify(pl, null, 2));
  HistoryLog.log('EXPORT', `Backup JSON completo`, `${Store.total()} CDs`);
}
async function exportCatJSON(){
  if (!App.cat || App.cat === ALL_CATS){ Toast.show(App.cat === ALL_CATS ? "Elegí una categoría (no 'Todas')" : "Sin categoría activa", "warn"); return; }
  const c = Store.get(App.cat);
  await saveOrDownload(`discografia_${App.cat}_${timestamp()}.json`, JSON.stringify({ version: 5, appVersion: APP_VERSION, exported: new Date().toISOString(), category: App.cat, label: c.label, icon: c.icon, subcategories: c.subcategories || [], cds: c.cds }, null, 2));
}
async function exportCatCSV(){
  if (!App.cat){ Toast.show("Sin categoría activa", "warn"); return; }
  const sep = ";";
  const e = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const cfAll = CustomFields.getAll();
  const lkCols = STREAMING_SERVICES.map(s => s.key);
  const baseHeaders = ["ID","Nro","Título","Intérprete","Año","Año edición","Formato","Estado","EstadoDisco","EstadoCaja","EstadoFolleto","EstadoArte","Sello","Género","Nº catálogo","Código de barras","ISRC","Edición","País","Ubicación","Cantidad","Fecha ingreso","Valor","Moneda","Observaciones","Portada","Fuente enriquecimiento","Confianza","Fecha enriquecimiento","PrestadoA","FechaPrestamo","FechaDevolucion","NotasPrestamo","Subcategoría"];
  const headers = [...baseHeaders, ...lkCols, ...cfAll.map(f => f.name)];
  const rows = [headers.join(sep)];
  const source = getFiltered();
  for (const cd of source){
    const cf = cd.customFields || {};
    const links = cd.links || {};
    /* v7.0.14-FIX: buscar la categoría REAL del CD (funciona también en ALL_CATS) */
    const realCatKey = App.cat === ALL_CATS ? findCategoryOfCD(cd) : App.cat;
    const realCat = realCatKey ? Store.get(realCatKey) : null;
    const subLabel = cd.subcat && realCat ? (realCat.subcategories?.find(s => s.id === cd.subcat)?.label || "") : "";
    rows.push([cd.id ?? "", cd.nro, cd.titulo, cd.interprete, cd.anio ?? "", cd.anioEdicion ?? "", cd.formato ?? "CD", cd.estado ?? "Excelente", cd.estadoDisco ?? "", cd.estadoCaja ?? "", cd.estadoFolleto ?? "", cd.estadoArte ?? "", cd.sello ?? "", cd.genero ?? "", cd.catalogo ?? "", cd.codigo ?? "", cd.isrc ?? "", cd.edicion ?? "", cd.pais ?? "", cd.ubicacion ?? "", cd.cantidad ?? 1, cd.adquisicion ?? "", cd.valor ?? "", cd.moneda ?? "ARS", cd.notas ?? "", cd.portada ?? "", cd.enrichmentSource ?? "", cd.enrichmentConfidence ?? "", cd.enrichedAt ?? "", cd.prestadoA ?? "", cd.fechaPrestamo ?? "", cd.fechaDevolucion ?? "", cd.notasPrestamo ?? "", subLabel, ...lkCols.map(k => links[k] ?? ""), ...cfAll.map(f => cf[f.id] ?? "")].map(e).join(sep));
  }
  const nm = (App.cat === ALL_CATS) ? "todas_las_categorias" : App.cat;
  await saveOrDownload(`discografia_${nm}_${timestamp()}.csv`, "\uFEFF" + rows.join("\r\n"), "text/csv");
}
async function exportCatMarkdown(){
  if (!App.cat){ Toast.show("Sin categoría activa", "warn"); return; }
  const c = (App.cat === ALL_CATS) ? { label: "Todas las categorías", icon: "🗂️" } : Store.get(App.cat);
  const cds = getFiltered();
  const lines = [`# ${c.icon} ${c.label}`, ``, `Total: **${cds.length}**`, ``, `| Nº | Título | Intérprete | Año | Portada |`, `|---:|---|---|---:|---|`];
  for (const cd of cds){ const s = v => String(v ?? "").replace(/\|/g, "\\|"); lines.push(`| ${cd.nro} | ${s(cd.titulo)} | ${s(cd.interprete)} | ${cd.anio ?? "—"} | ${cd.portada ? "✅" : "—"} |`); }
  const nm = (App.cat === ALL_CATS) ? "todas" : App.cat;
  await saveOrDownload(`discografia_${nm}_${timestamp()}.md`, lines.join("\n"), "text/markdown");
}
async function exportCatPDF(){
  if (!App.cat){ Toast.show("Sin categoría activa", "warn"); return; }
  const c = (App.cat === ALL_CATS) ? { label: "Todas las categorías", icon: "🗂️" } : Store.get(App.cat);
  const cds = sortCDs(getFiltered());
  const o = OwnerConfig.get(); const now = new Date().toLocaleString('es-AR');
  const win = window.open('', '_blank');
  if (!win){ Toast.show('Permitir popups para PDF', 'warn', 5000); return; }
  const rows = cds.map(cd => `<tr><td>${cd.nro}</td><td>${cd.portada ? `<img src="${esc(cd.portada)}" style="width:50px;height:50px;object-fit:cover;border-radius:4px">` : ''}</td><td>${esc(cd.titulo)}</td><td>${esc(cd.interprete)}</td><td>${cd.anio ?? '—'}</td><td>${cd.anioEdicion ?? '—'}</td><td>${esc(cd.formato || 'CD')}</td><td>${esc(cd.sello || '—')}</td><td>${cd.valor != null ? `${cd.moneda || 'ARS'} ${Number(cd.valor).toLocaleString('es-AR')}` : '—'}</td></tr>`).join('');
  const tV = cds.reduce((s, cd) => { const cn = Math.max(1, parseInt(cd.cantidad) || 1); return s + (cd.valor != null ? Number(cd.valor) * cn : 0); }, 0);
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(c.icon)} ${esc(c.label)} — Discografía</title><style>*{box-sizing:border-box}body{font-family:'Segoe UI',Roboto,sans-serif;padding:24px;color:#1a2332}h1{margin:0 0 4px;font-size:1.6rem}h2{margin:0 0 20px;font-size:1.1rem;color:#666;font-weight:500}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1976d2;padding-bottom:14px;margin-bottom:18px}.header .meta{text-align:right;font-size:.82rem;color:#666;line-height:1.6}.summary{display:flex;gap:20px;margin-bottom:18px;font-size:.85rem}.summary div{padding:8px 14px;background:#f5f7fa;border-radius:8px}.summary b{color:#1976d2}table{width:100%;border-collapse:collapse;font-size:.82rem}th{background:#f0f3f7;padding:9px 8px;text-align:left;border-bottom:1px solid #d5dde7;font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;color:#4a5568}td{padding:8px;border-bottom:1px solid #eee;vertical-align:middle}tr:nth-child(even) td{background:#fafbfc}.footer{margin-top:24px;padding-top:14px;border-top:1px solid #ddd;font-size:.75rem;color:#888;text-align:center}@media print{body{padding:0}thead{display:table-header-group}tr{page-break-inside:avoid}}</style></head><body><div class="header"><div><h1>${esc(c.icon)} ${esc(c.label)}</h1><h2>Discografía v${APP_VERSION} — ${esc(o.name || DEFAULT_AUTHOR)}</h2></div><div class="meta">${esc(OwnerConfig.contactLine() || DEFAULT_PHONE)}<br>Generado: ${esc(now)}</div></div><div class="summary"><div>Total: <b>${cds.length}</b> CDs</div>${tV > 0 ? `<div>Valor total: <b>$${tV.toLocaleString('es-AR', {maximumFractionDigits: 0})}</b></div>` : ''}</div><table><thead><tr><th style="width:50px">Nº</th><th style="width:60px">Portada</th><th>Título</th><th>Intérprete</th><th style="width:60px">Año</th><th style="width:60px">Año ed.</th><th style="width:70px">Formato</th><th>Sello</th><th style="width:90px">Valor</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Discografía v${APP_VERSION} — ${esc(o.name || DEFAULT_AUTHOR)} — ${esc(COPYRIGHT_TEXT)}</div><script>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
  HistoryLog.log('EXPORT', `PDF: ${c.label}`, `${cds.length} CDs`);
}

/* ─── Importar ─── */
function detectDelimiter(t){ const f = String(t).split(/\r?\n/)[0] || ""; return (f.match(/;/g) || []).length >= (f.match(/,/g) || []).length ? ";" : ","; }
function parseCSV(text, delim){
  const d = delim || detectDelimiter(text);
  const rows = []; let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i], n = text[i+1];
    if (inQ){ if (c === '"' && n === '"'){ cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c; }
    else { if (c === '"') inQ = true; else if (c === d){ row.push(cur); cur = ""; } else if (c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ""; } else if (c === '\r'){} else cur += c; }
  }
  if (cur !== "" || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}
function importCSV(file, text){
  if (!App.cat || App.cat === ALL_CATS){ Toast.show("Elegí una categoría primero (no 'Todas')", "warn"); return; }
  const rows = parseCSV(text);
  if (rows.length < 2){ Toast.show("CSV vacío o inválido", "err"); return; }
  const nh = h => String(h || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  const header = rows[0].map(nh);
  const find = (...a) => header.findIndex(h => a.some(x => h === x || h.includes(x)));
  const linkIdx = {};
  for (const svc of STREAMING_SERVICES){ linkIdx[svc.key] = find(svc.key, svc.name.toLowerCase()); }
  const subcatIdx = find("subcategoria", "subcategory");
  const idx = { id: find("id","uuid"), nro: find("nro","numero"), titulo: find("titulo","title","album"), interprete: find("interprete","artista","artist"), anio: find("ano","year"), anioEdicion: find("ano edicion","year edition","edition year"), formato: find("formato","format"), estado: find("estado","condition"), estadoDisco: find("estadodisco"), estadoCaja: find("estadocaja"), estadoFolleto: find("estadofolleto"), estadoArte: find("estadoarte"), sello: find("sello","label"), genero: find("genero","genre"), catalogo: find("catalogo","catno"), codigo: find("codigo","barcode"), isrc: find("isrc"), edicion: find("edicion"), pais: find("pais"), ubicacion: find("ubicacion"), cantidad: find("cantidad"), adquisicion: find("adquisicion"), valor: find("valor","value"), moneda: find("moneda","currency"), notas: find("notas"), portada: find("portada","cover"), prestadoA: find("prestadoa"), fechaPrestamo: find("fechaprestamo"), fechaDevolucion: find("fechadevolucion"), notasPrestamo: find("notasprestamo") };
  const catObj = Store.get(App.cat);
  function resolveSubId(label){
    if (!label || !catObj) return null;
    const clean = String(label).trim().toLowerCase();
    const sub = (catObj.subcategories || []).find(s => s.label.toLowerCase() === clean);
    return sub ? sub.id : null;
  }
  const nuevos = rows.slice(1).map(r => {
    const g = i => i >= 0 ? (r[i] || "").trim() : "";
    const aRaw = g(idx.anio); const eRaw = g(idx.anioEdicion); const vRaw = g(idx.valor); const rNro = parseInt(g(idx.nro), 10);
    let valor = null; if (vRaw !== ""){ const v = Number(vRaw); if (Number.isFinite(v) && v >= 0) valor = v; }
    const links = {};
    for (const svc of STREAMING_SERVICES){ const v = g(linkIdx[svc.key]); if (v) links[svc.key] = v; }
    const subcatId = resolveSubId(g(subcatIdx));
    return Store.hydrate({ id: g(idx.id) || undefined, links, subcat: subcatId, nro: Number.isFinite(rNro) && rNro >= 1 ? rNro : 0, titulo: upper(g(idx.titulo)), interprete: upper(g(idx.interprete)), anio: aRaw === "" ? null : parseInt(aRaw), anioEdicion: eRaw === "" ? null : parseInt(eRaw), formato: g(idx.formato) || "CD", estado: g(idx.estado) || "Excelente", estadoDisco: g(idx.estadoDisco), estadoCaja: g(idx.estadoCaja), estadoFolleto: g(idx.estadoFolleto), estadoArte: g(idx.estadoArte), sello: upper(g(idx.sello)), genero: upper(g(idx.genero)), catalogo: upper(g(idx.catalogo)), codigo: upper(g(idx.codigo)), isrc: g(idx.isrc), edicion: upper(g(idx.edicion)), pais: upper(g(idx.pais)), ubicacion: upper(g(idx.ubicacion)), cantidad: parseInt(g(idx.cantidad)) || 1, adquisicion: g(idx.adquisicion), valor, moneda: g(idx.moneda) || "ARS", notas: g(idx.notas), portada: g(idx.portada) || null, prestadoA: upper(g(idx.prestadoA)), fechaPrestamo: g(idx.fechaPrestamo), fechaDevolucion: g(idx.fechaDevolucion), notasPrestamo: upper(g(idx.notasPrestamo)) });
  }).filter(c => c.titulo || c.interprete);
  if (!nuevos.length){ Toast.show("No se encontraron CDs", "err"); return; }
  const modo = confirm(`CSV con ${nuevos.length} CDs.\n\n• Aceptar: REEMPLAZAR.\n• Cancelar: AGREGAR.`);
  const list = Store.getCDs(App.cat); const before = JSON.stringify(list);
  if (modo){ list.length = 0; nuevos.forEach(c => list.push(c)); }
  else { let mx = list.reduce((m, c) => Math.max(m, c.nro || 0), 0); for (const cd of nuevos){ if (!cd.nro || cd.nro <= mx) cd.nro = ++mx; else mx = cd.nro; list.push(cd); } }
  Undo.push("importar CSV", () => { const a = Store.getCDs(App.cat); a.length = 0; JSON.parse(before).forEach(x => a.push(x)); Store.persist(); renderTabs(); renderAll(); });
  Store.persist(); renderTabs(); renderAll();
  HistoryLog.log('IMPORT', `CSV importado`, `${nuevos.length} CDs`);
  AutoBackup.markChange("importación CSV");
  Toast.show(`Importados ${nuevos.length} CDs`, "ok");
}
function importFile(file){
  if (!file){ Toast.show("No se recibió archivo", "err"); return; }
  const ext = (file.name || "").toLowerCase().split(".").pop();
  if (ext !== "json" && ext !== "csv"){ if (!confirm(`"${file.name}" no es .json ni .csv. ¿Intentar como JSON?`)) return; }
  const reader = new FileReader();
  reader.onerror = () => Toast.show("No se pudo leer", "err", 9000);
  reader.onload = (e) => {
    const text = String(e.target.result || "");
    if (!text.trim()){ Toast.show("Archivo vacío", "err"); return; }
    if (ext === "csv"){ try { importCSV(file, text); } catch(err){ Toast.show("Error CSV: " + err.message, "err", 6000); } return; }
    const clean = text.replace(/^\uFEFF/, "");
    try { const data = JSON.parse(clean); procesarImportJSON(data); }
    catch(err){ Toast.show("JSON inválido: " + err.message, "err", 9000); }
  };
  try { reader.readAsText(file, "utf-8"); } catch(err){ Toast.show("Error: " + err.message, "err", 6000); }
}
function procesarImportJSON(data){
  if (data && data.categories && typeof data.categories === "object"){
    const cn = Object.keys(data.categories);
    const tc = Object.values(data.categories).reduce((s, c) => s + (c.cds?.length || 0), 0);
    if (!confirm(`Backup COMPLETO.\n\nCategorías: ${cn.length}\nCDs: ${tc}\n\n¿REEMPLAZAR toda la base?`)) return;
    const before = JSON.stringify(Store.categories());
    Store.replaceAll(data); NotFoundList.clear();
    Undo.push("importar backup", () => { Store.replaceAll({ categories: JSON.parse(before) }); ensureValidCat(); renderTabs(); renderAll(); });
    App.artista = null; App.q = ""; App.selected.clear(); App.focusedKey = null; App.subcat = null;
    $("#q").value = ""; $("#searchBox").classList.remove("has-value");
    ensureValidCat(); renderTabs(); renderAll();
    HistoryLog.log('IMPORT', 'Backup importado', `${tc} CDs en ${cn.length} categorías`);
    AutoBackup.markChange("importación backup");
    Toast.show(`Backup importado: ${tc} CDs`, "ok", 4000);
    return;
  }
  if (data && Array.isArray(data.cds)){
    let cat = data.category;
    if (!cat || !Store.get(cat)){ if (!confirm(`¿Crear categoría "${data.label || data.category || 'nueva'}"?`)) return; cat = Store.addCategory({ label: data.label || data.category || "Importada", icon: data.icon || "📀" }); App.cat = cat; }
    const modo = confirm(`Categoría: ${Store.get(cat).label}\nCDs: ${data.cds.length}\n\n• Aceptar: REEMPLAZAR.\n• Cancelar: AGREGAR.`);
    const list = Store.getCDs(cat); const before = JSON.stringify(list); const nuevos = data.cds.map(Store.hydrate);
    if (modo){ list.length = 0; nuevos.forEach(c => list.push(c)); }
    else { let mx = list.reduce((m, c) => Math.max(m, c.nro || 0), 0); for (const cd of nuevos){ if (!cd.nro || cd.nro <= mx) cd.nro = ++mx; else mx = cd.nro; list.push(cd); } }
    Undo.push("importar categoría", () => { const a = Store.getCDs(cat); a.length = 0; JSON.parse(before).forEach(x => a.push(x)); Store.persist(); renderTabs(); renderAll(); });
    Store.persist(); App.cat = cat; App.artista = null;
    ensureValidCat(); renderTabs(); renderAll();
    HistoryLog.log('IMPORT', `Categoría importada`, `${nuevos.length} CDs`);
    AutoBackup.markChange("importación categoría");
    Toast.show("Categoría importada", "ok");
    return;
  }
  if (Array.isArray(data)){
    if (!App.cat || App.cat === ALL_CATS){ Toast.show("Elegí una categoría primero", "warn"); return; }
    const modo = confirm(`Array de ${data.length} CDs.\n\n• Aceptar: REEMPLAZAR.\n• Cancelar: AGREGAR.`);
    const list = Store.getCDs(App.cat); const before = JSON.stringify(list); const nuevos = data.map(Store.hydrate);
    if (modo){ list.length = 0; nuevos.forEach(c => list.push(c)); }
    else { let mx = list.reduce((m, c) => Math.max(m, c.nro || 0), 0); for (const cd of nuevos){ if (!cd.nro || cd.nro <= mx) cd.nro = ++mx; else mx = cd.nro; list.push(cd); } }
    Undo.push("importar array", () => { const a = Store.getCDs(App.cat); a.length = 0; JSON.parse(before).forEach(x => a.push(x)); Store.persist(); renderTabs(); renderAll(); });
    Store.persist(); renderTabs(); renderAll();
    HistoryLog.log('IMPORT', `Array importado`, `${nuevos.length} CDs`);
    AutoBackup.markChange("importación array");
    Toast.show("Importación completada", "ok");
    return;
  }
  Toast.show("Formato no reconocido", "err", 6000);
}
function importarDesdeTexto(t){
  const clean = String(t || "").trim().replace(/^\uFEFF/, "");
  if (!clean){ Toast.show("Pegá el contenido primero", "warn"); return false; }
  try { const data = JSON.parse(clean); procesarImportJSON(data); return true; }
  catch(err){ Toast.show("JSON inválido: " + err.message, "err", 7000); return false; }
}

/* ─── Bulk (acciones sobre selección) ─── */
function bulkDelete(){
  const keys = [...App.selected]; if (!keys.length) return;
  if (!confirm(`¿Eliminar ${keys.length} CDs?`)) return;
  const snap = snapshotAll(); let rem = 0;
  for (const k of keys){ const { cat, id } = parseCDKey(k); const l = Store.getCDs(cat); const i = l.findIndex(c => c.id === id); if (i !== -1){ l.splice(i, 1); rem++; } }
  App.selected.clear();
  Undo.push("eliminar seleccionados", () => restoreAll(snap));
  Store.persist(); renderTabs(); renderAll();
  HistoryLog.log('DELETE', `Eliminación masiva`, `${rem} CDs`);
  AutoBackup.markChange("eliminación masiva");
  Toast.show(`Eliminados ${rem} CDs`, "warn");
}
function bulkSetEstado(){
  const keys = [...App.selected]; if (!keys.length) return;
  const e = prompt("Nuevo estado:", "Excelente"); if (!e) return;
  const snap = snapshotAll();
  for (const k of keys){ const { cat, id } = parseCDKey(k); const cd = Store.getCDs(cat).find(c => c.id === id); if (cd) cd.estado = e; }
  Undo.push("estado masivo", () => restoreAll(snap));
  Store.persist(); renderAll();
  HistoryLog.log('EDIT', `Estado masivo`, `${keys.length} CDs → ${e}`);
  AutoBackup.markChange("actualización masiva estado");
  Toast.show(`Actualizado en ${keys.length} CDs`, "ok");
}
function bulkSetUbicacion(){
  const keys = [...App.selected]; if (!keys.length) return;
  const u = prompt("Nueva ubicación:"); if (u === null) return;
  const snap = snapshotAll();
  for (const k of keys){ const { cat, id } = parseCDKey(k); const cd = Store.getCDs(cat).find(c => c.id === id); if (cd) cd.ubicacion = upper(u); }
  Undo.push("ubicación masiva", () => restoreAll(snap));
  Store.persist(); renderAll();
  HistoryLog.log('EDIT', `Ubicación masiva`, `${keys.length} CDs → ${upper(u)}`);
  AutoBackup.markChange("actualización masiva ubicación");
  Toast.show(`Actualizado en ${keys.length} CDs`, "ok");
}
let _bulkMoveTarget = null;
function bulkMoveCategoria(){
  const keys = [...App.selected]; if (!keys.length){ Toast.show("Seleccioná al menos uno", "warn"); return; }
  const ck = Store.catKeys();
  if (ck.length < 2){ Toast.show("Necesitás al menos 2 categorías", "warn"); return; }
  _bulkMoveTarget = null;
  $("#bulkMoveCount").textContent = keys.length; $("#bulkMoveKeepNro").checked = false; $("#bulkMovePreview").style.display = "none"; $("#bulkMoveConfirm").disabled = true;
  const list = $("#bulkMoveCatList"); list.innerHTML = "";
  const current = new Set(keys.map(k => parseCDKey(k).cat));
  for (const k of ck){
    const cat = Store.get(k); const isCur = current.size === 1 && current.has(k);
    const it = document.createElement("button"); it.type = "button"; it.className = "bulk-move-item"; it.disabled = isCur;
    it.innerHTML = `<span style="font-size:1.3rem">${esc(cat.icon)}</span><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(cat.label)}</span><span style="display:block;font-size:.7rem;color:var(--muted);margin-top:2px">${cat.cds.length} CD${cat.cds.length === 1 ? "" : "s"}${isCur ? " · (actual)" : ""}</span></span><span class="bulk-move-check" style="width:18px;height:18px;border-radius:50%;border:2px solid var(--line);flex:0 0 auto;transition:.15s"></span>`;
    if (!isCur){ it.addEventListener("click", () => selectBulkMoveTarget(k)); }
    list.appendChild(it);
  }
  $("#bulkMoveModal").classList.add("open");
}
function selectBulkMoveTarget(k){
  _bulkMoveTarget = k;
  const list = $("#bulkMoveCatList");
  const items = [...list.querySelectorAll(".bulk-move-item")];
  const ck = Store.catKeys();
  items.forEach((el, i) => {
    const kk = ck[i]; const sel = kk === k; if (el.disabled) return;
    el.style.borderColor = sel ? "var(--accent)" : "var(--line)";
    el.style.background = sel ? "rgba(79,195,247,.12)" : "rgba(255,255,255,.02)";
    el.style.color = sel ? "var(--accent)" : "var(--txt)";
    const c = el.querySelector(".bulk-move-check");
    if (c){ c.style.borderColor = sel ? "var(--accent)" : "var(--line)"; c.style.background = sel ? "var(--accent)" : "transparent"; c.style.boxShadow = sel ? "inset 0 0 0 3px var(--bg2)" : "none"; }
  });
  $("#bulkMoveConfirm").disabled = false;
  renderBulkMovePreview();
}
function renderBulkMovePreview(){
  const prev = $("#bulkMovePreview"); if (!_bulkMoveTarget){ prev.style.display = "none"; return; }
  const keys = [...App.selected]; const tc = Store.get(_bulkMoveTarget);
  const keepN = $("#bulkMoveKeepNro").checked;
  const tl = Store.getCDs(_bulkMoveTarget);
  const used = new Set(tl.map(c => c.nro));
  let mx = tl.reduce((m, c) => Math.max(m, c.nro || 0), 0);
  const asg = [];
  for (const k of keys){
    const { cat, id } = parseCDKey(k); if (cat === _bulkMoveTarget) continue;
    const cd = Store.getCDs(cat).find(c => c.id === id); if (!cd) continue;
    let nn;
    if (keepN){ nn = cd.nro; while (used.has(nn)) nn = ++mx; mx = Math.max(mx, nn); }
    else nn = ++mx;
    used.add(nn); asg.push({ titulo: cd.titulo, oldNro: cd.nro, newNro: nn });
  }
  if (!asg.length){ prev.style.display = "none"; return; }
  const shown = asg.slice(0, 6); const more = asg.length - shown.length;
  prev.style.display = "block";
  prev.innerHTML = `<div style="font-weight:600;color:var(--txt);margin-bottom:8px">Se moverán <b style="color:var(--accent)">${asg.length}</b> CDs a <b style="color:var(--accent)">${esc(tc.icon)} ${esc(tc.label)}</b></div><div style="display:flex;flex-direction:column;gap:4px;font-size:.78rem">${shown.map(a => `<div style="display:flex;gap:8px;align-items:center"><span style="color:var(--muted);font-variant-numeric:tabular-nums">#${a.oldNro}</span><span style="color:var(--line)">→</span><span style="color:var(--accent);font-variant-numeric:tabular-nums;font-weight:700">#${a.newNro}</span><span style="overflow:hidden;text-overflow:ellipsis">${esc(a.titulo)}</span></div>`).join('')}${more > 0 ? `<div style="color:var(--muted);font-style:italic;padding-top:4px">…y ${more} más</div>` : ''}</div>`;
}
function closeBulkMoveModal(){ $("#bulkMoveModal").classList.remove("open"); _bulkMoveTarget = null; }
function confirmBulkMove(){
  if (!_bulkMoveTarget){ Toast.show("Elegí categoría destino", "warn"); return; }
  const keys = [...App.selected]; const tc = _bulkMoveTarget; const keepN = $("#bulkMoveKeepNro").checked;
  const tl = Store.getCDs(tc); const snap = snapshotAll();
  const used = new Set(tl.map(c => c.nro)); let mx = tl.reduce((m, c) => Math.max(m, c.nro || 0), 0); let moved = 0;
  for (const k of keys){
    const { cat, id } = parseCDKey(k); if (cat === tc) continue;
    const l = Store.getCDs(cat); const i = l.findIndex(c => c.id === id); if (i === -1) continue;
    const cd = l[i]; l.splice(i, 1);
    let nn;
    /* v7.0.14-FIX: al conservar Nº, evitamos colisiones porque el `used` se
       actualiza a medida que asignamos; también evitamos el bug de "mx fijo"
       que producía duplicados en el destino. */
    if (keepN){ nn = cd.nro; while (used.has(nn)) nn = ++mx; mx = Math.max(mx, nn); }
    else nn = ++mx;
    used.add(nn); cd.nro = nn; tl.push(cd); moved++;
  }
  App.selected.clear();
  Undo.push("mover CDs", () => restoreAll(snap));
  Store.persist(); renderTabs(); renderAll();
  HistoryLog.log('EDIT', `Movimiento masivo`, `${moved} CDs → ${Store.get(tc).label}`);
  AutoBackup.markChange("movimiento masivo");
  closeBulkMoveModal();
  if (moved === 0) Toast.show("Ningún CD fue movido", "warn");
  else Toast.show(`Movidos ${moved} CDs a "${Store.get(tc).label}"`, "ok", 3800);
}
let _bulkCoversRunning = false;
async function bulkFetchCovers(){
  if (_bulkCoversRunning){ Toast.show("Ya hay una búsqueda en curso", "warn"); return; }
  const keys = [...App.selected]; if (!keys.length) return;
  if (!confirm(`¿Buscar portadas para ${keys.length} CDs?`)) return;
  _bulkCoversRunning = true; const snap = snapshotAll();
  const bar = $("#selectionBar");
  /* v7.0.14-FIX: guardamos los nodos originales en vez de reemplazar todo el
     innerHTML y volver a attachear (lo que duplicaba listeners). */
  const originalNodes = [...bar.children].map(n => n.cloneNode(true));
  const originalHTML = bar.innerHTML;
  let found = 0, nf = 0, al = 0, idx = 0; const total = keys.length;
  bar.innerHTML = `<span style="flex:1;display:flex;align-items:center;gap:10px"><span class="disc-loader"></span><b>🖼️ Buscando…</b> <span id="bulkCoverProgress">0/${total}</span></span><div style="width:200px;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div id="bulkCoverBar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--purple));transition:width .2s"></div></div><button type="button" class="btn danger" id="bulkCoverCancel">⏹️ Detener</button>`;
  let cancelled = false;
  const cb = $("#bulkCoverCancel"); if (cb) cb.addEventListener("click", () => { cancelled = true; cb.disabled = true; cb.textContent = "Deteniendo…"; });
  try {
    for (const k of keys){
      if (cancelled) break; if (!$("#bulkCoverProgress")) break;
      idx++;
      const { cat, id } = parseCDKey(k); const cd = Store.getCDs(cat).find(c => c.id === id);
      const pe = $("#bulkCoverProgress"); if (pe) pe.textContent = `${idx}/${total}`;
      const be = $("#bulkCoverBar"); if (be) be.style.width = `${idx/total*100}%`;
      if (!cd) continue;
      if (cd.portada){ al++; continue; }
      const rk = cdKey(cat, cd); const row = findRowByKey(rk);
      if (row && (App.cat === ALL_CATS || cat === App.cat)) row.classList.add("enriching");
      try {
        const info = await enrichFromChain(cd.titulo, cd.interprete, { hints: { anio: cd.anio, pais: cd.pais, sello: cd.sello, catalogo: cd.catalogo, barcode: cd.codigo } });
        if (info && info.portada){ cd.portada = info.portada; cd.portadaSource = info.portadaSource; cd.provenance = cd.provenance || {}; cd.provenance.portada = makeProvenance(info.source, info.confidence); found++; }
        else nf++;
      } catch(e){ nf++; }
      if (row && (App.cat === ALL_CATS || cat === App.cat)) row.classList.remove("enriching");
      await new Promise(r => setTimeout(r, 800));
    }
  } finally {
    Store.persist();
    Undo.push("buscar portadas", () => restoreAll(snap));
    /* v7.0.14-FIX: restauramos innerHTML y volvemos a bindear UNA sola vez. */
    bar.innerHTML = originalHTML;
    if (typeof attachSelectionBarEvents === 'function') attachSelectionBarEvents();
    renderTabs(); renderAll();
    HistoryLog.log('ENRICH', `Portadas masivas`, `${found} encontradas`);
    AutoBackup.markChange(`búsqueda masiva portadas (${found})`);
    if (cancelled) Toast.show(`Cancelado. ${found} encontradas · ${al} ya tenían · ${nf} sin resultados`, "warn", 6000);
    else Toast.show(`Portadas: ${found} · ${al} ya tenían · ${nf} sin resultados`, "ok", 6000);
    _bulkCoversRunning = false;
  }
}

/* ─── Modales auxiliares ─── */
function abrirPasteModal(){ $("#pasteArea").value = ""; $("#pasteModal").classList.add("open"); }
function cerrarPasteModal(){ $("#pasteModal").classList.remove("open"); }
async function abrirSelectorModerno(){
  if (!window.showOpenFilePicker){ Toast.show("Navegador sin soporte", "warn", 6000); return; }
  try {
    const opts = { multiple: false, types: [{ description: "Backup JSON o CSV", accept: { "application/json": [".json"], "text/csv": [".csv"] } }] };
    if (FileSystemDefault.isSet() && FileSystemDefault.isSupported()){ try { opts.startIn = FileSystemDefault.getHandle(); } catch(e){} }
    const [h] = await window.showOpenFilePicker(opts);
    const f = await h.getFile(); importFile(f);
  } catch(err){ if (err.name === "AbortError") return; Toast.show("Error: " + err.message, "err", 6000); }
}
async function importFromDefaultFolder(){
  if (!FileSystemDefault.isSet()){ Toast.show("Configurá una carpeta primero", "warn"); openFolderConfig(); return; }
  if (FileSystemDefault.getMode() === 'tauri'){ await openFolderBrowser(); Toast.show("Elegí el archivo de la lista y tocá 'Restaurar'", "info", 4500); return; }
  if (!FileSystemDefault.isSupported() || !window.showOpenFilePicker){ Toast.show("Navegador sin soporte", "warn", 5000); abrirSelectorModerno(); return; }
  try {
    const [h] = await window.showOpenFilePicker({ multiple: false, startIn: FileSystemDefault.getHandle(), types: [{ description: "Backup JSON o CSV", accept: { "application/json": [".json"], "text/csv": [".csv"] } }] });
    const f = await h.getFile(); importFile(f);
  } catch(err){ if (err.name === "AbortError") return; Toast.show("Error: " + err.message, "err", 6000); }
}
function switchManualSection(s){ $$("#manualNav button").forEach(b => b.classList.toggle("active", b.dataset.sec === s)); $$(".manual-section").forEach(x => x.classList.toggle("active", x.dataset.sec === s)); const c = $("#manualContent"); if (c) c.scrollTop = 0; }
function openOwnerConfig(){ const m = $("#ownerConfigModal"); if (!m) return; const o = OwnerConfig.get(); $("#ownerNameInput").value = o.name || ""; $("#ownerContactInput").value = o.contact || ""; $("#ownerEmailInput").value = o.email || ""; m.classList.add("open"); }
function closeOwnerConfig(){ $("#ownerConfigModal")?.classList.remove("open"); }
function openExitModal(){
  const st = $("#stTotal")?.textContent || "0";
  $("#exitTotal").textContent = st;
  const lastSaved = $("#fModified")?.textContent?.replace("· ", "") || "Sin datos";
  $("#exitLastSaved").textContent = lastSaved;
  $("#exitExportCheck").checked = false;
  $("#exitConfirm").disabled = true;
  $("#exitModal").classList.add("open");
}
function closeExitModal(){ $("#exitModal").classList.remove("open"); }

function attachSelectionBarEvents(){
  $("#btnSelCancel")?.addEventListener("click", () => {
    App.selected.clear();
    $$("#tbodyCD tr").forEach(tr => { tr.classList.remove("selected"); const cb = tr.querySelector("td.check input"); if (cb) cb.checked = false; });
    $("#checkAll").checked = false; $("#checkAll").indeterminate = false; updateSelectionBar();
    if (GridView.isEnabled()) GridView.render();
  });
  $("#btnSelEliminar")?.addEventListener("click", bulkDelete);
  $("#btnSelEstado")?.addEventListener("click", bulkSetEstado);
  $("#btnSelUbicacion")?.addEventListener("click", bulkSetUbicacion);
  $("#btnSelMover")?.addEventListener("click", bulkMoveCategoria);
  $("#btnSelCover")?.addEventListener("click", bulkFetchCovers);
}

/* =========================================================================
   [FIN app-ui-3-modal.js]
   Ahora pegá el contenido de app-ui-4-init.js justo debajo.
   ========================================================================= */