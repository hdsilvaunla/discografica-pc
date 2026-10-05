/* =========================================================================
   DISCOGRAFÍA v7.0.14 — UI Parte 4/4: Eventos, teclado, corrector, init
   Autor: HDSystem IT · Tel: +54 9 11 4563-0851
   Depende de: TODOS los archivos anteriores
   =========================================================================
   [PARTE 4/4] INICIO
   ========================================================================= */

function bindEvents(){
  const q = $("#q"); const onS = debounce(() => { App.q = q.value; renderAll(); }, 140);
  q.addEventListener("input", () => {
    $("#searchBox").classList.toggle("has-value", q.value.length > 0);
    const badge = $("#advModeBadge");
    if (badge) badge.style.display = AdvancedSearch.isAdvanced(q.value) ? "" : "none";
    onS();
  });
  $("#clearQ").addEventListener("click", () => { q.value = ""; App.q = ""; $("#searchBox").classList.remove("has-value"); const b = $("#advModeBadge"); if (b) b.style.display = "none"; renderAll(); q.focus(); });
  $$("#tablaCD thead th[data-key]").forEach(th => { th.addEventListener("click", () => { const k = th.dataset.key; if (App.sortKey === k) App.sortDir *= -1; else { App.sortKey = k; App.sortDir = 1; } renderTabla(); }); });
  $("#btnNuevo").addEventListener("click", () => abrirModal("nuevo"));
  $("#btnNuevaCat").addEventListener("click", () => abrirModalCategoria("crear"));
  $("#btnNuevaCatEmpty")?.addEventListener("click", () => abrirModalCategoria("crear"));
  $("#btnVista").addEventListener("click", () => setView(App.view === "dashboard" ? "table" : "dashboard"));
  $("#btnUndo")?.addEventListener("click", () => Undo.pop());
  $("#btnGrid")?.addEventListener("click", () => GridView.setEnabled(!GridView.isEnabled()));
  $("#fabVerTodos")?.addEventListener("click", () => { App.artista = null; renderAll(); const t = $("#tableView"); if (t) t.scrollIntoView({behavior:"smooth",block:"start"}); Toast.show("Mostrando todos", "ok", 2000); });
  $("#artFilterClear")?.addEventListener("click", () => { App.artista = null; renderAll(); const t = $("#tableView"); if (t) t.scrollIntoView({behavior:"smooth",block:"start"}); Toast.show("Mostrando todos", "ok", 2000); });

  function updateArtSortBtn(){
    const btn = $("#btnArtSort"); if (!btn) return;
    const mode = Store.getPref('artSort', 'count');
    if (mode === 'alpha'){ btn.textContent = '🔤 A-Z'; btn.title = 'Clic para ordenar Z-A'; }
    else if (mode === 'alpha-desc'){ btn.textContent = '🔤 Z-A'; btn.title = 'Clic para ordenar por cantidad'; }
    else { btn.textContent = '🔢 Cantidad'; btn.title = 'Clic para ordenar A-Z'; }
  }
  updateArtSortBtn();
  $("#btnArtSort")?.addEventListener("click", () => {
    const cur = Store.getPref('artSort', 'count');
    const next = cur === 'count' ? 'alpha' : (cur === 'alpha' ? 'alpha-desc' : 'count');
    Store.setPref('artSort', next);
    updateArtSortBtn();
    renderArtistas();
    const msg = next === 'alpha' ? '🔤 Orden A → Z' : next === 'alpha-desc' ? '🔤 Orden Z → A' : '🔢 Orden por cantidad';
    Toast.show(msg, 'info', 1600);
  });

  let rt = null;
  window.addEventListener("resize", () => { if (rt) clearTimeout(rt); rt = setTimeout(() => { fixMobileViewport(); renderAll(); }, 200); });
  window.addEventListener('orientationchange', () => setTimeout(() => { fixMobileViewport(); renderAll(); }, 300));

  $("#btnFiltros").addEventListener("click", () => { const p = $("#filtersPanel"); p.classList.toggle("open"); $("#btnFiltros").classList.toggle("active", p.classList.contains("open")); });
  const fI = { estado:"#fFiltroEstado", formato:"#fFiltroFormato", anioDesde:"#fFiltroAnioDesde", anioHasta:"#fFiltroAnioHasta", ubicacion:"#fFiltroUbicacion", portada:"#fFiltroPortada", prestamo:"#fFiltroPrestamo" };
  for (const k in fI){ $(fI[k]).addEventListener("input", debounce(() => { App.filters[k] = $(fI[k]).value; renderAll(); }, 200)); }
  $("#btnLimpiarFiltros").addEventListener("click", () => { for (const k in fI){ $(fI[k]).value = ""; App.filters[k] = ""; } renderAll(); });

  const di = $("#ddImport"), dim = $("#ddImportMenu");
  $("#btnImportarDropdown")?.addEventListener("click", e => { e.stopPropagation(); dim.style.display = dim.style.display === "none" ? "block" : "none"; di.classList.toggle("open"); });
  document.addEventListener("click", e => { if (!di.contains(e.target)){ dim.style.display = "none"; di.classList.remove("open"); } });
  dim.querySelectorAll("button, [data-act='import-file']").forEach(b => { b.addEventListener("click", () => {
    const a = b.dataset.act; dim.style.display = "none"; di.classList.remove("open");
    if (a === "import-file") $("#fileInput")?.click();
    else if (a === "import-folder") importFromDefaultFolder();
    else if (a === "import-modern") abrirSelectorModerno();
    else if (a === "import-paste") abrirPasteModal();
    else if (a === "folder-config") openFolderConfig();
  }); });

  const de = $("#ddExport"), dem = $("#ddExportMenu");
  $("#btnExportar").addEventListener("click", e => { e.stopPropagation(); dem.style.display = dem.style.display === "none" ? "block" : "none"; de.classList.toggle("open"); });
  document.addEventListener("click", e => { if (!de.contains(e.target)){ dem.style.display = "none"; de.classList.remove("open"); } });
  dem.querySelectorAll("button").forEach(b => { b.addEventListener("click", () => {
    const a = b.dataset.act; dem.style.display = "none"; de.classList.remove("open");
    if (a === "export-full-json") exportFullJSON();
    else if (a === "export-cat-json") exportCatJSON();
    else if (a === "export-cat-csv") exportCatCSV();
    else if (a === "export-cat-md") exportCatMarkdown();
    else if (a === "export-cat-pdf") exportCatPDF();
    else if (a === "folder-browser") openFolderBrowser();
    else if (a === "folder-config") openFolderConfig();
    else if (a === "print") window.print();
  }); });

  const dm = $("#ddMore"), dmm = $("#ddMoreMenu");
  $("#btnMore")?.addEventListener("click", e => { e.stopPropagation(); dmm.style.display = dmm.style.display === "none" ? "block" : "none"; dm.classList.toggle("open"); });
  document.addEventListener("click", e => { if (!dm.contains(e.target)){ dmm.style.display = "none"; dm.classList.remove("open"); } });
  dmm.querySelectorAll("button").forEach(b => { b.addEventListener("click", () => {
    const a = b.dataset.act;
    dmm.style.display = "none";
    dm.classList.remove("open");
    setTimeout(() => {
      try {
        if (a === "owner-config") openOwnerConfig();
        else if (a === "discogs-config") openDiscogsConfig();
        else if (a === "lastfm-config") {
          if (typeof openLastFmConfig === 'function') openLastFmConfig();
          else { console.error('[UI] openLastFmConfig no está definida'); Toast.show('⚠️ Last.fm no disponible', 'err', 5000); }
        }
        else if (a === "folder-config") openFolderConfig();
        else if (a === "clear-cache"){ if (confirm("¿Vaciar caché?")){ MetadataCache.clear(); ResolvedLinks.clear(); Toast.show("🧹 Caché vaciada", "ok", 3200); } }
        else if (a === "diag-network") openNetworkDiag();
        else if (a === "reload") location.reload();
        else if (a === "show-legal") openLegalModal();
        else if (a === "export-legal-pdf") exportLegalPDF();
        else if (a === "reset") $("#btnReset")?.click();
      } catch(err){
        console.error('[UI] Error en acción "' + a + '":', err);
        Toast.show('⚠️ Error: ' + err.message, 'err', 5000);
      }
    }, 20);
  }); });

  const hF = (e) => { const f = e.target.files?.[0]; if (!f) return; importFile(f); e.target.value = ""; };
  $("#fileInput")?.addEventListener("change", hF);
  $("#fileInputEmpty")?.addEventListener("change", hF);
  $("#btnImportarModernoEmpty")?.addEventListener("click", abrirSelectorModerno);
  $("#btnPegarEmpty")?.addEventListener("click", abrirPasteModal);
  $("#pasteClose")?.addEventListener("click", cerrarPasteModal);
  $("#pasteCancel")?.addEventListener("click", cerrarPasteModal);
  $("#pasteModal")?.addEventListener("click", e => { if (e.target.id === "pasteModal") cerrarPasteModal(); });
  $("#pasteImport")?.addEventListener("click", () => { if (importarDesdeTexto($("#pasteArea").value)) cerrarPasteModal(); });

  ["dragenter","dragover"].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
  document.addEventListener("drop", e => {
    if (e.target.closest?.("#dropZone")) return;
    e.preventDefault(); e.stopPropagation();
    const dt = e.dataTransfer; if (!dt) return;
    let f = dt.files?.[0]; if (!f && dt.items){ for (const it of dt.items){ if (it.kind === "file"){ f = it.getAsFile(); break; } } }
    if (!f){ Toast.show("No se detectó archivo", "warn"); return; } importFile(f);
  });
  const dz = $("#dropZone");
  if (dz){
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("hover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("hover"));
    dz.addEventListener("drop", e => {
      e.preventDefault(); e.stopPropagation(); dz.classList.remove("hover");
      const dt = e.dataTransfer; let f = dt?.files?.[0];
      if (!f && dt?.items){ for (const it of dt.items){ if (it.kind === "file"){ f = it.getAsFile(); break; } } }
      if (!f){ Toast.show("No se detectó archivo", "warn"); return; } importFile(f);
    });
  }

  $("#btnCapifSearch")?.addEventListener("click", async () => {
    const t = $("#fTitulo")?.value || '', i = $("#fInterprete")?.value || '', isr = $("#fISRC")?.value || '';
    const qc = [i, t, isr].filter(Boolean).join(' — ');
    window.open('https://repertorio.capif.org.ar/', '_blank', 'noopener');
    if (qc){
      try { await navigator.clipboard.writeText(qc); Toast.show(`🇦🇷 CAPIF abierto · Copiado: ${qc}`, 'ok', 4500); }
      catch(_){ Toast.show(`🇦🇷 CAPIF abierto: ${qc}`, 'ok', 3500); }
    } else { Toast.show('🇦🇷 CAPIF abierto (sin datos para buscar)', 'info', 3500); }
  });

  $("#ownerConfigClose")?.addEventListener("click", closeOwnerConfig);
  $("#ownerConfigCancel")?.addEventListener("click", closeOwnerConfig);
  $("#ownerConfigModal")?.addEventListener("click", e => { if (e.target.id === "ownerConfigModal") closeOwnerConfig(); });
  $("#ownerConfigSave")?.addEventListener("click", () => { OwnerConfig.set({ name: upper($("#ownerNameInput").value), contact: upper($("#ownerContactInput").value), email: $("#ownerEmailInput").value }); Toast.show("Datos guardados", "ok"); closeOwnerConfig(); });
  $("#ownerConfigClear")?.addEventListener("click", () => { if (!confirm("¿Limpiar datos?")) return; OwnerConfig.clear(); $("#ownerNameInput").value = ""; $("#ownerContactInput").value = ""; $("#ownerEmailInput").value = ""; Toast.show("Datos eliminados", "warn"); });

  $("#discogsConfigClose")?.addEventListener("click", closeDiscogsConfig);
  $("#discogsConfigCancel")?.addEventListener("click", closeDiscogsConfig);
  $("#discogsConfigModal")?.addEventListener("click", e => { if (e.target.id === "discogsConfigModal") closeDiscogsConfig(); });
  $("#discogsTokenToggle")?.addEventListener("click", () => { const i = $("#discogsTokenInput"); i.type = i.type === 'password' ? 'text' : 'password'; });
  $("#discogsSave")?.addEventListener("click", () => {
    const t = $("#discogsTokenInput").value.trim(); const p = $("#discogsProxyInput").value.trim();
    if (!t && !p){ clearDiscogsConfig(); updateDiscogsStatus('idle','Vacío.'); Toast.show('Configuración eliminada','warn'); updateDiscogsProtoHint(); return; }
    const ok = saveDiscogsConfig(t, p);
    if (ok){ updateDiscogsStatus('ok', t ? '✅ Token guardado.' : 'Sin token.'); Toast.show('✅ Token guardado','ok'); updateDiscogsProtoHint(); }
    else { updateDiscogsStatus('error', 'No se pudo escribir en localStorage (cuota llena). Exportá backup y vaciá caché en ⚙️.'); }
  });
  $("#discogsTest")?.addEventListener("click", async () => {
    const t = $("#discogsTokenInput").value.trim();
    if (!t){ updateDiscogsStatus('error','Ingresá el token primero.'); return; }
    saveDiscogsConfig(t, $("#discogsProxyInput").value.trim());
    const b = $("#discogsTest");
    const orig = b.textContent;
    b.disabled = true; b.textContent = '⏳ Probando…';
    updateDiscogsStatus('warn', 'Conectando…');
    const stat = $("#discogsStatus"); if (stat) stat.style.whiteSpace = 'pre-line';
    try {
      const me = await testDiscogsConnection(t);
      updateDiscogsStatus('ok', `✅ Token válido · Usuario: ${me.username || me.id || 'ok'}`);
      Toast.show(`✅ Discogs OK — ${me.username || 'token válido'}`, 'ok', 4000);
    } catch(err){
      updateDiscogsStatus('error', `🔴 ${err.message}`);
      Toast.show('❌ Ver detalle en el panel de estado', 'err', 5000);
    } finally { b.disabled = false; b.textContent = orig; }
  });
  $("#discogsTokenClear")?.addEventListener("click", () => { if (!getDiscogsToken() && !getDiscogsConfig().proxy) return; if (confirm('¿Eliminar token y proxy?')){ clearDiscogsConfig(); $("#discogsTokenInput").value = ''; $("#discogsProxyInput").value = ''; updateDiscogsStatus('idle','Eliminado.'); updateDiscogsProtoHint(); Toast.show('Eliminado','warn'); } });
  $("#discogsProxyInput")?.addEventListener("input", updateDiscogsProtoHint);

  $("#folderConfigClose")?.addEventListener("click", closeFolderConfig);
  $("#folderConfigCancel")?.addEventListener("click", closeFolderConfig);
  $("#folderConfigModal")?.addEventListener("click", e => { if (e.target.id === "folderConfigModal") closeFolderConfig(); });
  $("#folderPick")?.addEventListener("click", pickDefaultFolder);
  $("#folderChange")?.addEventListener("click", pickDefaultFolder);
  $("#folderRemove")?.addEventListener("click", removeDefaultFolder);
  $("#folderClearAll")?.addEventListener("click", async () => { if (!confirm("¿Eliminar configuración?")) return; await FileSystemDefault.clear(); FileSystemDefault.refreshBadge(); updateFolderSupportStatus(); Toast.show("Configuración eliminada", "warn"); });
  $("#folderSave")?.addEventListener("click", () => closeFolderConfig());
  $("#folderTestPermission")?.addEventListener("click", async () => { if (!FileSystemDefault.isSet()){ Toast.show("Sin carpeta", "warn"); return; } const ok = await FileSystemDefault.ensureReady("readwrite"); Toast.show(ok ? "✅ Acceso" : "🔐 Autorizá", ok ? "ok" : "warn", 3500); });
  $("#folderBrowserClose")?.addEventListener("click", closeFolderBrowser);
  $("#folderBrowserCancel")?.addEventListener("click", closeFolderBrowser);
  $("#folderBrowserModal")?.addEventListener("click", e => { if (e.target.id === "folderBrowserModal") closeFolderBrowser(); });
  $("#folderRefresh")?.addEventListener("click", refreshFolderList);
  $("#folderUploadNow")?.addEventListener("click", saveBackupToFolder);
  $("#folderChangeFromBrowser")?.addEventListener("click", () => { closeFolderBrowser(); openFolderConfig(); });

  $("#networkDiagClose")?.addEventListener("click", closeNetworkDiag);
  $("#networkDiagCancel")?.addEventListener("click", closeNetworkDiag);
  $("#networkDiagModal")?.addEventListener("click", e => { if (e.target.id === "networkDiagModal") closeNetworkDiag(); });
  $("#networkDiagRun")?.addEventListener("click", runNetworkDiagnostics);

  $("#btnExit")?.addEventListener("click", openExitModal);
  $("#exitClose")?.addEventListener("click", closeExitModal);
  $("#exitCancel")?.addEventListener("click", closeExitModal);
  $("#exitModal")?.addEventListener("click", e => { if (e.target.id === "exitModal") closeExitModal(); });
  $("#exitExportCheck")?.addEventListener("change", e => { $("#exitConfirm").disabled = !e.target.checked; });
  $("#exitConfirm")?.addEventListener("click", async () => {
    if (!$("#exitExportCheck").checked){ Toast.show("Marcá la casilla para exportar y salir","warn"); return; }
    try {
      await exportFullJSON();
      Toast.show("✅ Backup exportado · Ya podés cerrar la pestaña","ok",5500);
      closeExitModal();
      setTimeout(() => { try { window.open('', '_self'); window.close(); } catch(_){} }, 800);
    } catch(err){ Toast.show("Error al exportar: "+err.message,"err",6000); }
  });
  $("#exitSkip")?.addEventListener("click", () => {
    if (!confirm("⚠️ Vas a salir SIN exportar.\n\n¿Estás seguro?")) return;
    if (!confirm("🛑 CONFIRMACIÓN FINAL:\n\n¿Salir realmente sin backup?")) return;
    closeExitModal();
    HistoryLog.log('INFO', 'Salida sin exportar', 'Usuario eligió salir sin backup');
    setTimeout(() => { try { window.open('', '_self'); window.close(); } catch(_){} }, 400);
  });

  $("#btnReset").addEventListener("click", () => {
    if (!confirm("⚠️ VACIAR TODO.\n\n¿Seguro?")) return;
    if (!confirm("¿Realmente?")) return;
    Store.resetAll(); NotFoundList.clear(); NotFoundList.persist();
    App.selected.clear(); App.artista = null; App.q = ""; App.focusedKey = null; App.subcat = null;
    $("#q").value = ""; $("#searchBox").classList.remove("has-value");
    Undo.clear(); ensureValidCat(); renderTabs(); renderAll(); AutoBackup.reset();
    HistoryLog.log('DELETE', 'Base vaciada');
    Toast.show("Base vaciada", "warn");
  });

  $("#modalClose").addEventListener("click", cerrarModal);
  $("#btnCancel").addEventListener("click", cerrarModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") cerrarModal(); });
  $$(".modal-tab").forEach(t => t.addEventListener("click", () => switchModalTab(t.dataset.tab)));
  $("#cdForm").addEventListener("submit", guardarCD);
  $("#btnSaveAndNew").addEventListener("click", () => { if (!validarForm()){ Toast.show("Revisá campos", "err"); return; } if (guardarCD()) setTimeout(() => abrirModal("nuevo"), 100); });
  $("#btnOpenCfFromModal")?.addEventListener("click", () => { CustomFields.render(); $("#customFieldsModal").classList.add("open"); });

  $("#viewClose")?.addEventListener("click", cerrarVista);
  $("#viewCloseBtn")?.addEventListener("click", cerrarVista);
  $("#viewModal")?.addEventListener("click", e => { if (e.target.id === "viewModal") cerrarVista(); });
  $("#viewEdit")?.addEventListener("click", () => { const k = $("#viewModal").dataset.editKey; if (!k) return; const { cat, id } = parseCDKey(k); const cd = Store.getCDs(cat).find(c => c.id === id); cerrarVista(); if (cd){ if (App.cat !== ALL_CATS) App.cat = cat; abrirModal("editar", cd); } });
  $("#fCat").addEventListener("change", e => {
    const tc = e.target.value;
    populateSubcatOptions(tc, "");
    if (App.editing && tc === App.editing.cat && App.editing.original){ $("#fNro").value = App.editing.original.nro; return; }
    const cds = Store.getCDs(tc); const mx = cds.reduce((m, c) => Math.max(m, c.nro || 0), 0); $("#fNro").value = mx + 1;
  });
  ["#fTitulo", "#fInterprete"].forEach(s => { const el = $(s); if (el) el.addEventListener("blur", () => scheduleEnrichment(750)); });
  $("#enrichToggle")?.addEventListener("change", e => Store.setPref("enrich", e.target.checked));
  $("#replaceToggle")?.addEventListener("change", e => { Store.setPref("replaceOnEnrich", e.target.checked); Toast.show(e.target.checked ? "🔄 Reemplazará datos" : "Solo completará vacíos", e.target.checked ? "info" : "ok", 3000); });
  $("#btnFetchCover")?.addEventListener("click", fetchCoverManually);
  $("#btnEditCoverUrl")?.addEventListener("click", () => { const w = $("#wrapCoverUrl"); w.style.display = w.style.display === "none" ? "" : "none"; if (w.style.display === "") $("#fCoverUrl").focus(); });
  $("#btnClearCover")?.addEventListener("click", () => { $("#fCoverUrl").value = ""; renderCoverPreview(null, null); });
  $("#fCoverUrl")?.addEventListener("input", e => { const u = e.target.value.trim(); renderCoverPreview(u || null, null); });

  $("#lbClose")?.addEventListener("click", Lightbox.close);
  $("#coverLightbox")?.addEventListener("click", e => { if (e.target.id === "coverLightbox") Lightbox.close(); });
  $("#lbPrev")?.addEventListener("click", e => { e.stopPropagation(); Lightbox.prev(); });
  $("#lbNext")?.addEventListener("click", e => { e.stopPropagation(); Lightbox.next(); });

  $("#projTasa")?.addEventListener("change", e => { $("#projCustomWrap").style.display = e.target.value === "custom" ? "" : "none"; renderProjection(computeDash().valorTotal); });
  ["#projAnios", "#projCustom", "#projBase", "#projManual"].forEach(s => { $(s)?.addEventListener("input", debounce(() => { $("#projManualWrap").style.display = $("#projBase").value === "manual" ? "" : "none"; renderProjection(computeDash().valorTotal); }, 200)); });

  $("#catModalClose").addEventListener("click", cerrarCatModal);
  $("#catCancel").addEventListener("click", cerrarCatModal);
  $("#catModal").addEventListener("click", e => { if (e.target.id === "catModal") cerrarCatModal(); });
  $("#catForm").addEventListener("submit", guardarCategoria);
  $("#catIcon").addEventListener("input", e => { $("#catIconPreview").textContent = e.target.value || "🎵"; });

  const mm = $("#manualModal");
  const am = () => { mm.classList.add("open"); setTimeout(() => $("#manualSearch").focus(), 80); };
  const cm = () => mm.classList.remove("open");
  $("#btnAyuda")?.addEventListener("click", am);
  $("#btnAyudaEmpty")?.addEventListener("click", am);
  $("#manualClose")?.addEventListener("click", cm);
  mm?.addEventListener("click", e => { if (e.target.id === "manualModal") cm(); });
  $$("#manualNav button").forEach(b => b.addEventListener("click", () => switchManualSection(b.dataset.sec)));
  $("#manualSearch")?.addEventListener("input", debounce((e) => {
    const q2 = norm(e.target.value.trim()); const s = document.querySelector(".manual-section.active"); if (!s) return;
    const bl = s.querySelectorAll("h3, h4, p, li, tr, .manual-step, .callout, pre, table");
    if (!q2){ bl.forEach(x => x.style.display = ""); return; }
    bl.forEach(x => { x.style.display = norm(x.textContent).includes(q2) ? "" : "none"; });
  }, 180));

  $("#btnEnrichAll")?.addEventListener("click", () => BulkEnrich.open());
  $("#bulkEnrichClose")?.addEventListener("click", () => BulkEnrich.close());
  $("#bulkEnrichCancel")?.addEventListener("click", () => BulkEnrich.close());
  $("#bulkEnrichModal")?.addEventListener("click", e => { if (e.target.id === "bulkEnrichModal") BulkEnrich.close(); });
  $("#bulkEnrichStart")?.addEventListener("click", () => BulkEnrich.run());
  $("#bulkEnrichStop")?.addEventListener("click", () => BulkEnrich.stop());
  $$("#bulkEnrichConfig input[type=checkbox], #bulkEnrichConfig input[type=radio]").forEach(i => i.addEventListener("change", () => BulkEnrich.updatePreview()));
  $("#btnViewNotFoundFromBulk")?.addEventListener("click", () => { BulkEnrich.close(); setTimeout(openNotFoundModal, 200); });

  $("#bulkMoveClose")?.addEventListener("click", closeBulkMoveModal);
  $("#bulkMoveCancel")?.addEventListener("click", closeBulkMoveModal);
  $("#bulkMoveModal")?.addEventListener("click", e => { if (e.target.id === "bulkMoveModal") closeBulkMoveModal(); });
  $("#bulkMoveConfirm")?.addEventListener("click", confirmBulkMove);
  $("#bulkMoveKeepNro")?.addEventListener("change", () => renderBulkMovePreview());

  $("#btnNotFound")?.addEventListener("click", openNotFoundModal);
  $("#notFoundClose")?.addEventListener("click", closeNotFoundModal);
  $("#notFoundCancel")?.addEventListener("click", closeNotFoundModal);
  $("#notFoundModal")?.addEventListener("click", e => { if (e.target.id === "notFoundModal") closeNotFoundModal(); });
  $("#btnPrintNotFound")?.addEventListener("click", printNotFoundList);
  $("#btnExportNotFoundCSV")?.addEventListener("click", exportNotFoundCSV);
  $("#btnExportNotFoundJSON")?.addEventListener("click", exportNotFoundJSON);
  $("#btnClearNotFound")?.addEventListener("click", clearNotFoundList);
  $("#notFoundSearch")?.addEventListener("input", debounce((e) => { App.notFoundFilter = e.target.value; renderNotFoundTable(); }, 180));

  $("#autoBackupClose")?.addEventListener("click", () => AutoBackup.later());
  $("#autoBackupLater")?.addEventListener("click", () => AutoBackup.later());
  $("#autoBackupDo")?.addEventListener("click", () => AutoBackup.doBackup());
  $("#autoBackupModal")?.addEventListener("click", e => { if (e.target.id === "autoBackupModal") AutoBackup.later(); });
  $("#autoBackupToggle")?.addEventListener("change", e => { AutoBackup.setEnabled(e.target.checked); Toast.show(e.target.checked ? "Backup activado" : "Backup desactivado", e.target.checked ? "ok" : "warn", 2500); });
  $("#autoBackupToggleLabel")?.addEventListener("click", e => e.stopPropagation());

  $("#checkAll").addEventListener("change", e => { const c = e.target.checked; $$("#tbodyCD tr").forEach(tr => { const k = tr.dataset.key; if (c) App.selected.add(k); else App.selected.delete(k); tr.classList.toggle("selected", c); const cb = tr.querySelector("td.check input"); if (cb) cb.checked = c; }); updateSelectionBar(); if (GridView.isEnabled()) GridView.render(); });
  $("#themeToggle")?.addEventListener("click", () => ThemeManager.toggle());

  $("#dupClose")?.addEventListener("click", () => $("#duplicatesModal").classList.remove("open"));
  $("#dupCloseBtn")?.addEventListener("click", () => $("#duplicatesModal").classList.remove("open"));
  $("#duplicatesModal")?.addEventListener("click", e => { if (e.target.id === "duplicatesModal") e.currentTarget.classList.remove("open"); });
  $("#dupExportCSV")?.addEventListener("click", () => Duplicates.exportCSV());

  $("#cfClose")?.addEventListener("click", () => $("#customFieldsModal").classList.remove("open"));
  $("#cfCloseBtn")?.addEventListener("click", () => $("#customFieldsModal").classList.remove("open"));
  $("#customFieldsModal")?.addEventListener("click", e => { if (e.target.id === "customFieldsModal") e.currentTarget.classList.remove("open"); });
  $("#cfType")?.addEventListener("change", e => { $("#cfOptionsWrap").style.display = e.target.value === "select" ? "" : "none"; });
  $("#cfAdd")?.addEventListener("click", () => { const n = upper($("#cfName").value); const t = $("#cfType").value; const o = $("#cfOptions").value; if (!n.trim()){ Toast.show("Ingresá nombre", "warn"); return; } if (CustomFields.add({ name: n, type: t, options: o })){ $("#cfName").value = ""; $("#cfOptions").value = ""; CustomFields.render(); Toast.show("Campo agregado", "ok"); HistoryLog.log('CREATE', `Campo personalizado: ${n}`, t); } });

  $("#btnHistory")?.addEventListener("click", () => { HistoryLog.render(); $("#historyModal").classList.add("open"); });
  $("#histClose")?.addEventListener("click", () => $("#historyModal").classList.remove("open"));
  $("#histCloseBtn")?.addEventListener("click", () => $("#historyModal").classList.remove("open"));
  $("#historyModal")?.addEventListener("click", e => { if (e.target.id === "historyModal") e.currentTarget.classList.remove("open"); });
  $("#histFilter")?.addEventListener("change", () => HistoryLog.render());
  $("#histSearch")?.addEventListener("input", debounce(() => HistoryLog.render(), 180));
  $("#histExport")?.addEventListener("click", () => HistoryLog.exportCSV());
  $("#histClear")?.addEventListener("click", () => { if (!confirm("¿Limpiar historial?")) return; HistoryLog.clear(); HistoryLog.render(); Toast.show("Historial limpiado", "warn"); });

  $("#btnScan")?.addEventListener("click", () => {
    $("#scannerModal").classList.add("open");
    $("#scanFallback").style.display = "none"; $("#scanWrap").style.display = "";
    $("#scanManual").value = ""; $("#scanStatus").textContent = "Iniciando cámara…"; $("#scanStatus").className = "scanner-status";
    BarcodeScanner.start((code) => { setTimeout(() => { $("#scannerModal").classList.remove("open"); BarcodeScanner.stop(); abrirModal("nuevo"); setTimeout(() => { $("#fCodigo").value = code; Toast.show(`Código ${code} cargado`, "ok", 4500); }, 200); }, 800); });
  });
  $("#scanClose")?.addEventListener("click", () => { BarcodeScanner.stop(); $("#scannerModal").classList.remove("open"); });
  $("#scanCloseBtn")?.addEventListener("click", () => { BarcodeScanner.stop(); $("#scannerModal").classList.remove("open"); });
  $("#scanStop")?.addEventListener("click", () => { BarcodeScanner.stop(); $("#scanStatus").textContent = "Detenido"; });
  $("#scannerModal")?.addEventListener("click", e => { if (e.target.id === "scannerModal"){ BarcodeScanner.stop(); e.currentTarget.classList.remove("open"); } });
  $("#scanManualSearch")?.addEventListener("click", () => { const c = upper($("#scanManual").value.trim()); if (!c) return; BarcodeScanner.stop(); $("#scannerModal").classList.remove("open"); abrirModal("nuevo"); setTimeout(() => { $("#fCodigo").value = c; Toast.show(`Código ${c} cargado`, "ok", 4500); }, 200); });

  $("#loanClose")?.addEventListener("click", () => $("#loansModal").classList.remove("open"));
  $("#loanCloseBtn")?.addEventListener("click", () => $("#loansModal").classList.remove("open"));
  $("#loansModal")?.addEventListener("click", e => { if (e.target.id === "loansModal") e.currentTarget.classList.remove("open"); });
  $("#loanExportCSV")?.addEventListener("click", () => Loans.exportCSV());

  $("#legalClose")?.addEventListener("click", closeLegalModal);
  $("#legalLater")?.addEventListener("click", closeLegalModal);
  $("#legalModal")?.addEventListener("click", e => { if (e.target.id === "legalModal") closeLegalModal(); });
  $("#legalAceptar")?.addEventListener("click", aceptarLegal);
  $("#legalPDF")?.addEventListener("click", exportLegalPDF);

  attachSelectionBarEvents();
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("beforeunload", (e) => { if (AutoBackup.hasPending()){ e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (!el.matches('[data-uppercase]')) return;
    const s = el.selectionStart; const en = el.selectionEnd;
    el.value = el.value.toUpperCase();
    if (typeof s === 'number' && typeof en === 'number'){ try { el.setSelectionRange(s, en); } catch(_){} }
  });
}

function handleKeydown(e){
  const ctrl = e.ctrlKey || e.metaKey;
  const modalOpen = $("#modal").classList.contains("open");
  const viewOpen = $("#viewModal")?.classList.contains("open");
  const pasteOpen = $("#pasteModal").classList.contains("open");
  const catOpen = $("#catModal").classList.contains("open");
  const manualOpen = $("#manualModal").classList.contains("open");
  const bulkOpen = $("#bulkEnrichModal").classList.contains("open");
  const abOpen = $("#autoBackupModal").classList.contains("open");
  const nfOpen = $("#notFoundModal").classList.contains("open");
  const diOpen = $("#discogsConfigModal")?.classList.contains("open");
  const owOpen = $("#ownerConfigModal")?.classList.contains("open");
  const fcOpen = $("#folderConfigModal")?.classList.contains("open");
  const fbOpen = $("#folderBrowserModal")?.classList.contains("open");
  const lbOpen = $("#coverLightbox").classList.contains("open");
  const bmOpen = $("#bulkMoveModal")?.classList.contains("open");
  const ndOpen = $("#networkDiagModal")?.classList.contains("open");
  const dpOpen = $("#duplicatesModal")?.classList.contains("open");
  const cfOpen = $("#customFieldsModal")?.classList.contains("open");
  const hiOpen = $("#historyModal")?.classList.contains("open");
  const scOpen = $("#scannerModal")?.classList.contains("open");
  const loOpen = $("#loansModal")?.classList.contains("open");
  const exOpen = $("#exitModal")?.classList.contains("open");
  const alOpen = $("#albumConfirmModal")?.classList.contains("open");
  const lgOpen = $("#legalModal")?.classList.contains("open");
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);

  if (lbOpen){ if (e.key === "Escape"){ e.preventDefault(); Lightbox.close(); return; } if (e.key === "ArrowLeft"){ e.preventDefault(); Lightbox.prev(); return; } if (e.key === "ArrowRight"){ e.preventDefault(); Lightbox.next(); return; } return; }
  if (e.key === "F1"){ e.preventDefault(); const m = $("#manualModal"); if (m.classList.contains("open")) m.classList.remove("open"); else m.classList.add("open"); return; }
  if (e.key === "Escape"){
    if (viewOpen){ cerrarVista(); return; }
    if (modalOpen){ cerrarModal(); return; }
    if (pasteOpen){ cerrarPasteModal(); return; }
    if (catOpen){ cerrarCatModal(); return; }
    if (manualOpen){ $("#manualModal").classList.remove("open"); return; }
    if (bulkOpen){ BulkEnrich.close(); return; }
    if (abOpen){ AutoBackup.later(); return; }
    if (nfOpen){ closeNotFoundModal(); return; }
    if (diOpen){ closeDiscogsConfig(); return; }
    if (owOpen){ closeOwnerConfig(); return; }
    if (fcOpen){ closeFolderConfig(); return; }
    if (fbOpen){ closeFolderBrowser(); return; }
    if (bmOpen){ closeBulkMoveModal(); return; }
    if (ndOpen){ closeNetworkDiag(); return; }
    if (dpOpen){ $("#duplicatesModal").classList.remove("open"); return; }
    if (cfOpen){ $("#customFieldsModal").classList.remove("open"); return; }
    if (hiOpen){ $("#historyModal").classList.remove("open"); return; }
    if (scOpen){ BarcodeScanner.stop(); $("#scannerModal").classList.remove("open"); return; }
    if (loOpen){ $("#loansModal").classList.remove("open"); return; }
    if (exOpen){ closeExitModal(); return; }
    if (alOpen){ $("#albumConfirmClose")?.click(); return; }
    if (lgOpen){ closeLegalModal(); return; }
    cerrarMenuCategoria(); cerrarMenuSubcategoria(); App.artista = null; App.q = ""; $("#q").value = ""; $("#searchBox").classList.remove("has-value"); renderAll(); return;
  }
  if (modalOpen){ if (ctrl && e.key === "Enter"){ e.preventDefault(); $("#btnSaveAndNew").click(); } return; }
  if (viewOpen || pasteOpen || catOpen || manualOpen || bulkOpen || abOpen || nfOpen || diOpen || owOpen || fcOpen || fbOpen || bmOpen || ndOpen || dpOpen || cfOpen || hiOpen || scOpen || loOpen || exOpen || alOpen || lgOpen) return;
  if (typing) return;
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "q"){ e.preventDefault(); openExitModal(); return; }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "d"){ e.preventDefault(); Duplicates.render(); $("#duplicatesModal").classList.add("open"); return; }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "l"){ e.preventDefault(); Loans.render(); $("#loansModal").classList.add("open"); return; }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "h"){ e.preventDefault(); HistoryLog.render(); $("#historyModal").classList.add("open"); return; }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === "t"){ e.preventDefault(); ThemeManager.toggle(); return; }
  if (ctrl && e.key.toLowerCase() === "n"){ e.preventDefault(); abrirModal("nuevo"); return; }
  if (ctrl && e.key.toLowerCase() === "k"){ e.preventDefault(); abrirModalCategoria("crear"); return; }
  if (ctrl && e.key.toLowerCase() === "e"){ e.preventDefault(); BulkEnrich.open(); return; }
  if (ctrl && e.key.toLowerCase() === "s"){ e.preventDefault(); exportFullJSON(); return; }
  if (ctrl && e.key.toLowerCase() === "f"){ e.preventDefault(); $("#btnFiltros").click(); return; }
  if (ctrl && e.key.toLowerCase() === "z"){ e.preventDefault(); Undo.pop(); return; }
  if (ctrl && e.key.toLowerCase() === "d"){ e.preventDefault(); setView(App.view === "dashboard" ? "table" : "dashboard"); return; }
  if (ctrl && e.key.toLowerCase() === "g"){ e.preventDefault(); GridView.setEnabled(!GridView.isEnabled()); return; }
  const rows = $$("#tbodyCD tr"); if (!rows.length) return;
  let idx = rows.findIndex(r => r.dataset.key === App.focusedKey);
  if (e.key === "ArrowDown"){ e.preventDefault(); idx = Math.min(idx + 1, rows.length - 1); if (idx < 0) idx = 0; App.focusedKey = rows[idx].dataset.key; updateFocusedRow(); }
  else if (e.key === "ArrowUp"){ e.preventDefault(); idx = Math.max(idx - 1, 0); App.focusedKey = rows[idx].dataset.key; updateFocusedRow(); }
  else if (e.key === "Enter" && App.focusedKey){ e.preventDefault(); const { cat, id } = parseCDKey(App.focusedKey); const cd = Store.getCDs(cat).find(c => c.id === id); if (cd){ if (App.cat !== ALL_CATS) App.cat = cat; abrirModal("editar", cd); } }
  else if ((e.key === "Delete" || e.key === "Backspace") && App.focusedKey){ e.preventDefault(); const { cat, id } = parseCDKey(App.focusedKey); const cd = Store.getCDs(cat).find(c => c.id === id); if (cd) eliminarCD(cd); }
  else if (e.key === " " && App.focusedKey){ e.preventDefault(); const k = App.focusedKey; const c = !App.selected.has(k); toggleSelect(k, c); const tr = rows.find(r => r.dataset.key === k); if (tr) tr.querySelector("td.check input").checked = c; }
}

