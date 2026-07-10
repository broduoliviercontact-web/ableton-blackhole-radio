// radio_midi_bridge.js — décodeur MIDI pour le Radio MIDI Message Bridge (v1).
// Objet Max `js` (pas Node for Max). Logique temps-réel notein → message JSON.
// autowatch : cocher "autowatch" dans l'inspecteur du js (recharge à la sauvegarde).
//
// Inlet 0 : list [pitch, velocity, channel] venant de `notein` (canal 16 filtré ici),
//           ou `msg_int` (pitch seul), ou `clear` (force reset).
// Outlet 0 : message JSON validé (string), prêt à poster → `prepend post` → node.script.
// Outlet 1 : statut/log (string) : "receiving", "clear", "duplicate ignored ...",
//            "ok <eventId> (<n> b64)", "error <raison>".
//
// Réception : filtre canal != 16, ignore note-off (velocity 0), START(1)=buffer+receiving,
// CLEAR(3)=vide+cancel, END(2)=decode→valide→checksum→anti-dup→outlet.
//
// Aucun HTTP ici (l'objet `js` n'a pas fetch). La couche HTTP vit dans
// radio_midi_poster.js (Node for Max). Voir README.md et
// apps/docs/radio-midi-message-bridge.md.
//
// Miroir exact de apps/web/src/lib/radioMidiMessageProtocol.ts (checksum, validation,
// anti-dup). Ponytail : vanilla JS (pas d'atob/btoa/TextDecoder — non garantis dans le
// moteur js de Max), Base64 + UTF-8 codés à la main.

var PROTOCOL = "radio-midi-message";
var VERSION = 1;
var CHANNEL = 16; // canal utilisateur (notein expose 1–16 ; raw = 15)
var NOTE_START = 1;
var NOTE_END = 2;
var NOTE_CLEAR = 3;
var DUP_WINDOW_MS = 2000;
var MAX_BASE64 = 4096;

var buffer = ""; // Base64 accumulé entre START et END
var receiving = false;
var lastEventId = null;
var lastSentAt = null;

function log(msg) {
  outlet(1, msg);
  post("radio-midi: " + msg + "\n");
}

// --- Base64 → bytes → UTF-8 → string (vanilla, sans atob/TextDecoder) ---------
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(b64) {
  var str = b64.replace(/[^A-Za-z0-9+/]/g, ""); // strip padding/espaces
  var out = [];
  var bits = 0,
    acc = 0;
  for (var i = 0; i < str.length; i++) {
    var v = B64.indexOf(str.charAt(i));
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return out;
}

function bytesToUtf8(b) {
  var s = "";
  var i = 0;
  while (i < b.length) {
    var c = b[i++];
    if (c < 0x80) s += String.fromCharCode(c);
    else if (c < 0xe0) s += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f));
    else if (c < 0xf0)
      s += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
    else {
      var cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
      cp -= 0x10000;
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return s;
}

// --- Checksum : somme charCodes mod 65535, hex minuscule (sur Base64 corps) ---
function checksumOf(b64) {
  var sum = 0;
  for (var i = 0; i < b64.length; i++) sum = (sum + b64.charCodeAt(i)) % 65535;
  return sum.toString(16);
}

// --- Validation paquet -------------------------------------------------------
function validatePacket(pkt) {
  if (!pkt || typeof pkt !== "object") throw "paquet attendu (objet)";
  if (pkt.protocol !== PROTOCOL) throw "protocol invalide";
  if (pkt.version !== VERSION) throw "version non supportée";
  if (typeof pkt.eventId !== "string" || pkt.eventId.length === 0) throw "eventId requis";
  if (typeof pkt.message !== "object" || pkt.message === null) throw "message requis (objet)";
}

// Retire checksum en préservant l'ordre des clés (pour recalcul côté décodeur).
function bodyString(pkt) {
  var copy = {};
  for (var k in pkt) if (Object.prototype.hasOwnProperty.call(pkt, k) && k !== "checksum") copy[k] = pkt[k];
  return JSON.stringify(copy);
}

// UTF-8 → Base64 (vanilla, pour recalculer le checksum côté décodeur).
function utf8ToBase64(str) {
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0xd800 || c >= 0xe000)
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else {
      i++;
      var cp = 0x10000 + ((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff);
      bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
  }
  var out = "",
    bits = 0,
    acc = 0;
  for (var j = 0; j < bytes.length; j++) {
    acc = (acc << 8) | bytes[j];
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += B64.charAt((acc >> bits) & 0x3f);
    }
  }
  if (bits > 0) out += B64.charAt((acc << (6 - bits)) & 0x3f);
  while (out.length % 4 !== 0) out += "=";
  return out;
}

