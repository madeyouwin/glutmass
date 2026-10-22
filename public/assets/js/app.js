// GLUTMASS Oberflaeche: liest Eingaben, ruft calc.js, zeichnet den Theken-Zettel.
import {
  MAX_GUESTS, calculate, sanitizeConfig, cloneDefaults, isDefaultConfig, DEFAULTS,
  fmtKg, fmtEur, fmtEurCent, sideAmount, shareText,
} from "./calc.js?v=2";

const GROUPS = [["schwein", "Schwein & Geflügel"], ["rind", "Rind"], ["lamm", "Lamm"], ["fisch", "Fisch"], ["veg", "Vegetarisch"]];


const CFG_KEY = "glutmass-annahmen";      // localStorage, nur wenn eigene Annahmen gesetzt sind
const COUNTED_KEY = "glutmass-gezaehlt";  // sessionStorage, Sperre gegen Mehrfachzaehlung
const COUNTER_URL = "/api/zaehler";

const BASE_INFO = {
  adult: ["Fleisch pro Erwachsenem (g, roh)", "bei normalem Hunger, Party, normalen Beilagen"],
  kid: ["Fleisch pro Kind (g)", "Bratwurst und Hähnchen, 70 : 30"],
  vegP: ["Vegetarisch pro Person (g)", "Grillkäse und Gemüse zusammen"],
  bread: ["Brötchen pro Erwachsenem", "oder 2 Scheiben Baguette"],
  breadKid: ["Brötchen pro Kind", ""],
  salad: ["Salat pro Person (g)", "angepasst an die Beilagen-Wahl"],
  sauce: ["Saucen & Dips pro Person (ml)", ""],
};
// Reste-Tipps je Artikel: erscheinen nur fuer Artikel, die auf der Liste stehen.
const LEFTOVERS = {
  wurst: "Am nächsten Tag in Scheiben in die Pfanne – als Bratkartoffeln oder Currywurst.",
  nacken: "Dünn aufschneiden: für Wraps oder die Brotzeit.",
  haehnchen: "Kalt in den Salat oder ins Sandwich.",
  rumpsteak: "Hauchdünn aufschneiden – Steak-Sandwich oder Salat.",
  bauch: "Klein schneiden und mit Bratkartoffeln oder Bohnen anbraten.",
  grillkaese: "Gewürfelt in den Salat oder mit Gemüse in die Pfanne.",
  gemuese: "Kalt in den Nudelsalat oder als Ofengemüse aufwärmen.",
  huefte: "Dünn aufschneiden – kalt aufs Brot oder in den Salat.",
  entrecote: "Hauchdünn aufschneiden und kurz in der Pfanne erwärmen, z. B. für Wraps.",
  patty: "Zerbröseln und als Hackfleisch für Nudelsauce oder Chili nutzen.",
  lammkotelett: "Fleisch vom Knochen lösen, mit Joghurt-Dip ins Fladenbrot.",
  merguez: "In Scheiben in eine Tomaten-Paprika-Pfanne oder zu Couscous.",
  lachs: "Kalt zerpflücken für Lachs-Aufstrich, Salat oder Nudeln.",
  garnelen: "Kalt in den Salat oder kurz in Knoblauchöl schwenken.",
  forelle: "Filets lösen und mit Frischkäse und Meerrettich zu Aufstrich verarbeiten.",
};
const LEFTOVER_ALL = ["Alles Gegrillte", "Schnell abkühlen lassen, in den Kühlschrank und in 1–2 Tagen essen – oder einfrieren."];

