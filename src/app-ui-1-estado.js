/* =========================================================================
   DISCOGRAFÍA v7.0.14 — UI Parte 1/4: Estado, tabs, categorías, subcategorías
   Autor: HDSystem IT
   Depende de: app-core.js, lastfm.js
   ========================================================================= */

const ALL_CATS = "__all__";
const App = { cat: null, q: "", sortKey: "nro", sortDir: 1, artista: null, selected: new Set(), focusedKey: null, editing: null, filters: { estado: "", formato: "", anioDesde: "", anioHasta: "", ubicacion: "", portada: "", prestamo: "" }, view: "table", notFoundFilter: "", detailCD: null, subcat: null };

/* v7.0.14-FIX: cdKey y parseCDKey están definidos en app-core-1-base.js
   para evitar el SyntaxError "Identifier 'cdKey' has already been declared".
   NO volver a declararlos acá. */

function snapshotAll(){ const s = {}; for (const k of Store.catKeys()) s[k] = JSON.stringify(Store.get(k).cds); return s; }
function restoreAll(snap){ for (const k in snap){ const a = Store.getCDs(k); a.length = 0; JSON.parse(snap[k]).forEach(x => a.push(x)); } Store.persist(); renderTabs(); renderAll(); }

/* v7.0.14-FIX: findCategoryOfCD ahora delega en Store.findCatOfCD (con caché Map) */
function findCategoryOfCD(cd){
  return Store.findCatOfCD(cd);
}

function viewCDs(){
  if (App.cat === ALL_CATS) return Store.allCDs();
  return App.cat ? Store.getCDs(App.cat) : [];
}
function cdKeyForView(cd){
  const cat = App.cat === ALL_CATS ? Store.findCatOfCD(cd) : App.cat;
  return cat ? cdKey(cat, cd) : `${ALL_CATS}|${cd?.id}`;
}

/* v7.0.14-FIX: arranca SIEMPRE en "Todas" */
function ensureValidCat(){
  const keys = Store.catKeys();
  if (!keys.length){ App.cat = null; return; }
  if (!App.cat) App.cat = ALL_CATS;
  if (App.cat !== ALL_CATS && !Store.get(App.cat)) App.cat = ALL_CATS;
}

function getFiltered(cat = App.cat){
  if (!cat) return [];
  const q = App.q.trim();
  const f = App.filters;
  const useAdvanced = AdvancedSearch.isAdvanced(q);
  const qn = norm(q).trim();
  const terms = qn ? qn.split(/\s+/).filter(Boolean) : [];
  const source = (cat === ALL_CATS) ? Store.allCDs() : Store.getCDs(cat);
  return source.filter(cd => {
    if (App.artista && cd.interprete !== App.artista) return false;
    if (App.subcat && cd.subcat !== App.subcat) return false;
    if (f.estado === "__sin_estado__"){ if (cd.estado && cd.estado.trim()) return false; }
    else if (f.estado && (cd.estado || "Excelente") !== f.estado) return false;
    if (f.formato && (cd.formato || "CD") !== f.formato) return false;
    if (f.anioDesde){ const a = parseInt(f.anioDesde); if (!isNaN(a) && (cd.anio ?? -Infinity) < a) return false; }
    if (f.anioHasta){ const a = parseInt(f.anioHasta); if (!isNaN(a) && (cd.anio ?? Infinity) > a) return false; }
    if (f.ubicacion === "__con__" && !cd.ubicacion) return false;
    if (f.ubicacion === "__sin__" && cd.ubicacion) return false;
    if (f.portada === "__con__" && !cd.portada) return false;
    if (f.portada === "__sin__" && cd.portada) return false;
    if (f.prestamo === "__prestados__" && !Loans.isLoaned(cd)) return false;
    if (f.prestamo === "__disponibles__" && Loans.isLoaned(cd)) return false;
    if (f.prestamo === "__vencidos__" && !Loans.isOverdue(cd)) return false;
    if (!q) return true;
    if (useAdvanced) return AdvancedSearch.matches(cd, q);
    if (!terms.length) return true;
    const h = norm([cd.titulo, cd.interprete, cd.sello, cd.anio, cd.ubicacion, cd.catalogo].join(" "));
    return terms.every(t => h.includes(t));
  });
}
function sortCDs(arr){
  const { sortKey, sortDir } = App;
  return arr.slice().sort((a, b) => {
    let A = a[sortKey], B = b[sortKey];
    if (sortKey === "anio"){ A = A ?? -Infinity; B = B ?? -Infinity; return (A - B) * sortDir; }
    if (typeof A === "string") return norm(A).localeCompare(norm(B), "es") * sortDir;
    return ((A ?? 0) - (B ?? 0)) * sortDir;
  });
}

