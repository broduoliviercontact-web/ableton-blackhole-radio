// Tokens DA « Control Room » Radio Blackhole — régie performer sombre, alignée
// sur l'identité de la page publique (splitflap/hotfx non touchés). Réutilisés
// par PerformerGate / Performer / RadioMessageForm / AudioDeviceSelect /
// ConfigCheckButton / AudioMeter pour les rares styles inline dynamiques
// (couleur selon statut, warn/ok/err conditionnels). ponytail: les littéraux
// hex vivent dans index.css (--cr-* sur :root, source unique) ; ce module ne
// fait que les référencer via var(). La page publique (/ et /listen) n'en
// dépend pas.
export const cr = {
  bgPage: 'var(--cr-bg-page)',
  surface: 'var(--cr-surface)',
  surfaceSunken: 'var(--cr-surface-sunken)',
  surfaceRaised: 'var(--cr-surface-raised)',
  border: 'var(--cr-border)',
  borderStrong: 'var(--cr-border-strong)',
  text: 'var(--cr-text)',
  textMuted: 'var(--cr-text-muted)',
  textDim: 'var(--cr-text-dim)',
  accent: 'var(--cr-accent)',
  accentDeep: 'var(--cr-accent-deep)',
  accentBright: 'var(--cr-accent-bright)',
  live: 'var(--cr-live)',
  warn: 'var(--cr-warn)',
  ok: 'var(--cr-ok)',
  err: 'var(--cr-err)',
  idle: 'var(--cr-idle)',
  mono: 'var(--mono, ui-monospace, Consolas, monospace)',
} as const