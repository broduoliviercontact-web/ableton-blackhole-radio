import { useEffect, useState } from 'react'

export function useRadioClock(): Date {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return clock
}