/* ─── TABS ─── */
function renderTabs(){
  const el = $("#tabs"); el.innerHTML = "";
  const wrapAll = document.createElement("div"); wrapAll.className = "tab-wrap";
  const tabAll = document.createElement("div");
  tabAll.role = "tab"; tabAll.tabIndex = 0;
  tabAll.className = "tab tab-all" + (App.cat === ALL_CATS ? " active" : "");
  tabAll.innerHTML = `<span>🗂️</span><span>Todas</span><span class="badge">${Store.total()}</span>`;
  tabAll.title = "Ver todas las categorías juntas";
  tabAll.addEventListener("click", () => {
    if (App.cat === ALL_CATS) return;
    App.cat = ALL_CATS; App.artista = null; App.subcat = null; App.selected.clear(); App.focusedKey = null;
    renderTabs(); renderStats(); renderAll();
  });
  tabAll.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); tabAll.click(); } });
  wrapAll.appendChild(tabAll); el.appendChild(wrapAll);

  for (const k of Store.catKeys()){
    const c = Store.get(k);
    const wrap = document.createElement("div"); wrap.className = "tab-wrap";
    const tab = document.createElement("div");
    tab.role = "tab"; tab.tabIndex = 0;
    tab.className = "tab" + (k === App.cat ? " active" : "");
    tab.innerHTML = `<span>${esc(c.icon)}</span><span>${esc(c.label)}</span><span class="badge">${c.cds.length}</span>`;
    tab.addEventListener("click", (e) => {
      if (e.target.closest(".tab-menu-btn")) return;
      if (App.cat === k) return;
      App.cat = k; App.artista = null; App.subcat = null; App.selected.clear(); App.focusedKey = null;
      renderTabs(); renderStats(); renderAll();
    });
    tab.addEventListener("keydown", (e) => { if (e.target.closest(".tab-menu-btn")) return; if (e.key === "Enter" || e.key === " "){ e.preventDefault(); tab.click(); } });
    const mb = document.createElement("button");
    mb.type = "button"; mb.className = "tab-menu-btn"; mb.title = "Opciones"; mb.textContent = "⋯";
    mb.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); abrirMenuCategoria(k, mb); });
    tab.appendChild(mb); wrap.appendChild(tab); el.appendChild(wrap);
  }
  const add = document.createElement("button");
  add.type = "button"; add.className = "tab tab-add";
  add.innerHTML = `<span>➕</span><span>Nueva categoría</span>`;
  add.addEventListener("click", () => abrirModalCategoria("crear"));
  el.appendChild(add);
}