const WARNINGS = {
  "adults-no-meat": "Wähl oben unter „Auf den Grill“ aus, was gegrillt wird.",
  "kids-no-meat": "Für die Kinder: Bratwurst oder Hähnchenspieß auswählen.",
  "veg-no-items": "Für die Vegetarier: Grillkäse oder Gemüsespieß auswählen.",
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const store = (kind) => { try { return window[kind]; } catch { return null; } };

let cfg = loadConfig();
const state = { adults: 0, kids: 0, veg: 0, selected: new Set(), drinks: new Set() }; // alles startet leer
let current = null;

function loadConfig() {
  try { return sanitizeConfig(JSON.parse(store("localStorage")?.getItem(CFG_KEY))); } catch { return cloneDefaults(); }
}
function saveConfig() {
  try {
    const ls = store("localStorage");
    if (!ls) return;
    if (isDefaultConfig(cfg)) ls.removeItem(CFG_KEY);
    else ls.setItem(CFG_KEY, JSON.stringify({ items: cfg.items.map(({ id, piece, share, price }) => ({ id, piece, share, price })), base: cfg.base }));
  } catch { /* Speicher nicht verfuegbar: dann eben nur fuer diese Sitzung */ }
}

const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

function chip(id, label, checked, onChange) {
  const input = el("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.addEventListener("change", () => { onChange(input.checked); update(); });
  const lab = el("label", null, label);
  lab.htmlFor = id;
  return [input, lab];
}

function renderChips() {
  const groups = $("grillGroups");
  groups.replaceChildren(...GROUPS.map(([key, title]) => {
    const fs = el("fieldset", "chip-group");
    fs.append(el("legend", "chips-lab", title));
    const box = el("div", key === "veg" ? "chips veg" : "chips");
    for (const item of cfg.items.filter((i) => i.group === key)) {
      box.append(...chip("c-" + item.id, item.name, state.selected.has(item.id), (on) => (on ? state.selected.add(item.id) : state.selected.delete(item.id))));
    }
    fs.append(box);
    return fs;
  }));
  $("drinkChips").replaceChildren(...DEFAULTS.drinks.flatMap((d) =>
    chip("d-" + d.id, d.name, state.drinks.has(d.id), (on) => (on ? state.drinks.add(d.id) : state.drinks.delete(d.id)))));
}

// Erwachsene mit Fleisch und Vegetarier sind getrennte Zahlen; zusammen hoechstens MAX_GUESTS Erwachsene.
const maxFor = (k) => (k === "adults" ? MAX_GUESTS - state.veg : k === "veg" ? MAX_GUESTS - state.adults : MAX_GUESTS);

function renderSteppers() {
  for (const k of ["adults", "kids", "veg"]) {
    const inp = $(k);
    inp.max = maxFor(k);
    if (document.activeElement !== inp || inp.value !== "") inp.value = state[k];
  }
  document.querySelectorAll("[data-step]").forEach((btn) => {
    const k = btn.dataset.step, d = +btn.dataset.d;
    const max = maxFor(k);
    btn.disabled = d < 0 ? state[k] <= 0 : state[k] >= max;
  });
}

function itemRow(count, cls, title, note, weight) {
  const li = el("li", cls);
  const t = el("span", "t", title);
  t.append(el("small", null, note));
  li.append(el("span", "n", count), t, el("span", "w", weight));
  return li;
}

function update() {
  current = calculate({
    adults: state.adults + state.veg, kids: state.kids, veg: state.veg,
    hunger: radio("hunger"), anlass: radio("anlass"), beilagen: radio("beilagen"),
    selected: [...state.selected], drinks: [...state.drinks],
  }, cfg);
  const r = current, g = r.guests;

  $("slipTitle").textContent = g.total ? `Grillparty für ${g.total}` : "Wer kommt?";
  $("guestLine").textContent = g.total
    ? [g.meatEaters ? `${g.meatEaters} mit Fleisch` : "", g.veg ? `${g.veg} vegetarisch` : "", g.kids ? `${g.kids} ${g.kids === 1 ? "Kind" : "Kinder"}` : ""].filter(Boolean).join(" · ")
    : "Trag oben ein, wer kommt.";

  const list = $("items");
  list.replaceChildren(
    ...(state.selected.size ? r.warnings : r.warnings.length ? ["adults-no-meat"] : []).map((w) => el("li", "warn", WARNINGS[w])),
    ...r.lines.map((l) => itemRow(l.count, l.kind === "veg" ? "veg" : "", l.name, `${l.note} · à ${l.piece} g`, fmtKg(l.grams))),
    ...r.sides.map((s) => s.count != null
      ? itemRow(s.count, "side", s.name, s.note, "")
      : itemRow("", "side", `${sideAmount(s)} ${s.name}`, s.note, "")),
    ...(r.drinks.length ? [el("li", "sep", "Getränke")] : []),
    ...r.drinks.map((d) => itemRow(d.count, "drink", d.name, d.note, "")),
  );
  const sum = r.price + r.drinkPrice;
  $("price").textContent = sum ? "≈ " + fmtEur(sum) : "";
  $("priceNote").replaceChildren(
    document.createTextNode(r.drinkPrice && r.price ? `Grillgut ≈ ${fmtEur(r.price)} · Getränke ≈ ${fmtEur(r.drinkPrice)}` : r.drinkPrice ? "Getränke, Richtpreis ohne Pfand" : "Grillgut, Richtpreis"),
    el("br"), document.createTextNode("Theke und Markt können abweichen"));
  $("perPerson").hidden = !(sum && g.total);
  $("perPerson").textContent = sum && g.total ? `≈ ${fmtEurCent(r.perPerson)} pro Person` : "";

  renderWaste(r);
  renderLeftovers(r);

  $("waBtn").href = g.total ? "https://wa.me/?text=" + encodeURIComponent(shareText(r)) : "#liste";
  $("waBtn").setAttribute("aria-disabled", String(!g.total));
  $("copyBtn").setAttribute("aria-disabled", String(!g.total));
  $("printBtn").setAttribute("aria-disabled", String(!g.total));
  $("jump").hidden = !g.total;
  $("jump").textContent = g.total ? `Zur Einkaufsliste für ${g.total} ↓` : "";
  $("summary").textContent = g.total ? `Liste aktualisiert: ${r.lines.length} Grillartikel für ${g.total} Gäste.` : "";
  renderSteppers();
}

function renderWaste(r) {
  const box = $("waste");
  box.hidden = !(r.grillGrams && r.ruleGrams);
  if (box.hidden) return;
  const max = Math.max(r.ruleGrams, r.grillGrams);
  // Angezeigte Werte so runden, dass Faustregel − GLUTMASS genau die ausgewiesene Ersparnis ergibt.
  const ours = r.lessGrams ? r.ruleGrams - Math.round(r.lessGrams / 100) * 100 : r.grillGrams;
  $("kgRule").textContent = fmtKg(r.ruleGrams);
  $("kgOurs").textContent = fmtKg(ours);
  $("barRule").style.width = `${(r.ruleGrams / max) * 100}%`;
  $("barOurs").style.width = `${(r.grillGrams / max) * 100}%`;
  if (r.lessGrams) {
    $("lessKg").textContent = `${fmtKg(r.lessGrams)} weniger`;
    $("lessText").textContent = `eingekauft · rund ${fmtEur(r.lessEuro)} weniger an der Theke`;
  } else {
    $("lessKg").textContent = "Passt.";
    $("lessText").textContent = "Bei so viel Hunger liegt die Liste auf Höhe der Faustregel.";
  }
}

function renderLeftovers(r) {
  const box = $("reste");
  const rows = r.lines.filter((l) => LEFTOVERS[l.id]).map((l) => [l.name, LEFTOVERS[l.id]]);
  box.hidden = !rows.length;
  if (box.hidden) return;
  $("resteList").replaceChildren(...[...rows, LEFTOVER_ALL].flatMap(([k, v]) => [el("dt", null, k), el("dd", null, v)]));
}

function toast(id, msg) {
  $(id).textContent = msg;
  clearTimeout(toast[id]);
  toast[id] = setTimeout(() => ($(id).textContent = ""), 3000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = el("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.className = "sr";
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    t.remove();
    return ok;
  }
}

// --- Gemeinsamer Zaehler ---------------------------------------------------
function showCounter(data) {
  const kg = $("counterKg"), note = $("counterNote");
  if (!data) { kg.textContent = "–"; note.textContent = "(Zähler gerade nicht erreichbar)"; return; }
  if (!data.listen) { kg.textContent = "0 kg"; note.textContent = "– deine Liste ist die erste"; return; }
  kg.textContent = `${fmtKg(data.gramm)} weniger`;
  note.textContent = `auf ${data.listen.toLocaleString("de-DE")} geteilten ${data.listen === 1 ? "Liste" : "Listen"}`;
}

async function loadCounter() {
  try {
    const res = await fetch(COUNTER_URL, { headers: { Accept: "application/json" } });
    showCounter(res.ok ? await res.json() : null);
  } catch { showCounter(null); }
}

async function countList() {
  if (!current?.lessGrams || !isDefaultConfig(cfg)) return;
  const ss = store("sessionStorage");
  try { if (ss?.getItem(COUNTED_KEY)) return; ss?.setItem(COUNTED_KEY, "1"); } catch { /* ohne Sperre nicht zaehlen */ return; }
  try {
    const res = await fetch(COUNTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ gramm: Math.round(current.lessGrams) }),
    });
    if (res.ok) showCounter(await res.json());
  } catch { /* Zaehler ist Kuer, die Liste funktioniert trotzdem */ }
}

