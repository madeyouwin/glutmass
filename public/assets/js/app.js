// GLUTMASS Oberflaeche: liest Eingaben, ruft calc.js, zeichnet den Theken-Zettel.
import {
  MAX_GUESTS, calculate, sanitizeConfig, cloneDefaults, isDefaultConfig, defaultSelection,
  fmtKg, fmtEur, sideAmount, shareText,
} from "./calc.js?v=1";

const CFG_KEY = "glutmass-annahmen";      // localStorage, nur wenn eigene Annahmen gesetzt sind
const COUNTED_KEY = "glutmass-gezaehlt";  // sessionStorage, Sperre gegen Mehrfachzaehlung
const COUNTER_URL = "/api/zaehler.php";

const BASE_INFO = {
  adult: ["Fleisch pro Erwachsenem (g, roh)", "bei normalem Hunger, Party, normalen Beilagen"],
  kid: ["Fleisch pro Kind (g)", "Bratwurst und Hähnchen, 70 : 30"],
  vegP: ["Vegetarisch pro Person (g)", "Grillkäse und Gemüse zusammen"],
  bread: ["Brötchen pro Erwachsenem", "oder 2 Scheiben Baguette"],
  breadKid: ["Brötchen pro Kind", ""],
  salad: ["Salat pro Person (g)", "angepasst an die Beilagen-Wahl"],
  sauce: ["Saucen & Dips pro Person (ml)", ""],
};
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
const state = { adults: 8, kids: 4, veg: 2, selected: new Set(defaultSelection()) };
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
  for (const k of ["adults", "kids", "veg"]) $(k).textContent = state[k];
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
    : "Gib links die Gäste ein.";

  const list = $("items");
  list.replaceChildren(
    ...r.warnings.map((w) => el("li", "warn", WARNINGS[w])),
    ...r.lines.map((l) => itemRow(l.count, l.kind === "veg" ? "veg" : "", l.name, `${l.note} · à ${l.piece} g`, fmtKg(l.grams))),
    ...r.sides.map((s) => s.count != null
      ? itemRow(s.count, "side", s.name, s.note, "")
      : itemRow("", "side", `${sideAmount(s)} ${s.name}`, s.note, "")),
  );
  $("price").textContent = r.grillGrams ? "≈ " + fmtEur(r.price) : "–";

  const waste = $("waste");
  waste.replaceChildren();
  if (r.lessGrams) {
    waste.append(el("b", null, `${fmtKg(r.lessGrams)} weniger`),
      el("p", null, `eingekauft als nach der 400-g-Faustregel. Das sind rund ${fmtEur(r.lessEuro)} weniger an der Theke.`));
  } else if (r.grillGrams) {
    waste.append(el("b", null, "Passt."),
      el("p", null, "Bei so viel Hunger liegt die Liste auf Höhe der Faustregel. Reste lassen sich gut einfrieren."));
  }

  $("waBtn").href = "https://wa.me/?text=" + encodeURIComponent(shareText(r));
  $("summary").textContent = g.total ? `Liste aktualisiert: ${r.lines.length} Grillartikel für ${g.total} Gäste.` : "";
  renderSteppers();
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
  const c = $("counter");
  c.replaceChildren("Gemeinsamer Zähler: ");
  if (!data) {
    c.append(el("strong", null, "gerade nicht erreichbar"), ".");
  } else if (!data.listen) {
    c.append(el("strong", null, "startet mit deiner Liste"), ". Er addiert nur, wie viel weniger auf geteilten Listen steht – ohne Personendaten.");
  } else {
    c.append(el("strong", null, `${fmtKg(data.gramm)} weniger`),
      ` auf ${data.listen.toLocaleString("de-DE")} ${data.listen === 1 ? "geteilten Einkaufsliste" : "geteilten Einkaufslisten"} als nach der Faustregel. `);
    const a = el("a", null, "Wie wir zählen");
    a.href = "/so-rechnen-wir.html#zaehler";
    c.append(a);
  }
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
function numInput(value, step, label, onChange) {
  const input = el("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.min = "0";
  input.step = String(step);
  input.value = value;
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v) || v < 0) return;
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
    for (const [field, step, unit] of [["piece", 10, "Stückgewicht in Gramm"], ["share", 5, "Anteil in Prozent"], ["price", 0.5, "Preis in Euro pro Kilo"]]) {
      const td = el("td");
      td.append(numInput(item[field], step, `${item.name}: ${unit}`, (v) => { item[field] = field === "piece" ? Math.max(10, v) : v; }));
      tr.append(td);
    }
    return tr;
  }));
  $("cfgBase").replaceChildren(...Object.entries(BASE_INFO).map(([k, [label, hint]]) => {
    const tr = el("tr");
    const td = el("td");
    td.append(numInput(cfg.base[k], k.startsWith("bread") ? 0.5 : 10, label, (v) => { cfg.base[k] = v; }));
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
$("waBtn").addEventListener("click", () => countList());
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
