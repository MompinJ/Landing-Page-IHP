import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { gamepadState, onGamepadAction, onGamepadStatus } from './gamepad'

// Suscripcion a las acciones del mando desde un componente. El callback se
// guarda en una ref para poder pasarlo en linea sin resuscribirse cada render.
export function useGamepadAction(fn, active = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    return onGamepadAction((action, repeat) => ref.current(action, repeat))
  }, [active])
}

// true cuando hay un mando vivo. Cambia pocas veces, asi que va por
// suscripcion y no por sondeo: el resto de la interfaz no re-renderiza.
export function useGamepadConnected() {
  return useSyncExternalStore(
    onGamepadStatus,
    () => gamepadState.connected,
    () => false,
  )
}

// Navegacion de menus con la cruceta.
//
// La rejilla se lee del propio DOM: cada control navegable lleva data-gp-row
// con su numero de fila y el orden dentro de la fila es el del documento. Asi
// el marcado y la navegacion no se pueden desincronizar, y un panel que cambia
// de contenido (el teclado en pantalla desaparece al guardar) no necesita
// avisar de nada.
//
// El cursor se pinta con una clase directamente sobre el elemento en vez de con
// estado de React: mover el cursor no tiene por que re-renderizar el panel.
export function useGamepadGrid(ref, active = true) {
  const pos = useRef({ row: 0, col: 0 })
  // el foco real solo se toma cuando el usuario mueve el mando; al montar solo
  // se pinta el cursor, para no robarle el foco al campo de nombre a quien esta
  // escribiendo con el teclado fisico
  const touched = useRef(false)

  const rows = useCallback(() => {
    const root = ref.current
    if (!root) return []
    const out = []
    for (const el of root.querySelectorAll('[data-gp-row]')) {
      if (el.disabled) continue
      const r = Number(el.dataset.gpRow)
      if (!Number.isFinite(r)) continue
      ;(out[r] || (out[r] = [])).push(el)
    }
    return out.filter(Boolean)
  }, [ref])

  const paint = useCallback(
    (focus) => {
      const grid = rows()
      const root = ref.current
      if (!root) return
      for (const el of root.querySelectorAll('.gp-cursor')) el.classList.remove('gp-cursor')
      if (!grid.length) return
      const p = pos.current
      const row = Math.max(0, Math.min(grid.length - 1, p.row))
      // Si la rejilla encogio por debajo del cursor (al guardar el nombre
      // desaparece el teclado entero) la fila en la que estaba ya no existe, y
      // la columna que traia no significa nada en la fila nueva: se vuelve a la
      // primera, que es siempre la accion principal. Sin esto, guardar dejaba
      // el cursor sobre INICIO en vez de sobre JUGAR OTRA VEZ.
      if (row !== p.row) p.col = 0
      p.row = row
      p.col = Math.max(0, Math.min(grid[p.row].length - 1, p.col))
      const el = grid[p.row][p.col]
      el.classList.add('gp-cursor')
      // sin preventScroll a proposito: el panel tiene scroll propio y al bajar
      // por el teclado en pantalla tiene que arrastrarlo
      if (focus) el.focus()
    },
    [ref, rows],
  )

  useEffect(() => {
    if (!active) return
    touched.current = false
    pos.current = { row: 0, col: 0 }
    paint(false)
  }, [active, paint])

  useGamepadAction((action) => {
    const grid = rows()
    if (!grid.length) return
    const p = pos.current
    if (action === 'up') p.row -= 1
    else if (action === 'down') p.row += 1
    else if (action === 'left') p.col -= 1
    else if (action === 'right') p.col += 1
    else if (action === 'confirm') {
      const el = grid[Math.max(0, Math.min(grid.length - 1, p.row))]?.[p.col]
      if (el) el.click()
      return
    } else return

    // las filas se recorren en vertical con memoria de columna, pero cada fila
    // tiene su propio ancho (el teclado son 7 teclas y la fila de botones 2),
    // asi que la columna se recorta al entrar
    p.row = Math.max(0, Math.min(grid.length - 1, p.row))
    p.col = Math.max(0, Math.min(grid[p.row].length - 1, p.col))
    touched.current = true
    paint(true)
  }, active)

  // El contenido del panel cambia sin desmontarlo (al guardar el nombre
  // desaparece el teclado y aparece el TOP 10). Repintar tras cada render
  // mantiene el cursor dentro de la rejilla nueva, y recupera el foco si el
  // elemento que lo tenia acaba de desaparecer. Solo se refoca si el usuario ya
  // venia navegando con el mando, para no quitarle el campo de nombre a quien
  // escribe con el teclado.
  useEffect(() => {
    if (active) paint(touched.current)
  })
}