// --- Eigene Annahmen -------------------------------------------------------
function numInput(value, step, label, [min, max], onChange) {
  const input = el("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.min = String(min);
  input.max = String(max);
  input.step = "any";
  input.value = value;
  input.setAttribute("aria-label", label);
  input.title = `Erlaubt: ${min} bis ${max}`;
  input.addEventListener("input", () => {
    const v = parseFloat(input.value.replace(",", "."));
    const ok = Number.isFinite(v) && v >= min && v <= max;
    input.setAttribute("aria-invalid", String(!ok));
    if (!ok) return toast("cfgToast", `${label}: bitte einen Wert von ${min} bis ${max} eingeben.`);
    onChange(v);
    saveConfig();
    update();
  });
  return input;
}

function renderConfig() {
  $("cfgItems").replaceChildren(...cfg.items.map((item) => {
    const tr = el("tr");
    const name = el("td", null, item.name + " ");
    if (item.veg) name.append(el("span", "veg-tag", "veg."));
    tr.append(name);
    for (const [field, step, unit, range] of [["piece", 10, "Stückgewicht in Gramm", [10, 2000]], ["share", 5, "Anteil in Prozent", [0, 1000]], ["price", 0.5, "Preis in Euro pro Kilo", [0, 500]]]) {
      const td = el("td");
      td.append(numInput(item[field], step, `${item.name}: ${unit}`, range, (v) => { item[field] = v; }));
      tr.append(td);
    }
    return tr;
  }));
  $("cfgBase").replaceChildren(...Object.entries(BASE_INFO).map(([k, [label, hint]]) => {
    const tr = el("tr");
    const td = el("td");
    td.append(numInput(cfg.base[k], k.startsWith("bread") ? 0.5 : 10, label, [0, 5000], (v) => { cfg.base[k] = v; }));
    tr.append(el("th", null, label), td, el("td", "muted", hint));
    tr.firstChild.scope = "row";
    return tr;
  }));
}

// --- Start -----------------------------------------------------------------
document.querySelectorAll("[data-step]").forEach((btn) => btn.addEventListener("click", () => {
  const k = btn.dataset.step;
  state[k] = Math.max(0, Math.min(maxFor(k), state[k] + Number(btn.dataset.d)));
  update();
}));
document.querySelectorAll("input.count").forEach((inp) => {
  inp.addEventListener("input", () => {
    if (inp.value === "") return;
    const max = maxFor(inp.id);
    state[inp.id] = Math.max(0, Math.min(max, Math.floor(Number(inp.value) || 0)));
    update();
  });
  inp.addEventListener("blur", () => { inp.value = state[inp.id]; });
  inp.addEventListener("focus", () => inp.select());
});
document.querySelectorAll(".seg input").forEach((r) => r.addEventListener("change", update));

$("copyBtn").addEventListener("click", async () => {
  if (!current?.guests.total) return toast("toast", "Erst Gäste eintragen.");
  if (await copyText(shareText(current))) {
    toast("toast", "Liste kopiert.");
    countList();
  } else {
    toast("toast", "Kopieren ging nicht – bitte per WhatsApp teilen.");
  }
});
$("printBtn").addEventListener("click", () => {
  if (!current?.guests.total) return toast("toast", "Erst Gäste eintragen.");
  window.print();
});
$("waBtn").addEventListener("click", (e) => {
  if (!current?.guests.total) { e.preventDefault(); return toast("toast", "Erst Gäste eintragen."); }
  countList();
});
$("cfgReset").addEventListener("click", () => {
  cfg = cloneDefaults();
  saveConfig();
  renderConfig();
  update();
  toast("cfgToast", "Standardwerte wiederhergestellt.");
});

if (!isDefaultConfig(cfg)) $("annahmen").open = true;
renderChips();
renderConfig();
update();
loadCounter();