async function initV6(){
  ThemeManager.init();
  DuplicateChecker.invalidate();

  /* v7.0.14-FIX: el manifest PWA y el Service Worker solo tienen sentido
     cuando la app corre desde http(s)://. En file:// los generamos con
     blob: y el navegador los rechaza con warnings. Los saltamos si estamos
     en file:// para no ensuciar la consola. */
  if (!isFileProtocol()){
    try {
      const manifest = {
        name: 'Discografía — Colección de CDs',
        short_name: 'Discografía',
        description: 'Gestor profesional de colección',
        start_url: './',
        display: 'standalone',
        background_color: '#0e1116',
        theme_color: '#4fc3f7',
        icons: [{ src: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fc3f7"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><circle cx="256" cy="256" r="240" fill="url(#g)"/><circle cx="256" cy="256" r="90" fill="#0e1116"/><circle cx="256" cy="256" r="30" fill="#4fc3f7"/></svg>`), sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
      };
      const mb = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      const mu = URL.createObjectURL(mb);
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = mu; document.head.appendChild(l);
    } catch(e){}

    /* v7.0.14-FIX: el Service Worker desde blob: NUNCA funciona en Chrome.
       Requiere un archivo real servido por HTTP. Lo desactivamos hasta que
       exista un sw.js real en la carpeta del proyecto. */
    // (bloque eliminado intencionalmente)
  }
  HistoryLog.log('INFO', `App iniciada v${APP_VERSION}`, `${Store.total()} CDs · ${Store.catKeys().length} categorías`);
}

/* v7.0.14-FIX: el corrector legacy corre UNA SOLA VEZ por versión.
   Antes corría en cada arranque y sobrescribía cambios del usuario. */
function runLegacyCorrector(){
  try {
    const lastCorrected = localStorage.getItem(LEGACY_CORRECTED_KEY);
    if (lastCorrected === APP_VERSION){
      console.log('%cℹ️ Corrector legacy: ya aplicado en esta versión.', "color:#8b97a8");
      return 0;
    }
  } catch(e){}

  const TITULOS_RAW = {
    "MISTFITS":"Misfits","BREACK AWAY":"Break Away","JURCTION":"Junction",
    "ANOTHER TIME,ANOTHER PLEAC":"Another Time, Another Place","BITTERR-SWEET":"Bitter Sweet",
    "LANGHING DOWN CRYING":"Laughing Down Crying","UMPLUGGED deluxe":"Unplugged (Deluxe)",
    "SACRED SONG WITH ROBERT FRIP":"Sacred Song (with Robert Fripp)",
    "WOLD PEACE IS NONE OF YOUR BU":"World Peace Is None of Your Business",
    "KILL UNLE":"Kill Uncle","BUBBLE GOM MAMA CASS COPIA":"Bubble Gum (Mama Cass)",
    "BHOTHER WHERE YOU BOUND":"Brother Where You Bound","WINS OF CHANGE":"Winds of Change",
    "PHANTOM POWWER":"Phantom Power","EXTENDER VERSIONS":"Extended Versions",
    "TEH BIRDS,THE BEES y THE":"The Birds, The Bees & The Monkees","PEACEFUL WOLD":"Peaceful World",
    "WOLD FALLING DOWN":"World Falling Down","A NEW WOLD RECORDS":"A New World Record",
    "ROBIN´S REGN":"Robin's Reign","BRING ON THE NIGTH":"Bring on the Night",
    "COMO CONEGUIR CHICAS":"Cómo Conseguir Chicas","DEMACIADAS MANERAS DE NO…":"Demasiadas Maneras de No…",
    "STRAWWBERRIES MEAN LOVE":"Strawberries Mean Love","MEET THE SEARCHRES":"Meet the Searchers",
    "FIESTA MOUNSTRO":"Fiesta Monstruo","BOOBLEG S.VOL 2 KSAN 95 FM LIVE79":"Bootleg Series Vol. 2 KSAN 95 FM Live '79",
    "HOW DARE YUO !":"How Dare You!","THAT THING YUO DO!":"That Thing You Do!",
    "PAUL YUONG E Q-TIPS":"Paul Young & Q-Tips","PET SOUNDS 50 ANIVERSARY":"Pet Sounds 50th Anniversary",
    "LIVE IN LAS VEGAS 50 ANIVERSARIO":"Live in Las Vegas 50th Anniversary",
    "ON AIR LIVE AT THE BBC VOLUMEN 2":"On Air – Live at the BBC Volume 2",
    "THE TRA LA DAYS ARE OVER":"The Tra-La Days Are Over","EGIPT STATION":"Egypt Station",
    "LIVE AT QUEVEC":"Live at Quebec","LAS OTRAS CARAS DE LA ALTA SOC":"Las Otras Caras de la Alta Sociedad",
    "JUST AN OLD FASHIONED LOVE S":"Just an Old Fashioned Love Song","SO PARA CONTRARIAR":"Só Para Contrariar",
    "OGRANDE ENCONTRO DE":"O Grande Encontro de","LIVE AT THE PALAIS COPIA":"Live at the Palais",
    "LOOKING BACK WITH LOVE COPIA":"Looking Back with Love","AT THE MOVIES COPIA":"At the Movies",
    "SINGS COPIA":"Sings","LIVE COPIA":"Live","RARITIES VOL. 4 (COPIA)":"Rarities Vol. 4",
    "RARITIES VOL. 9 (COPIA)":"Rarities Vol. 9","RARITIES VOL. 10 (COPIA)":"Rarities Vol. 10",
    "FREEDOM WIND COPIA":"Freedom Wind","FOREVER CHANGES COPIA":"Forever Changes",
    "MONTAGE COPIA":"Montage","THE VERY BEST OF COPIA":"The Very Best Of",
    "THE RUTLES COPIA":"The Rutles","INCENSE AND PEPPERMINTS COPIA":"Incense and Peppermints",
    "SHADOWS COPIA":"Shadows","ALEXANDRE PIRES COPIA":"Alexandre Pires","ESTRELLA COPIA":"Estrella",
    "COPIA SIN NOMBRE":"Sin título"
  };
  const INTERPRETES_RAW = {
    "JOHNNY RIVRES":"Johnny Rivers","PAUL WILLIANS":"Paul Williams","ROY ORBINSON":"Roy Orbison",
    "MAMA CASS ELIOT":"Mama Cass Elliot","THE MONTION PICTURE":"The Motion Picture",
    "ENANANITOS VERDES":"Enanitos Verdes","LOS FABULSOS CADILLACS":"Los Fabulosos Cadillacs",
    "LEO MASIAH":"Leo Masliah","LUIS ALBERTO SPINETTTA":"Luis Alberto Spinetta",
    "GAL COSTA CANTA TOM JOBIN":"Gal Costa canta Tom Jobim",
    "JOBIN VINICIUS TOQUINHO MIUCHA":"Jobim, Vinicius, Toquinho & Miúcha",
    "TOM JOBIN":"Tom Jobim"
  };
  const ESTADOS_EN_ES = {
    "Mint (M)":"Como nuevo (M)","Near Mint (NM)":"Casi nuevo (NM)","Excellent (EX)":"Excelente (EX)",
    "Very Good (VG)":"Muy bueno (VG)","Good (G)":"Bueno (G)","Fair (F)":"Regular (F)","Poor (P)":"Malo (P)"
  };
  const _n = s => String(s || '').trim().toUpperCase();
  const TITULOS = {};     for (const k in TITULOS_RAW)     TITULOS[_n(k)]     = TITULOS_RAW[k];
  const INTERPRETES = {}; for (const k in INTERPRETES_RAW) INTERPRETES[_n(k)] = INTERPRETES_RAW[k];

  const cats = Store.categories();
  const snapshot = JSON.stringify(cats);
  let total = 0;

  for (const catKey in cats){
    const cds = cats[catKey]?.cds;
    if (!Array.isArray(cds)) continue;
    for (const cd of cds){
      const tN = _n(cd.titulo), iN = _n(cd.interprete);
      if (TITULOS[tN] && TITULOS[tN] !== cd.titulo){ cd.titulo = TITULOS[tN]; total++; }
      if (INTERPRETES[iN] && INTERPRETES[iN] !== cd.interprete){ cd.interprete = INTERPRETES[iN]; total++; }
      if (cd.titulo){
        const antes = cd.titulo;
        cd.titulo = cd.titulo.replace(/\s*\(COPIA\)\s*$/i,'').replace(/\s+COPIA\s*$/i,'').trim();
        if (cd.titulo !== antes) total++;
      }
      if (cd.titulo && /´/.test(cd.titulo)){ cd.titulo = cd.titulo.replace(/´/g,"'"); total++; }
      if (cd.interprete && /´/.test(cd.interprete)){ cd.interprete = cd.interprete.replace(/´/g,"'"); total++; }
      for (const campo of ['estadoDisco','estadoCaja','estadoFolleto','estadoArte']){
        const v = cd[campo];
        if (v && ESTADOS_EN_ES[v]){ cd[campo] = ESTADOS_EN_ES[v]; total++; }
      }
      if (cd.titulo && cd.titulo !== cd.titulo.toUpperCase()){ cd.titulo = cd.titulo.toUpperCase(); total++; }
      if (cd.interprete && cd.interprete !== cd.interprete.toUpperCase()){ cd.interprete = cd.interprete.toUpperCase(); total++; }
      if (cd.sello && cd.sello !== cd.sello.toUpperCase()){ cd.sello = cd.sello.toUpperCase(); total++; }
      if (cd.genero && cd.genero !== cd.genero.toUpperCase()){ cd.genero = cd.genero.toUpperCase(); total++; }
      if (cd.catalogo && cd.catalogo !== cd.catalogo.toUpperCase()){ cd.catalogo = cd.catalogo.toUpperCase(); total++; }
      if (cd.edicion && cd.edicion !== cd.edicion.toUpperCase()){ cd.edicion = cd.edicion.toUpperCase(); total++; }
      if (cd.pais && cd.pais !== cd.pais.toUpperCase()){ cd.pais = cd.pais.toUpperCase(); total++; }
      if (cd.ubicacion && cd.ubicacion !== cd.ubicacion.toUpperCase()){ cd.ubicacion = cd.ubicacion.toUpperCase(); total++; }
      if (cd.prestadoA && cd.prestadoA !== cd.prestadoA.toUpperCase()){ cd.prestadoA = cd.prestadoA.toUpperCase(); total++; }
      if (cd.notasPrestamo && cd.notasPrestamo !== cd.notasPrestamo.toUpperCase()){ cd.notasPrestamo = cd.notasPrestamo.toUpperCase(); total++; }
    }
  }

  if (total > 0){
    try { localStorage.setItem('discografia_db_v3_BACKUP_' + Date.now(), snapshot); } catch(e){}
    Store.persist();
    console.log(`%c✅ ${total} correcciones automáticas aplicadas`, "color:#5ddc9a;font-weight:bold;font-size:14px");
  } else {
    console.log('%cℹ️ Corrector: nada que cambiar.', "color:#8b97a8");
  }
  try { localStorage.setItem(LEGACY_CORRECTED_KEY, APP_VERSION); } catch(e){}
  return total;
}

function fixMobileViewport(){
  const isMobile = window.matchMedia('(max-width:768px)').matches;
  document.documentElement.classList.toggle('is-mobile', isMobile);
  document.body.classList.toggle('is-mobile', isMobile);
  if (isMobile){
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100dvh';
  } else {
    document.body.style.overflowY = '';
    document.body.style.height = '';
    document.body.style.minHeight = '';
  }
}

async function init(){
  App.q = ""; App.artista = null; App.subcat = null;
  App.filters = { estado: "", formato: "", anioDesde: "", anioHasta: "", ubicacion: "", portada: "", prestamo: "" };
  Store.load();
  fixMobileViewport();

  /* v7.0.14-FIX: arranca SIEMPRE en "Todas" */
  App.cat = ALL_CATS;
  if (Store.catKeys().length === 0) App.cat = null;

  const corrected = runLegacyCorrector();
  if (corrected > 0) setTimeout(() => Toast.show(`✅ ${corrected} correcciones aplicadas automáticamente`, "ok", 4000), 800);

  NotFoundList.load();
  OwnerConfig.load();
  MetadataCache.load();
  CustomFields.load();
  HistoryLog.load();
  OwnerConfig.render();
  MB_USER_AGENT = buildMBUserAgent();
  ensureValidCat();
  renderTabs(); renderAll(); bindEvents();
  Undo.updateBadge();
  AutoBackup.syncToggle(); AutoBackup.updateBadge();
  try { await FileSystemDefault.load(); FileSystemDefault.refreshBadge(); } catch(e){ console.warn("Folder load:", e); }
  console.log(`%c💿 Discografía v${APP_VERSION} — ${DEFAULT_AUTHOR} · ${DEFAULT_PHONE}`, "color:#4fc3f7;font-weight:bold;font-size:15px");
  console.log(`%c   Modo carpeta: ${FileSystemDefault.getMode()}`, "color:#8b97a8");
  console.log(`%c   Protocolo: ${location.protocol}`, "color:#8b97a8");
  console.log(`%c   Viewport: ${window.innerWidth}×${window.innerHeight} · ${window.matchMedia('(max-width:768px)').matches ? 'MÓVIL' : 'DESKTOP'}`, "color:#8b97a8");
  console.log(`%c   Categoría inicial: ${App.cat} (${App.cat === ALL_CATS ? 'Todas' : App.cat})`, "color:#5ddc9a");
  if (!getDiscogsToken()) setTimeout(() => Toast.show("💡 Sin token de Discogs. Menú ⚙️ → 🎚️ Configurar Discogs.", "info", 8000), 1500);
  await initV6();
  if (Store.isEmpty) Toast.show("Base vacía. Creá tu primera categoría con Ctrl+K 📁", "warn", 6000);
  maybeShowLegalOnFirstRun();
}

init();

/* =========================================================================
   [FIN app-ui-4-init.js]
   Ya tenés los 4 archivos de UI + 3 de core + lastfm.js.
   Falta solo el index.html que los carga en el orden correcto.
   ========================================================================= */