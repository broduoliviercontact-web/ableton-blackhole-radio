export const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value))

export const mix = (from: number, to: number, amount: number): number => from + (to - from) * amount

export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color
  const hex = Math.round(clamp(alpha) * 255).toString(16).padStart(2, '0')
  return `${color}${hex}`
}