function renderSubtabs(){
  const el = $("#subtabs");
  if (!el) return;
  if (!App.cat || App.cat === ALL_CATS){ el.classList.remove("show"); el.innerHTML = ""; App.subcat = null; return; }
  const cat = Store.get(App.cat);
  if (!cat){ el.classList.remove("show"); el.innerHTML = ""; return; }
  const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
  if (App.subcat && !subs.some(s => s.id === App.subcat)) App.subcat = null;
  el.classList.add("show");
  el.innerHTML = "";
  if (subs.length){
    const wrapAll = document.createElement("div"); wrapAll.className = "tab-wrap";
    const tabAll = document.createElement("div");
    tabAll.role = "tab"; tabAll.tabIndex = 0;
    tabAll.className = "subtab subtab-all" + (App.subcat === null ? " active" : "");
    tabAll.innerHTML = `<span>📚</span><span>Todas</span><span class="badge">${cat.cds.length}</span>`;
    tabAll.title = "Ver todos los CDs de esta categoría";
    tabAll.addEventListener("click", () => { App.subcat = null; renderSubtabs(); renderAll(); });
    wrapAll.appendChild(tabAll);
    el.appendChild(wrapAll);
  }
  for (const sub of subs){
    const cnt = cat.cds.filter(c => c.subcat === sub.id).length;
    const wrap = document.createElement("div"); wrap.className = "tab-wrap";
    const tab = document.createElement("div");
    tab.role = "tab"; tab.tabIndex = 0;
    tab.className = "subtab" + (App.subcat === sub.id ? " active" : "");
    tab.innerHTML = `<span>${esc(sub.icon)}</span><span>${esc(sub.label)}</span><span class="badge">${cnt}</span>`;
    tab.addEventListener("click", (e) => {
      if (e.target.closest(".subtab-menu-btn")) return;
      App.subcat = (App.subcat === sub.id) ? null : sub.id;
      renderSubtabs(); renderAll();
    });
    tab.addEventListener("keydown", (e) => {
      if (e.target.closest(".subtab-menu-btn")) return;
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); tab.click(); }
    });
    const mb = document.createElement("button");
    mb.type = "button"; mb.className = "subtab-menu-btn"; mb.title = "Opciones"; mb.textContent = "⋯";
    mb.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); abrirMenuSubcategoria(App.cat, sub.id, mb); });
    tab.appendChild(mb); wrap.appendChild(tab); el.appendChild(wrap);
  }
  const add = document.createElement("button");
  add.type = "button";
  add.className = "subtab subtab-add";
  add.innerHTML = `<span>➕</span><span>${subs.length ? "Subcategoría" : "Crear primera subcategoría"}</span>`;
  add.title = "Crear subcategoría";
  add.addEventListener("click", () => abrirModalSubcategoria("crear", App.cat));
  el.appendChild(add);
}

let _menuSubEl = null;
function cerrarMenuSubcategoria(){ if (_menuSubEl){ _menuSubEl.remove(); _menuSubEl = null; } }
function abrirMenuSubcategoria(catKey, subId, anchor){
  cerrarMenuSubcategoria();
  const cat = Store.get(catKey); const sub = Store.getSubcategory(catKey, subId);
  if (!cat || !sub) return;
  const menu = document.createElement("div");
  menu.style.cssText = `position:fixed;z-index:95;background:#1a2028;border:1px solid var(--line);border-radius:10px;padding:6px;min-width:210px;box-shadow:0 14px 40px rgba(0,0,0,.6);`;
  const r = anchor.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left - 160)) + "px";
  menu.style.top = Math.max(8, Math.min(window.innerHeight - 260, r.bottom + 6)) + "px";
  const items = [
    { icon:"✏️", label:"Renombrar", fn: () => abrirModalSubcategoria("renombrar", catKey, subId) },
    { icon:"🎨", label:"Cambiar icono", fn: () => abrirModalSubcategoria("icono", catKey, subId) },
    { icon:"⬅️", label:"Mover izquierda", fn: () => { if (Store.moveSubcategory(catKey, subId, "left")) { renderSubtabs(); renderAll(); } } },
    { icon:"➡️", label:"Mover derecha", fn: () => { if (Store.moveSubcategory(catKey, subId, "right")) { renderSubtabs(); renderAll(); } } },
    { sep:true },
    { icon:"🗑️", label:"Eliminar subcategoría", danger:true, fn: () => confirmarEliminarSubcategoria(catKey, subId) }
  ];
  for (const it of items){
    if (it.sep){ const s = document.createElement("div"); s.style.cssText = "height:1px;background:var(--line);margin:5px 3px"; menu.appendChild(s); continue; }
    const b = document.createElement("button"); b.type = "button";
    b.style.cssText = `display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:0;color:${it.danger ? "#ffb3b3" : "var(--txt)"};padding:9px 11px;border-radius:7px;cursor:pointer;font-size:.82rem;text-align:left;font-family:inherit`;
    b.innerHTML = `<span>${it.icon}</span><span>${it.label}</span>`;
    b.addEventListener("mouseenter", () => { b.style.background = it.danger ? "rgba(255,107,107,.14)" : "rgba(79,195,247,.12)"; b.style.color = it.danger ? "#fff" : "var(--accent)"; });
    b.addEventListener("mouseleave", () => { b.style.background = "transparent"; b.style.color = it.danger ? "#ffb3b3" : "var(--txt)"; });
    b.addEventListener("click", (ev) => { ev.stopPropagation(); ev.preventDefault(); cerrarMenuSubcategoria(); it.fn(); });
    menu.appendChild(b);
  }
  document.body.appendChild(menu); _menuSubEl = menu;
}
document.addEventListener("click", (e) => { if (_menuSubEl && !_menuSubEl.contains(e.target)) cerrarMenuSubcategoria(); });

