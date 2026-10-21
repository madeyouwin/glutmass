import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefen, MAX_GRAMM, GET, POST } from "../api/zaehler.js";

const gut = { origin: "https://glutmass.de", host: "glutmass.de", contentType: "application/json", body: '{"gramm":950}' };

test("gültige Einsendung wird angenommen", () => {
  assert.deepEqual(pruefen(gut), { gramm: 950 });
});

test("fremde oder fehlende Herkunft wird abgelehnt", () => {
  assert.equal(pruefen({ ...gut, origin: "https://boese.example" }).status, 403);
  assert.equal(pruefen({ ...gut, origin: null }).status, 403);
  assert.equal(pruefen({ ...gut, origin: "kein-url" }).status, 403);
});

test("falsches Format, zu groß, ungültige Werte", () => {
  assert.equal(pruefen({ ...gut, contentType: "text/plain" }).status, 415);
  assert.equal(pruefen({ ...gut, body: "x".repeat(201) }).status, 413);
  assert.equal(pruefen({ ...gut, body: "{kaputt" }).status, 422);
  assert.equal(pruefen({ ...gut, body: '{"gramm":99}' }).status, 422);
  assert.equal(pruefen({ ...gut, body: '{"gramm":"950"}' }).status, 422);
  assert.equal(pruefen({ ...gut, body: '{"gramm":950.5}' }).status, 422);
});

test("pro Liste höchstens 50 kg", () => {
  assert.deepEqual(pruefen({ ...gut, body: '{"gramm":999999}' }), { gramm: MAX_GRAMM });
});

test("ohne Speicher antwortet der Endpunkt mit 503", async () => {
  for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete process.env[k];
  assert.equal((await GET()).status, 503);
  const req = new Request("https://glutmass.de/api/zaehler", {
    method: "POST", headers: { origin: "https://glutmass.de", host: "glutmass.de", "content-type": "application/json" }, body: '{"gramm":950}',
  });
  assert.equal((await POST(req)).status, 503);
});

test("mit Speicher: zählt, liefert Summen und bremst nach 30 Listen pro Minute", async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "t";
  const db = new Map();
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    const cmds = JSON.parse(opt.body);
    const out = cmds.map(([c, k, v]) => {
      if (c === "GET") return { result: db.has(k) ? String(db.get(k)) : null };
      if (c === "INCR") { db.set(k, (db.get(k) || 0) + 1); return { result: db.get(k) }; }
      if (c === "INCRBY") { db.set(k, (db.get(k) || 0) + v); return { result: db.get(k) }; }
      return { result: 1 };
    });
    return new Response(JSON.stringify(out), { status: 200 });
  };
  const post = () => POST(new Request("https://glutmass.de/api/zaehler", {
    method: "POST", headers: { origin: "https://glutmass.de", host: "glutmass.de", "content-type": "application/json" }, body: '{"gramm":950}',
  }));
  try {
    assert.deepEqual(await (await GET()).json(), { gramm: 0, listen: 0 });
    assert.deepEqual(await (await post()).json(), { gramm: 950, listen: 1 });
    for (let i = 0; i < 29; i++) await post();
    const gebremst = await post();
    assert.equal(gebremst.status, 429);
    assert.deepEqual(await gebremst.json(), { gramm: 950 * 30, listen: 30 });
  } finally {
    globalThis.fetch = orig;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  }
});
