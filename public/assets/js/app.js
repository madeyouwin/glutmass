// GLUTMASS Oberflaeche: liest Eingaben, ruft calc.js, zeichnet den Theken-Zettel.
import {
  MAX_GUESTS, calculate, sanitizeConfig, cloneDefaults, isDefaultConfig, defaultSelection,
  fmtKg, fmtEur, sideAmount, shareText,
} from "./calc.js?v=1";


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
};
const LEFTOVER_ALL = ["Alles Gegrillte", "Schnell abkühlen lassen, in den Kühlschrank und in 1–2 Tagen essen – oder einfrieren."];

const WARNINGS = {
  "adults-no-meat": "Kein Fleisch gewählt – wähle oben mindestens einen Artikel.",
  "kids-no-meat": "Für die Kinder ist kein Fleisch gewählt.",
  "veg-no-items": "Für die Vegetarier ist nichts Vegetarisches gewählt.",
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
const state = { adults: 0, kids: 0, veg: 0, selected: new Set(defaultSelection()) };
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

function renderChips() {
  for (const [box, veg] of [["meatChips", false], ["vegChips", true]]) {
    const wrap = $(box);
    wrap.replaceChildren();
    for (const item of cfg.items.filter((i) => i.veg === veg)) {
      const input = el("input");
      input.type = "checkbox";
      input.id = "c-" + item.id;
      input.checked = state.selected.has(item.id);
      input.addEventListener("change", () => {
        input.checked ? state.selected.add(item.id) : state.selected.delete(item.id);
        update();
      });
      const label = el("label", null, item.name);
      label.htmlFor = input.id;
      wrap.append(input, label);
    }
  }
}

function renderSteppers() {
  for (const k of ["adults", "kids", "veg"]) {
    const inp = $(k);
    inp.max = k === "veg" ? state.adults : MAX_GUESTS;
    if (document.activeElement !== inp || inp.value !== "") inp.value = state[k];
  }
  document.querySelectorAll("[data-step]").forEach((btn) => {
    const k = btn.dataset.step, d = +btn.dataset.d;
    const max = k === "veg" ? state.adults : MAX_GUESTS;
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
    adults: state.adults, kids: state.kids, veg: state.veg,
    hunger: radio("hunger"), anlass: radio("anlass"), beilagen: radio("beilagen"),
    selected: [...state.selected],
  }, cfg);
  const r = current, g = r.guests;

  $("slipTitle").textContent = g.total ? `Grillparty für ${g.total}` : "Wer kommt?";
  $("guestLine").textContent = g.total
    ? `${g.adults} Erwachsene${g.veg ? ` (davon ${g.veg} vegetarisch)` : ""} · ${g.kids} ${g.kids === 1 ? "Kind" : "Kinder"}`
    : "Trag oben ein, wer kommt.";

  const list = $("items");
  list.replaceChildren(
    ...r.warnings.map((w) => el("li", "warn", WARNINGS[w])),
    ...r.lines.map((l) => itemRow(l.count, l.kind === "veg" ? "veg" : "", l.name, `${l.note} · à ${l.piece} g`, fmtKg(l.grams))),
    ...r.sides.map((s) => s.count != null
      ? itemRow(s.count, "side", s.name, s.note, "")
      : itemRow("", "side", `${sideAmount(s)} ${s.name}`, s.note, "")),
  );
  $("price").textContent = r.grillGrams ? "≈ " + fmtEur(r.price) : "";

  renderWaste(r);
  renderLeftovers(r);

  $("waBtn").href = g.total ? "https://wa.me/?text=" + encodeURIComponent(shareText(r)) : "#liste";
  $("waBtn").setAttribute("aria-disabled", String(!g.total));
  $("copyBtn").setAttribute("aria-disabled", String(!g.total));
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
  state[k] = Math.max(0, Math.min(MAX_GUESTS, state[k] + Number(btn.dataset.d)));
  state.veg = Math.min(state.veg, state.adults);
  update();
}));
document.querySelectorAll("input.count").forEach((inp) => {
  inp.addEventListener("input", () => {
    if (inp.value === "") return;
    const max = inp.id === "veg" ? state.adults : MAX_GUESTS;
    state[inp.id] = Math.max(0, Math.min(max, Math.floor(Number(inp.value) || 0)));
    state.veg = Math.min(state.veg, state.adults);
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
