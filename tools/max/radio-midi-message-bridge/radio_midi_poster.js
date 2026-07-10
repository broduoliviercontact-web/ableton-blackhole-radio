// radio_midi_poster.js — couche HTTP POST (Node for Max, `node.script`).
// Reçoit un message JSON validé et le POST à /api/broadcast-message (endpoint existant).
// backendUrl + performerPassword fournis via le message `config <url> <pw>` (depuis Max,
// jamais commités) — voir README.md. Aucune autre route serveur touchée.
//
// Deux modes :
//   `post <jsonStr>`   : message validé venant du décodeur radio_midi_bridge.js (mode MIDI).
//   `sendnow <jsonStr>`: message direct, sans clip MIDI (mode Send Now).
//
// Ponytail : http/https natifs (fetch pas garanti selon la version Node for Max).

const max = require("max-api");
const http = require("http");
const https = require("https");

let backendUrl = ""; // ex: http://localhost:3001
let performerPassword = "";

max.addHandler("config", (url, pw) => {
  backendUrl = String(url || "");
  performerPassword = String(pw || "");
  max.post(
    "radio-midi poster: backend=" +
      (backendUrl || "(vide)") +
      " password=" +
      (performerPassword ? "ok" : "(vide)"),
  );
});

max.addHandler("sendnow", (...args) => postMessage(args[0], "sendnow"));
max.addHandler("post", (jsonStr) => postMessage(jsonStr, "decode"));

function postMessage(jsonStr, mode) {
  if (!backendUrl) {
    max.outlet("status", "error", "backendUrl non configuré");
    return;
  }
  if (!performerPassword) {
    max.outlet("status", "error", "performerPassword non configuré");
    return;
  }
  let message;
  try {
    message = JSON.parse(jsonStr);
  } catch (e) {
    max.outlet("status", "error", "JSON message invalide");
    return;
  }
  const body = JSON.stringify({ performerPassword, message });
  const url = backendUrl.replace(/\/$/, "") + "/api/broadcast-message";
  const lib = url.startsWith("https") ? https : http;
  const u = new URL(url);
  const req = lib.request(
    {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          max.outlet("status", "ok", mode, res.statusCode);
          max.post("radio-midi: POST ok (" + res.statusCode + ", " + mode + ")");
        } else {
          max.outlet("status", "error", res.statusCode, data.slice(0, 200));
          max.post("radio-midi: POST échec " + res.statusCode + " " + data.slice(0, 200));
        }
      });
    },
  );
  req.on("error", (e) => {
    max.outlet("status", "error", String(e && e.message ? e.message : e));
    max.post("radio-midi: POST exception " + (e && e.message));
  });
  req.write(body);
  req.end();
}