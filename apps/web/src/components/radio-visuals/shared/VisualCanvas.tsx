import { useEffect, useRef } from 'react'
import type { RadioMetrics } from '../radioVisualTypes'

export interface CanvasFrame {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  time: number
  metrics: RadioMetrics
}

interface Props {
  className: string
  label: string
  metrics: RadioMetrics
  draw: (frame: CanvasFrame) => void
}

/** Canvas responsif, DPR plafonne a 2, boucle arretee au demontage. */
export function VisualCanvas({ className, label, metrics, draw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let width = 1
    let height = 1
    let ratio = 1
    let raf = 0
    let previous = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      const pixelWidth = Math.max(1, Math.round(width * ratio))
      const pixelHeight = Math.max(1, Math.round(height * ratio))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const render = (time: number) => {
      raf = requestAnimationFrame(render)
      const metricsNow = metricsRef.current
      const maxFps = document.hidden ? 4 : metricsNow.reducedMotion ? 8 : 30
      if (time - previous < 1000 / maxFps) return
      previous = time
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawRef.current({ ctx: context, width, height, time, metrics: metricsNow })
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} role="img" aria-label={label} />
}
