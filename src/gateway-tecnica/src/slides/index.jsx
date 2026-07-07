import S01Cover from './S01Cover.jsx'
import S02Reto from './S02Reto.jsx'
import S03Solucion from './S03Solucion.jsx'
import S04Plataforma from './S04Plataforma.jsx'
import S05Comunidad from './S05Comunidad.jsx'
import S06Campus from './S06Campus.jsx'
import S07Reportes from './S07Reportes.jsx'
import S08Estado from './S08Estado.jsx'
import S11Stack from './S11Stack.jsx'
import S12Seguridad from './S12Seguridad.jsx'
import S13Sesiones from './S13Sesiones.jsx'
import S14Auditoria from './S14Auditoria.jsx'
import S15Azure from './S15Azure.jsx'

// `transition` = transicion al AVANZAR desde esta slide (se reusa al retroceder
// hacia ella). Ids: 'split' (cortina HP), 'wipe' (barrido), 'fade' (fundido).
// `portalExit` = transicion especial Gateway (solo hacia adelante).
export const slides = [
  { id: 's01', title: 'Portada',        component: S01Cover,    transition: 'split' },
  { id: 's02', title: 'El reto',        component: S02Reto,     transition: 'wipe' },
  { id: 's03', title: 'La solución',    component: S03Solucion,
    portalExit: true,             // 3 -> 4: transicion portal (zoom al isotipo)
    transition: 'fade',           // 4 -> 3 (retroceso): fundido
    // fase 1 centra el icono (pdx/pdy); fase 2 zoom. La flecha sube aparte (.gw-arrow)
    portalOrigin: '1640px 600px', portalDx: '-680px', portalDy: '180px' },
  { id: 's04', title: 'La plataforma',  component: S04Plataforma, transition: 'fade' }, // 4 -> 5: fundido suave
  { id: 's05', title: 'Comunidad HP',   component: S05Comunidad,  transition: 'split' },
  { id: 's06', title: 'Campus HP',      component: S06Campus,     transition: 'wipe',  transitionColor: '#54BBAB' }, // barrido verde 6->7
  { id: 's07', title: 'Reportes HP',    component: S07Reportes,   transition: 'fade' },
  { id: 's08', title: 'Dónde estamos',  component: S08Estado,     transition: 'split' },

  // --- Capitulo tecnico (para el area de TI) ---
  // Transiciones alternadas: fundido -> barrido -> cortina HP, en ciclo.
  { id: 's11', title: 'Tecnologías',       component: S11Stack,        transition: 'fade' },
  { id: 's12', title: 'Seguridad',         component: S12Seguridad,    transition: 'wipe' },
  { id: 's13', title: 'Sesiones',          component: S13Sesiones,     transition: 'split' },
  { id: 's14', title: 'Auditoría',         component: S14Auditoria,    transition: 'fade' },
  { id: 's15', title: 'Recursos Azure',    component: S15Azure,        transition: 'wipe' },
]
