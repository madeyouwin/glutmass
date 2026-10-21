// GLUTMASS – gemeinsamer Zaehler als Vercel Function.
// Addiert anonym die Gramm "weniger eingekauft" geteilter Listen. Speichert keine IP-Adressen
// und keine Personendaten, nur zwei Summen und globale Bremsen pro Minute und pro Tag.
//
// GET  -> {"gramm": 123456, "listen": 789}
// POST {"gramm": 950} -> neue Summen
//
// Speicher: Upstash Redis (Vercel Marketplace, Region Frankfurt). Die Integration setzt
// KV_REST_API_URL/KV_REST_API_TOKEN oder UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.
// Ohne diese Variablen antwortet der Endpunkt mit 503 und die Seite zeigt
// "gerade nicht erreichbar" – der Rechner selbst funktioniert trotzdem.

export const MIN_GRAMM = 100;
export const MAX_GRAMM = 50000; // hoechstens 50 kg pro Liste
export const MAX_PRO_MINUTE = 30; // globale Bremse gegen Massen-Einsendungen
export const MAX_PRO_TAG = 2000; // Obergrenze pro Tag (UTC), schützt die Summe vor Spam-Wellen
const MAX_BODY = 200;
const KEY_GRAMM = "glutmass:gramm";
const KEY_LISTEN = "glutmass:listen";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function antwort(status, daten, extra = {}) {
  return new Response(JSON.stringify(daten), { status, headers: { ...HEADERS, ...extra } });
}

function speicher(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(s, pfad, befehle) {
  const res = await fetch(`${s.url}/${pfad}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(befehle),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const daten = await res.json();
  if (!Array.isArray(daten) || daten.some((d) => d && d.error)) throw new Error("redis antwort");
  return daten.map((d) => d.result);
}

const zahl = (v) => {
  const n = Number.parseInt(v ?? "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

async function summen(s) {
  const [gramm, listen] = await redis(s, "pipeline", [["GET", KEY_GRAMM], ["GET", KEY_LISTEN]]);
  return { gramm: zahl(gramm), listen: zahl(listen) };
}

// Prueft eine Einsendung, ohne Speicher. Gibt die zu zaehlenden Gramm oder einen Fehler zurueck.
export function pruefen({ origin, host, contentType, body }) {
  let herkunft = null;
  try { herkunft = origin ? new URL(origin).host : null; } catch { herkunft = null; }
  if (!herkunft || !host || herkunft !== host) return { status: 403, fehler: "herkunft" };
  if (!(contentType || "").toLowerCase().startsWith("application/json")) return { status: 415, fehler: "format" };
  if (typeof body !== "string" || body.length > MAX_BODY) return { status: 413, fehler: "groesse" };
  let eingabe = null;
  try { eingabe = JSON.parse(body); } catch { eingabe = null; }
  const g = eingabe && typeof eingabe === "object" ? eingabe.gramm : null;
  if (!Number.isInteger(g) || g < MIN_GRAMM) return { status: 422, fehler: "wert" };
  return { gramm: Math.min(g, MAX_GRAMM) };
}

export async function GET() {
  const s = speicher();
  if (!s) return antwort(503, { fehler: "speicher" });
  try {
    return antwort(200, await summen(s));
  } catch {
    return antwort(503, { fehler: "speicher" });
  }
}

export async function POST(request) {
  const s = speicher();
  if (!s) return antwort(503, { fehler: "speicher" });

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const body = await request.text();
  const p = pruefen({
    origin: request.headers.get("origin"),
    host,
    contentType: request.headers.get("content-type"),
    body: body.slice(0, MAX_BODY + 1),
  });
  if (p.fehler) return antwort(p.status, { fehler: p.fehler });

  try {
    const jetzt = Date.now();
    const minute = `glutmass:minute:${Math.floor(jetzt / 60000)}`;
    const tag = `glutmass:tag:${Math.floor(jetzt / 86400000)}`;
    const [anzahl, , tagesAnzahl] = await redis(s, "pipeline", [
      ["INCR", minute], ["EXPIRE", minute, 120],
      ["INCR", tag], ["EXPIRE", tag, 172800],
    ]);
    if (anzahl > MAX_PRO_MINUTE || tagesAnzahl > MAX_PRO_TAG) {
      return antwort(429, await summen(s), { "Retry-After": anzahl > MAX_PRO_MINUTE ? "60" : "3600" });
    }
    const [gramm, listen] = await redis(s, "multi-exec", [["INCRBY", KEY_GRAMM, p.gramm], ["INCR", KEY_LISTEN]]);
    return antwort(200, { gramm: zahl(gramm), listen: zahl(listen) });
  } catch {
    return antwort(503, { fehler: "speicher" });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 405, headers: { ...HEADERS, Allow: "GET, POST" } });
}
