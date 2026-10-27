import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia(QUERY).matches
}

// true si el usuario pidió menos movimiento en su sistema. Se actualiza si lo cambia en vivo.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion)
}
