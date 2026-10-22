// Prueft, dass die Zahlen auf "So rechnen wir" mit den Werten in calc.js uebereinstimmen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULTS } from "../public/assets/js/calc.js";

const html = readFileSync(new URL("../public/so-rechnen-wir.html", import.meta.url), "utf8");
const derived = { "rule.vegGrams": DEFAULTS.rule.adult * DEFAULTS.rule.vegShare };

function lookup(path) {
  if (path in derived) return derived[path];
  const [head, ...rest] = path.split(".");
  if (head === "items" || head === "drinks") {
    const [id, field] = rest;
    return DEFAULTS[head].find((i) => i.id === id)?.[field];
  }
  return rest.reduce((o, k) => o?.[k], DEFAULTS[head]);
}

test("Methodenseite stimmt mit calc.js überein", () => {
  const marks = [...html.matchAll(/data-wert="([^"]+)">([^<]+)</g)];
  assert.ok(marks.length > 30, "Methodenseite enthält die markierten Werte");
  for (const [, path, text] of marks) {
    const shown = parseFloat(text.trim().replace(",", "."));
    assert.equal(shown, lookup(path), `${path}: Seite zeigt ${text}, calc.js hat ${lookup(path)}`);
  }
});
