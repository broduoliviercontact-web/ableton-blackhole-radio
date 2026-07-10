// Tokens DA « Control Room » Radio Blackhole — régie performer sombre, alignée
// sur l'identité de la page publique (splitflap/hotfx non touchés). Réutilisés
// par PerformerGate / Performer / RadioMessageForm / AudioDeviceSelect /
// ConfigCheckButton / AudioMeter pour éviter de dupliquer ~15 littéraux de
// couleur. ponytail: une source de vérité pour la palette régie, pas un design
// system complet — la page publique (/ et /listen) ne dépend pas de ces tokens.
export const cr = {
  bgPage: '#06080c',
  surface: '#0e1117',
  surfaceSunken: '#0b0d12',
  surfaceRaised: '#14161e',
  border: '#23262f',
  borderStrong: '#2a2d36',
  text: '#efe9d6',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  accent: '#f5d76b',
  accentDeep: '#d8b32a',
  accentBright: '#f2ead2',
  live: '#ef4444',
  warn: '#f59e0b',
  ok: '#86efac',
  err: '#fca5a5',
  idle: '#3a3f4b',
  mono: 'var(--mono, ui-monospace, Consolas, monospace)',
} as const