function confirmarEliminarSubcategoria(catKey, subId){
  const cat = Store.get(catKey); const sub = Store.getSubcategory(catKey, subId);
  if (!cat || !sub) return;
  const n = cat.cds.filter(c => c.subcat === subId).length;
  if (!confirm(`¿Eliminar la subcategoría "${sub.label}"?${n ? `\n\nContiene ${n} CD(s). Quedarán sin subcategoría (no se borran).` : ''}`)) return;
  Store.deleteSubcategory(catKey, subId);
  if (App.subcat === subId) App.subcat = null;
  HistoryLog.log('DELETE', `Subcategoría eliminada: ${sub.label}`, cat.label);
  AutoBackup.markChange('eliminación subcategoría');
  renderSubtabs(); renderTabs(); renderAll();
  Toast.show(`Subcategoría "${sub.label}" eliminada`, 'warn');
}

function abrirModalSubcategoria(mode, catKey, subId = null){
  _cmMode = "sub-" + mode;
  _cmKey = catKey;
  _subKey = subId || null;
  _cmAfter = null;
  _catSaving = false;
  const cat = Store.get(catKey);
  if (!cat) return;
  const sub = subId ? Store.getSubcategory(catKey, subId) : null;
  $("#catModalIcon").textContent = mode === "crear" ? "➕" : mode === "renombrar" ? "✏️" : "🎨";
  $("#catModalTitle").textContent = mode === "crear"
    ? `Nueva subcategoría en "${cat.label}"`
    : mode === "renombrar" ? `Renombrar subcategoría`
    : `Cambiar icono`;
  $("#catLabel").value = sub?.label || "";
  $("#catIcon").value = sub?.icon || "📂";
  $("#catIconPreview").textContent = sub?.icon || "📂";
  $("#wrapCatLabel").style.display = (mode === "icono") ? "none" : "";
  const li = $("#catLabel");
  if (mode === "icono") li.removeAttribute("required"); else li.setAttribute("required", "");
  const picker = $("#catIconPicker"); picker.innerHTML = "";
  const currentIcon = sub?.icon || "📂";
  const SUB_EMOJIS = ["📂","📁","🗂️","🎵","🎤","🎸","🎶","📀","💿","🎼","🎷","🎺","🥁","🎻","🎹","🎧","⭐","🔥","💫","✨","🌎","🇦🇷","🇧🇷","🇺🇸","🇬🇧"];
  for (const e of SUB_EMOJIS){
    const b = document.createElement("button"); b.type = "button"; b.textContent = e;
    if (e === currentIcon) b.classList.add("active");
    b.addEventListener("click", () => {
      $("#catIcon").value = e; $("#catIconPreview").textContent = e;
      picker.querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    picker.appendChild(b);
  }
  $("#catModal").classList.add("open");
  setTimeout(() => { if (mode !== "icono") $("#catLabel").focus(); else $("#catIcon").focus(); }, 80);
}

function populateSubcatOptions(catKey, selectedSubId){
  const sel = $("#fSubcat");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Sin subcategoría —</option>';
  const subs = Store.getSubcategories(catKey);
  for (const sub of subs){
    const o = document.createElement("option");
    o.value = sub.id;
    o.textContent = sub.icon + " " + sub.label;
    if (sub.id === selectedSubId) o.selected = true;
    sel.appendChild(o);
  }
}

let _menuCatEl = null;
function cerrarMenuCategoria(){ if (_menuCatEl){ _menuCatEl.remove(); _menuCatEl = null; } }
function abrirMenuCategoria(key, anchor){
  cerrarMenuCategoria(); if (isAnyModalOpen()) return;
  const cat = Store.get(key); if (!cat) return;
  const menu = document.createElement("div");
  menu.style.cssText = `position:fixed;z-index:95;background:#1a2028;border:1px solid var(--line);border-radius:10px;padding:6px;min-width:210px;box-shadow:0 14px 40px rgba(0,0,0,.6);`;
  const r = anchor.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left - 160)) + "px";
  menu.style.top = Math.max(8, Math.min(window.innerHeight - 260, r.bottom + 6)) + "px";
  const items = [
    { icon:"✏️", label:"Renombrar", fn: () => abrirModalCategoria("renombrar", key) },
    { icon:"🎨", label:"Cambiar icono", fn: () => abrirModalCategoria("icono", key) },
    { icon:"⬅️", label:"Mover izquierda", fn: () => { Store.moveCategory(key, "left"); renderTabs(); } },
    { icon:"➡️", label:"Mover derecha", fn: () => { Store.moveCategory(key, "right"); renderTabs(); } },
    { sep:true },
    { icon:"📂", label:"Nueva subcategoría", fn: () => abrirModalSubcategoria("crear", key) },
    { sep:true },
    { icon:"➕", label:"Nueva categoría aquí", fn: () => abrirModalCategoria("crear", null, key) },
    { sep:true },
    { icon:"🗑️", label:"Eliminar categoría", danger:true, fn: () => confirmarEliminarCategoria(key) }
  ];
  for (const it of items){
    if (it.sep){ const s = document.createElement("div"); s.style.cssText = "height:1px;background:var(--line);margin:5px 3px"; menu.appendChild(s); continue; }
    const b = document.createElement("button"); b.type = "button";
    b.style.cssText = `display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:0;color:${it.danger ? "#ffb3b3" : "var(--txt)"};padding:9px 11px;border-radius:7px;cursor:pointer;font-size:.82rem;text-align:left;font-family:inherit`;
    b.innerHTML = `<span>${it.icon}</span><span>${it.label}</span>`;
    b.addEventListener("mouseenter", () => { b.style.background = it.danger ? "rgba(255,107,107,.14)" : "rgba(79,195,247,.12)"; b.style.color = it.danger ? "#fff" : "var(--accent)"; });
    b.addEventListener("mouseleave", () => { b.style.background = "transparent"; b.style.color = it.danger ? "#ffb3b3" : "var(--txt)"; });
    b.addEventListener("click", (ev) => { ev.stopPropagation(); ev.preventDefault(); cerrarMenuCategoria(); it.fn(); });
    menu.appendChild(b);
  }
  document.body.appendChild(menu); _menuCatEl = menu;
}
document.addEventListener("click", (e) => { if (_menuCatEl && !_menuCatEl.contains(e.target)) cerrarMenuCategoria(); });

