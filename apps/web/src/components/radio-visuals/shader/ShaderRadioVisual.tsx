import { useEffect, useRef, useState } from 'react'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

// Six scenes restent dans un seul programme: changement instantane de preset,
// aucune recompilation GLSL pendant une publication ou un changement de scene.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_energy;
uniform float u_peak;
uniform float u_bass;
uniform float u_treble;
uniform float u_stereo;
uniform float u_intensity;
uniform float u_preset;
uniform vec3 u_palette;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p) { float value = 0.; float scale = .5; for (int i = 0; i < 4; i++) { value += scale * noise(p); p *= 2.03; scale *= .5; } return value; }
mat2 rotate(float angle) { return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); }

vec3 spectralBloom(vec2 uv, float time) {
  vec2 p = uv * 1.45; float ripple = sin(length(p) * 14. - time * 2.4) * (.08 + u_bass * .16); p += normalize(p + .001) * ripple;
  float bloom = pow(max(0., 1. - length(p) * (1.15 - u_energy * .3)), 2.2);
  float petals = pow(max(0., sin(atan(p.y, p.x) * 8. + time * 1.7 + u_stereo * 4.)), 5.) * bloom;
  return u_palette * (bloom * (1.1 + u_peak * 2.) + petals * .8) + vec3(.18, .05, .3) * petals;
}
vec3 liquidScope(vec2 uv, float time) {
  vec2 p = uv; p.x += sin(p.y * 8. + time * 1.5) * (.08 + u_bass * .22); p.y += sin(p.x * 11. - time * 1.2) * (.05 + u_energy * .16);
  float wave = abs(sin((p.x + fbm(p * 3. + time * .15)) * 18. - time * 2.2));
  float line = smoothstep(.91 - u_energy * .13, 1., wave);
  return u_palette * line * (1. + u_peak * 1.6) + vec3(.01, .035, .07) * (1. - line);
}
vec3 feedbackTunnel(vec2 uv, float time) {
  vec2 p = uv; float radius = length(p); float angle = atan(p.y, p.x); float tunnel = sin(10. / (radius + .12) - time * (1.2 + u_energy * 3.) + angle * 5.);
  float rings = smoothstep(.48, 1., tunnel * .5 + .5) * smoothstep(1.35, .1, radius);
  vec3 cold = mix(vec3(.02, .03, .11), u_palette, rings);
  return cold * (1. + u_bass * 1.4);
}
vec3 interferenceField(vec2 uv, float time) {
  vec2 p = uv * rotate(time * .16); float grid = sin(p.x * (22. + u_treble * 18.) + time * 1.8) * sin(p.y * 20. - time * 1.1);
  float interference = smoothstep(.42 - u_energy * .14, .72, grid * .5 + .5 + fbm(p * 4. + time) * .24);
  return mix(vec3(.025, .02, .05), u_palette, interference) + vec3(.22, .03, .08) * (1. - interference) * u_peak;
}
vec3 phosphorPlasma(vec2 uv, float time) {
  vec2 p = uv * 2.; float plasma = sin(p.x * 5. + time) + sin(p.y * 7. - time * 1.4) + sin((p.x + p.y) * 4. + time * 1.7);
  plasma += sin(length(p) * 9. - time * (2. + u_bass * 4.));
  float phosphor = smoothstep(-.5, 2.5, plasma) * (.55 + u_energy * .7);
  return mix(vec3(.005, .02, .012), u_palette, phosphor) + vec3(.12, .9, .38) * pow(max(0., plasma), 5.) * u_peak;
}
vec3 signalAurora(vec2 uv, float time) {
  vec2 p = uv; float curtain = sin(p.x * 4. + time * .55 + fbm(vec2(p.x * 2., time * .12)) * 4. + u_stereo * 2.);
  float band = exp(-abs(p.y - curtain * (.18 + u_bass * .2)) * (7. - u_energy * 3.));
  float stars = step(.985, hash(floor((p + time * .01) * 70.)));
  return vec3(.005, .012, .045) + u_palette * band * (1.1 + u_peak) + vec3(.55, .7, 1.) * stars * (.25 + u_treble);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2. - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float time = u_time * (.45 + u_intensity * .85);
  vec3 color;
  if (u_preset < .5) color = spectralBloom(uv, time);
  else if (u_preset < 1.5) color = liquidScope(uv, time);
  else if (u_preset < 2.5) color = feedbackTunnel(uv, time);
  else if (u_preset < 3.5) color = interferenceField(uv, time);
  else if (u_preset < 4.5) color = phosphorPlasma(uv, time);
  else color = signalAurora(uv, time);
  float vignette = smoothstep(1.45, .22, length(uv));
  float grain = (hash(gl_FragCoord.xy + time) - .5) * (.035 + u_treble * .04);
  outColor = vec4((color + grain) * vignette, 1.0);
}
`

const PRESET_INDEX = {
  'spectral-bloom': 0,
  'liquid-scope': 1,
  'feedback-tunnel': 2,
  'interference-field': 3,
  'phosphor-plasma': 4,
  'signal-aurora': 5,
} as const

const PALETTE_RGB = {
  amber: [0.96, 0.65, 0.18], phosphor: [0.28, 1, 0.56], ice: [0.3, 0.75, 1], signal: [1, 0.24, 0.32], mono: [0.86, 0.9, 0.96],
} as const

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vertex || !fragment) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  gl.deleteProgram(program)
  return null
}

export function ShaderRadioVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metricsRef = useRef(metrics)
  const visualRef = useRef(visual)
  const [fallback, setFallback] = useState(false)
  metricsRef.current = metrics
  visualRef.current = visual

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' })
    if (!canvas || !gl) { setFallback(true); return }
    const program = createProgram(gl)
    if (!program) { setFallback(true); return }
    const position = gl.getAttribLocation(program, 'a_position')
    const buffer = gl.createBuffer()
    if (!buffer || position < 0) { gl.deleteProgram(program); setFallback(true); return }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.useProgram(program)
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'), time: gl.getUniformLocation(program, 'u_time'), energy: gl.getUniformLocation(program, 'u_energy'), peak: gl.getUniformLocation(program, 'u_peak'), bass: gl.getUniformLocation(program, 'u_bass'), treble: gl.getUniformLocation(program, 'u_treble'), stereo: gl.getUniformLocation(program, 'u_stereo'), intensity: gl.getUniformLocation(program, 'u_intensity'), preset: gl.getUniformLocation(program, 'u_preset'), palette: gl.getUniformLocation(program, 'u_palette'),
    }
    let width = 1
    let height = 1
    let raf = 0
    let previous = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const quality = visualRef.current.shaderQuality
      const maxRatio = quality === 'low' ? 0.8 : quality === 'high' ? 1.75 : 1.25
      const ratio = metricsRef.current.reducedMotion ? 0.8 : Math.min(window.devicePixelRatio || 1, maxRatio)
      width = Math.max(1, Math.round(rect.width * ratio))
      height = Math.max(1, Math.round(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height) }
    }
    const contextLost = (event: Event) => { event.preventDefault(); setFallback(true) }
    canvas.addEventListener('webglcontextlost', contextLost)
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const currentMetrics = metricsRef.current
      const currentVisual = visualRef.current
      const qualityFps = currentVisual.shaderQuality === 'low' ? 20 : currentVisual.shaderQuality === 'high' ? 36 : 30
      const fps = document.hidden ? 4 : currentMetrics.reducedMotion ? 8 : qualityFps
      if (now - previous < 1000 / fps) return
      previous = now
      const palette = PALETTE_RGB[currentVisual.visualPalette]
      gl.useProgram(program)
      gl.uniform2f(uniforms.resolution, width, height)
      gl.uniform1f(uniforms.time, now / 1000)
      gl.uniform1f(uniforms.energy, Math.min(1, currentMetrics.rms * 3.2))
      gl.uniform1f(uniforms.peak, Math.min(1, currentMetrics.peak))
      gl.uniform1f(uniforms.bass, currentMetrics.bass)
      gl.uniform1f(uniforms.treble, currentMetrics.treble)
      gl.uniform1f(uniforms.stereo, currentMetrics.stereoWidth)
      gl.uniform1f(uniforms.intensity, currentVisual.visualIntensity / 100)
      gl.uniform1f(uniforms.preset, PRESET_INDEX[currentVisual.shaderPreset])
      gl.uniform3f(uniforms.palette, palette[0], palette[1], palette[2])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('webglcontextlost', contextLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    <RadioVisualShell className="rdv--shader" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className={`rdv-shader${fallback ? ' rdv-shader--fallback' : ''}`}>
        {!fallback && <canvas ref={canvasRef} className="rdv-shader__canvas" role="img" aria-label={`Shader radio ${visual.shaderPreset} réactif au son`} />}
        {fallback && <div className="rdv-shader__fallback" aria-label="Fallback visuel shader radio" role="img" />}
        <div className="rdv-shader__overlay">
          <span>SHADER RADIO / {visual.shaderPreset.replaceAll('-', ' ').toUpperCase()} / {status.toUpperCase()}</span>
          <h1>{data.title}</h1>
          <p>{data.secondary}</p>
          <small>{data.note}</small>
        </div>
      </div>
    </RadioVisualShell>
  )
}
