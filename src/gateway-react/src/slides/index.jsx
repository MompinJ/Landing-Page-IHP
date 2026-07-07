import S01Cover from './S01Cover.jsx'
import S02Reto from './S02Reto.jsx'
import S02bComunicacion from './S02bComunicacion.jsx'
import S02cMatriz from './S02cMatriz.jsx'
import S02dIshikawa from './S02dIshikawa.jsx'
import S02eObjetivos from './S02eObjetivos.jsx'
import S03Solucion from './S03Solucion.jsx'
import S04Plataforma from './S04Plataforma.jsx'
import S05Comunidad from './S05Comunidad.jsx'
import S06Campus from './S06Campus.jsx'
import S07Reportes from './S07Reportes.jsx'
import S07bCronograma from './S07bCronograma.jsx'
import S07cBeneficios from './S07cBeneficios.jsx'
import S08Demo from './S08Demo.jsx'
import S09Gracias from './S09Gracias.jsx'

// `transition` = transicion al AVANZAR desde esta slide (se reusa al retroceder
// hacia ella). Ids: 'split' (cortina HP), 'wipe' (barrido), 'fade' (fundido).
// `portalExit` = transicion especial Gateway (solo hacia adelante).
export const slides = [
  { id: 's01', title: 'Portada',        component: S01Cover,    transition: 'split' },
  { id: 's02', title: 'El reto',        component: S02Reto,     transition: 'wipe' },
  { id: 's02b', title: 'Caos actual',   component: S02bComunicacion, transition: 'fade' }, // 2b -> 2c: fundido entre slides de analisis
  { id: 's02c', title: 'Matriz 4W+2H',  component: S02cMatriz,       transition: 'wipe' },  // 2c -> 2d: barrido
  { id: 's02d', title: 'Ishikawa 6M',   component: S02dIshikawa,     transition: 'fade' },  // 2d -> 2e: fundido
  { id: 's02e', title: 'Objetivos SMART', component: S02eObjetivos,  transition: 'split' },
  { id: 's03', title: 'La solución',    component: S03Solucion,
    portalExit: true,             // 3 -> 4: transicion portal (zoom al isotipo)
    transition: 'fade',           // 4 -> 3 (retroceso): fundido
    // fase 1 centra el icono (pdx/pdy); fase 2 zoom. La flecha sube aparte (.gw-arrow)
    portalOrigin: '1640px 600px', portalDx: '-680px', portalDy: '180px' },
  { id: 's04', title: 'La plataforma',  component: S04Plataforma, transition: 'fade' }, // 4 -> 5: fundido suave
  { id: 's05', title: 'Comunidad HP',   component: S05Comunidad,  transition: 'split' },
  { id: 's06', title: 'Campus HP',      component: S06Campus,     transition: 'wipe',  transitionColor: '#54BBAB' }, // barrido verde 6->7
  { id: 's07', title: 'Reportes HP',    component: S07Reportes,   transition: 'fade' },
  { id: 's07b', title: 'Cronograma',    component: S07bCronograma, transition: 'fade' },  // 7b -> 7c: fundido
  { id: 's07c', title: 'Beneficios',    component: S07cBeneficios, transition: 'split' },
  // Video final: corre solo y al terminar pasa automaticamente a gracias
  { id: 's08', title: 'Video demo',     component: S08Demo,       transition: 'split' },
  { id: 's09', title: 'Gracias',        component: S09Gracias,    transition: 'fade' },
]
