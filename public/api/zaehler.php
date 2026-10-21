<?php
// GLUTMASS – gemeinsamer Zaehler.
// Addiert anonym die Gramm "weniger eingekauft" geteilter Listen. Speichert keine IP-Adressen
// und keine Personendaten, nur zwei Summen und eine globale Minuten-Bremse.
//
// GET  -> {"gramm": 123456, "listen": 789}
// POST {"gramm": 950} -> neue Summen

declare(strict_types=1);

const DATA_DIR = __DIR__ . '/data';
const DATA_FILE = DATA_DIR . '/zaehler.json';
const MIN_GRAMM = 100;
const MAX_GRAMM = 50000;      // hoechstens 50 kg pro Liste
const MAX_PRO_MINUTE = 30;    // globale Bremse gegen Massen-Einsendungen
const MAX_BODY = 200;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function antwort(int $status, array $daten): void
{
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

function leer(): array
{
    return ['gramm' => 0, 'listen' => 0, 'minute' => 0, 'minuteListen' => 0];
}

function lesen($fh): array
{
    rewind($fh);
    $roh = stream_get_contents($fh);
    $daten = is_string($roh) && $roh !== '' ? json_decode($roh, true) : null;
    return is_array($daten) ? array_merge(leer(), $daten) : leer();
}

function oeffentlich(array $d): array
{
    return ['gramm' => (int) $d['gramm'], 'listen' => (int) $d['listen']];
}

function datei(string $modus)
{
    if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0750, true) && !is_dir(DATA_DIR)) {
        antwort(500, ['fehler' => 'speicher']);
    }
    $fh = @fopen(DATA_FILE, $modus);
    if ($fh === false) {
        antwort(500, ['fehler' => 'speicher']);
    }
    return $fh;
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'GET') {
    if (!is_file(DATA_FILE)) {
        antwort(200, oeffentlich(leer()));
    }
    $fh = datei('r');
    flock($fh, LOCK_SH);
    $daten = lesen($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    antwort(200, oeffentlich($daten));
}

if ($methode !== 'POST') {
    header('Allow: GET, POST');
    antwort(405, ['fehler' => 'methode']);
}

// Nur Anfragen von der eigenen Seite annehmen (Browser senden Origin bei fetch-POST mit).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin === '' || parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $host)) {
    antwort(403, ['fehler' => 'herkunft']);
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    antwort(415, ['fehler' => 'format']);
}

$roh = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($roh === false || strlen($roh) > MAX_BODY) {
    antwort(413, ['fehler' => 'groesse']);
}
$eingabe = json_decode($roh, true);
$gramm = is_array($eingabe) && isset($eingabe['gramm']) && is_int($eingabe['gramm']) ? $eingabe['gramm'] : null;
if ($gramm === null || $gramm < MIN_GRAMM) {
    antwort(422, ['fehler' => 'wert']);
}
$gramm = min($gramm, MAX_GRAMM);

$fh = datei('c+');
if (!flock($fh, LOCK_EX)) {
    fclose($fh);
    antwort(503, ['fehler' => 'belegt']);
}
$daten = lesen($fh);

$minute = intdiv(time(), 60);
if ((int) $daten['minute'] !== $minute) {
    $daten['minute'] = $minute;
    $daten['minuteListen'] = 0;
}
if ($daten['minuteListen'] >= MAX_PRO_MINUTE) {
    flock($fh, LOCK_UN);
    fclose($fh);
    header('Retry-After: 60');
    antwort(429, oeffentlich($daten));
}

$daten['gramm'] = (int) $daten['gramm'] + $gramm;
$daten['listen'] = (int) $daten['listen'] + 1;
$daten['minuteListen'] = (int) $daten['minuteListen'] + 1;

ftruncate($fh, 0);
rewind($fh);
fwrite($fh, json_encode($daten));
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);

antwort(200, oeffentlich($daten));
