import { flushSync } from 'react-dom'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

// View Transition API cuando el navegador la soporta y el usuario no pidió menos movimiento.
// Si no, el cambio (la navegación) se hace normal, sin animación.
// flushSync hace que React pinte la nueva pantalla dentro del callback, así el navegador
// captura el "antes" y el "después" correctos para animar entre ellos.
export function withViewTransition(update: () => void) {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}