function confirmarEliminarCategoria(key){
  const cat = Store.get(key); if (!cat) return;
  const n = cat.cds.length;
  if (!confirm(n === 0 ? `¿Eliminar "${cat.label}"?` : `⚠️ ¿Eliminar "${cat.label}"?\n\nContiene ${n} CDs.`)) return;
  if (n > 0 && !confirm("¿Realmente?")) return;
  const before = JSON.stringify(Store.categories());
  Store.deleteCategory(key);
  Undo.push("eliminar categoría", () => { Store.replaceAll({ categories: JSON.parse(before) }); ensureValidCat(); renderTabs(); renderAll(); });
  if (App.cat === key){ ensureValidCat(); App.artista = null; App.subcat = null; App.selected.clear(); App.focusedKey = null; }
  HistoryLog.log('DELETE', `Categoría eliminada: ${cat.label}`, `${n} CDs`);
  renderTabs(); renderStats(); renderAll(); AutoBackup.markChange("eliminación categoría");
  Toast.show(`Categoría "${cat.label}" eliminada`, "warn");
}

const EMOJIS = ["🎵","🎤","🎸","🎶","📀","💿","🎼","🎷","🎺","🥁","🎻","🎹","🎧","⭐","🇦🇷","🇧🇷","🇺🇸","🇬🇧","🌎","🔥","💫","✨","🎬","🎭"];
let _cmMode = "crear", _cmKey = null, _cmAfter = null, _subKey = null;
let _catSaving = false, _cdSaving = false;