function isValidBase64Pitch(p) {
  return (
    p === 43 || // +
    p === 47 || // /
    p === 61 || // =
    (p >= 48 && p <= 57) || // 0-9
    (p >= 65 && p <= 90) || // A-Z
    (p >= 97 && p <= 122) // a-z
  );
}

function finalize() {
  receiving = false;
  var b64 = buffer;
  buffer = "";
  if (b64.length === 0) {
    log("error buffer vide");
    return;
  }
  var jsonStr;
  try {
    jsonStr = bytesToUtf8(base64ToBytes(b64));
  } catch (e) {
    log("error decode base64/utf8");
    return;
  }
  var pkt;
  try {
    pkt = JSON.parse(jsonStr);
  } catch (e) {
    log("error JSON parse");
    return;
  }
  try {
    validatePacket(pkt);
  } catch (e) {
    log("error " + e);
    return;
  }
  if (pkt.checksum !== undefined && pkt.checksum !== null) {
    var expected = checksumOf(utf8ToBase64(bodyString(pkt)));
    if (expected !== pkt.checksum) {
      log("error checksum mismatch (attendu " + expected + " reçu " + pkt.checksum + ")");
      return;
    }
  }
  var now = Date.now();
  if (pkt.eventId === lastEventId && lastSentAt !== null && now - lastSentAt < DUP_WINDOW_MS) {
    log("duplicate ignored " + pkt.eventId);
    return;
  }
  lastEventId = pkt.eventId;
  lastSentAt = now;
  outlet(0, JSON.stringify(pkt.message)); // message BroadcastInput prêt à poster
  log("ok " + pkt.eventId + " (" + b64.length + " b64)");
}

// --- Entrées Max ------------------------------------------------------------
function list() {
  // arguments = pitch, velocity, channel (depuis notein)
  if (arguments.length < 1) return;
  var pitch = arguments[0];
  var vel = arguments.length > 1 ? arguments[1] : 100;
  var chan = arguments.length > 2 ? arguments[2] : CHANNEL;
  handleNote(pitch, vel, chan);
}

function msg_int(pitch) {
  handleNote(pitch, 100, CHANNEL); // pitch seul (canal supposé 16)
}

function handleNote(pitch, vel, chan) {
  if (chan !== CHANNEL) return; // n'écoute que le canal 16
  if (vel === 0) return; // ignore note-off (note-on vel 0)
  if (pitch === NOTE_START) {
    buffer = "";
    receiving = true;
    log("receiving");
    return;
  }
  if (pitch === NOTE_CLEAR) {
    buffer = "";
    receiving = false;
    log("clear");
    return;
  }
  if (!receiving) return;
  if (pitch === NOTE_END) {
    finalize();
    return;
  }
  if (!isValidBase64Pitch(pitch)) {
    log("error pitch invalide " + pitch);
    return;
  }
  buffer += String.fromCharCode(pitch);
  if (buffer.length > MAX_BASE64) {
    buffer = "";
    receiving = false;
    log("error payload > " + MAX_BASE64);
  }
}

function clear() {
  buffer = "";
  receiving = false;
  lastEventId = null;
  lastSentAt = null;
  log("reset");
}

function anything() {
  log("message inconnu: " + messagename);
}