function abrirModalCategoria(mode, key = null, after = null){
  _cmMode = mode; _cmKey = key; _cmAfter = after; _catSaving = false; _subKey = null;
  const cat = key ? Store.get(key) : null;
  $("#catModalIcon").textContent = mode === "crear" ? "➕" : mode === "renombrar" ? "✏️" : "🎨";
  $("#catModalTitle").textContent = mode === "crear" ? "Nueva categoría" : mode === "renombrar" ? "Renombrar" : "Cambiar icono";
  $("#catLabel").value = cat?.label || ""; $("#catIcon").value = cat?.icon || "🎵"; $("#catIconPreview").textContent = cat?.icon || "🎵";
  $("#wrapCatLabel").style.display = (mode === "icono") ? "none" : "";
  const li = $("#catLabel");
  if (mode === "icono") li.removeAttribute("required"); else li.setAttribute("required", "");
  const picker = $("#catIconPicker"); picker.innerHTML = "";
  const currentIcon = cat?.icon || "🎵";
  for (const e of EMOJIS){
    const b = document.createElement("button"); b.type = "button"; b.textContent = e;
    if (e === currentIcon) b.classList.add("active");
    b.addEventListener("click", () => {
      $("#catIcon").value = e; $("#catIconPreview").textContent = e;
      picker.querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    picker.appendChild(b);
  }
  $("#catModal").classList.add("open");
  setTimeout(() => { if (mode !== "icono") $("#catLabel").focus(); else $("#catIcon").focus(); }, 80);
}
function cerrarCatModal(){
  $("#catModal").classList.remove("open");
  _cmKey = null; _cmAfter = null; _subKey = null;
  setTimeout(() => {
    _catSaving = false;
    const btn = $("#catSave");
    if (btn){ btn.disabled = false; if (btn.dataset._prev){ btn.textContent = btn.dataset._prev; delete btn.dataset._prev; } }
  }, 300);
}
function guardarCategoria(e){
  if (e) e.preventDefault();
  if (_catSaving) return;
  _catSaving = true;
  const btn = $("#catSave");
  if (btn){ btn.disabled = true; btn.dataset._prev = btn.textContent; btn.textContent = "⏳ Guardando…"; }
  const unlockCat = () => {
    _catSaving = false;
    if (btn){ btn.disabled = false; if (btn.dataset._prev){ btn.textContent = btn.dataset._prev; delete btn.dataset._prev; } }
  };
  const label = upper($("#catLabel").value.trim()), icon = $("#catIcon").value.trim() || "🎵";
  if (typeof _cmMode === 'string' && _cmMode.startsWith("sub-")){
    const subMode = _cmMode.slice(4);
    if (subMode === "crear"){
      if (!label){ $("#wrapCatLabel").classList.add("invalid"); unlockCat(); return; }
      const id = Store.addSubcategory(_cmKey, { label, icon: icon || "📂" });
      if (id){
        App.cat = _cmKey; App.subcat = id;
        HistoryLog.log('CREATE', `Subcategoría creada: ${label}`, Store.get(_cmKey)?.label || '');
        AutoBackup.markChange('nueva subcategoría');
        renderSubtabs(); renderTabs(); renderAll();
        Toast.show(`Subcategoría "${label}" creada`, "ok");
      } else { Toast.show("No se pudo crear la subcategoría", "err"); }
      cerrarCatModal();
      return;
    }
    if (subMode === "renombrar"){
      if (!label){ $("#wrapCatLabel").classList.add("invalid"); unlockCat(); return; }
      if (Store.updateSubcategory(_cmKey, _subKey, { label })){
        HistoryLog.log('EDIT', `Subcategoría renombrada: ${label}`);
        AutoBackup.markChange('renombrar subcategoría');
        renderSubtabs(); renderAll();
        Toast.show(`Renombrada a "${label}"`, "ok");
      }
      cerrarCatModal();
      return;
    }
    if (subMode === "icono"){
      if (Store.updateSubcategory(_cmKey, _subKey, { icon: icon || "📂" })){
        HistoryLog.log('EDIT', `Icono de subcategoría actualizado`);
        AutoBackup.markChange('cambio icono subcategoría');
        renderSubtabs(); renderAll();
        Toast.show("Icono actualizado", "ok");
      }
      cerrarCatModal();
      return;
    }
    unlockCat();
    return;
  }
  if (_cmMode === "crear"){
    if (!label){ $("#wrapCatLabel").classList.add("invalid"); unlockCat(); return; }
    const before = JSON.stringify(Store.categories());
    const nk = Store.addCategory({ label, icon });
    if (_cmAfter && Store.get(_cmAfter)){
      const keys = Store.catKeys(); const ti = keys.indexOf(_cmAfter); const ni = keys.indexOf(nk);
      if (ti !== -1 && ni !== -1){ keys.splice(ni, 1); keys.splice(ti + 1, 0, nk); const rb = {}; for (const k of keys) rb[k] = Store.get(k); Store.replaceAll({ categories: rb }); }
    }
    Undo.push("crear categoría", () => { Store.replaceAll({ categories: JSON.parse(before) }); ensureValidCat(); renderTabs(); renderAll(); });
    App.cat = nk; App.artista = null; App.subcat = null; App.selected.clear(); App.focusedKey = null;
    HistoryLog.log('CREATE', `Categoría creada: ${label}`, icon);
    renderTabs(); renderStats(); renderAll();
    AutoBackup.markChange("nueva categoría");
    Toast.show(`Categoría "${label}" creada`, "ok");
    cerrarCatModal();
    return;
  }
  if (_cmMode === "renombrar"){
    if (!label){ $("#wrapCatLabel").classList.add("invalid"); unlockCat(); return; }
    const cat = Store.get(_cmKey); if (!cat){ unlockCat(); return; }
    const before = JSON.stringify(Store.categories()); const oldKey = _cmKey; let nk = oldKey;
    if (label !== cat.label) nk = Store.renameCategoryKey(oldKey, label) || oldKey; else Store.updateCategory(oldKey, { label });
    Undo.push("renombrar categoría", () => { Store.replaceAll({ categories: JSON.parse(before) }); ensureValidCat(); renderTabs(); renderAll(); });
    if (App.cat === oldKey) App.cat = nk;
    if (nk !== oldKey){
      const rem = new Set();
      for (const k of App.selected){ const { cat: c, id } = parseCDKey(k); rem.add(c === oldKey ? `${nk}|${id}` : k); }
      App.selected = rem;
      if (App.focusedKey && App.focusedKey.startsWith(oldKey + "|")) App.focusedKey = `${nk}|${parseCDKey(App.focusedKey).id}`;
    }
    HistoryLog.log('EDIT', `Categoría renombrada: ${label}`);
    renderTabs(); renderStats(); renderAll(); ensureValidCat();
    AutoBackup.markChange("renombrar categoría");
    Toast.show(`Renombrada a "${label}"`, "ok");
    cerrarCatModal();
    return;
  }
  if (_cmMode === "icono"){
    Store.updateCategory(_cmKey, { icon });
    HistoryLog.log('EDIT', `Icono actualizado`);
    renderTabs(); AutoBackup.markChange("cambio icono");
    Toast.show("Icono actualizado", "ok");
    cerrarCatModal();
    return;
  }
  unlockCat();
}

function setArtistFilter(name){
  if (name){
    App.artista = name;
    App.q = '';
    const qEl = $("#q");
    if (qEl) qEl.value = '';
    $("#searchBox")?.classList.remove("has-value", "adv-mode");
    const advBadge = $("#advModeBadge"); if (advBadge) advBadge.style.display = "none";
    App.filters = { estado: '', formato: '', anioDesde: '', anioHasta: '', ubicacion: '', portada: '', prestamo: '' };
    const fE = $("#fFiltroEstado"); if (fE) fE.value = '';
    const fF = $("#fFiltroFormato"); if (fF) fF.value = '';
    const fAD = $("#fFiltroAnioDesde"); if (fAD) fAD.value = '';
    const fAH = $("#fFiltroAnioHasta"); if (fAH) fAH.value = '';
    const fU = $("#fFiltroUbicacion"); if (fU) fU.value = '';
    const fP = $("#fFiltroPortada"); if (fP) fP.value = '';
    const fPr = $("#fFiltroPrestamo"); if (fPr) fPr.value = '';
    Toast.show(`🎤 Solo ${upper(name)} (exacto)`, 'ok', 2200);
  } else {
    App.artista = null;
    Toast.show('🎤 Filtro de artista quitado', 'info', 1500);
  }
  renderAll();
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
}

/* =========================================================================
   [FIN app-ui-1-estado.js]
   Ahora pegá el contenido de app-ui-2-render.js justo debajo.
   ========================================================================= */