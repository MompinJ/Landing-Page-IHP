import S01Cover from './S01Cover.jsx'
import S02Contexto from './S02Contexto.jsx'
import S02Reto from './S02Reto.jsx'
import S02bComunicacion from './S02bComunicacion.jsx'
import S02cMatriz from './S02cMatriz.jsx'
import S02dIshikawa from './S02dIshikawa.jsx'
import S02eObjetivos from './S02eObjetivos.jsx'
import S02fAlternativas from './S02fAlternativas.jsx'
import S03Solucion from './S03Solucion.jsx'
import S05Landing from './S05Landing.jsx'
import S05bMuro from './S05bMuro.jsx'
import S05cNoticias from './S05cNoticias.jsx'
import S05dEventos from './S05dEventos.jsx'
import S05eFormularios from './S05eFormularios.jsx'
import S05fDinamicas from './S05fDinamicas.jsx'
import S05gSoporte from './S05gSoporte.jsx'
import S05hInstituto from './S05hInstituto.jsx'
import S05iCampus from './S05iCampus.jsx'
import S05jModulos from './S05jModulos.jsx'
import S05lRepositorios from './S05lRepositorios.jsx'
import S05mReportes from './S05mReportes.jsx'
import S05nMejoraContinua from './S05nMejoraContinua.jsx'
import S07cBeneficios from './S07cBeneficios.jsx'
import S07dCumplimiento from './S07dCumplimiento.jsx'
import S07eCierre from './S07eCierre.jsx'
import S09Gracias from './S09Gracias.jsx'

// Espejo Navy de src/slides/index.jsx: mismo orden, ids y transiciones.
// `transition` = transicion al AVANZAR desde esta slide (se reusa al retroceder
// hacia ella). Ids: 'split' (cortina HP), 'wipe' (barrido), 'fade' (fundido).
// `portalExit` = transicion especial Gateway (solo hacia adelante).
export const slides = [
  { id: 's01', title: 'Portada',        component: S01Cover,    transition: 'split' },
  { id: 's02', title: 'Contexto',       component: S02Contexto, transition: 'fade' },  // 2 -> 2a: fundido
  { id: 's02a', title: 'El reto',       component: S02Reto,     transition: 'wipe' },
  { id: 's02b', title: 'Caos actual',   component: S02bComunicacion, transition: 'fade' }, // 2b -> 2c: fundido entre slides de analisis
  { id: 's02c', title: 'Matriz 4W+2H',  component: S02cMatriz,       transition: 'wipe' },  // 2c -> 2d: barrido
  { id: 's02d', title: 'Ishikawa 6M',   component: S02dIshikawa,     transition: 'fade' },  // 2d -> 2e: fundido
  { id: 's02e', title: 'Objetivos SMART', component: S02eObjetivos,  transition: 'fade' },  // 2e -> 2f: fundido
  { id: 's02f', title: 'Alternativas',  component: S02fAlternativas, transition: 'split' },
  { id: 's03', title: 'La solución',    component: S03Solucion,
    portalExit: true,             // 3 -> 5: transicion portal (zoom al isotipo)
    transition: 'fade',           // 5 -> 3 (retroceso): fundido
    // fase 1 centra el icono (pdx/pdy); fase 2 zoom. La flecha sube aparte (.gw-arrow)
    portalOrigin: '1640px 600px', portalDx: '-680px', portalDy: '180px' },
  // Recorrido modulo por modulo: Gateway -> Comunidad HP -> Campus HP -> Reportes HP -> Mejora continua.
  // Cada video autoreproduce (muted+loop) al entrar a su slide (ver FeatureSlide.jsx).
  { id: 's05', title: 'Gateway',        component: S05Landing,    transition: 'split' }, // 5 -> 5b: entra Comunidad HP
  { id: 's05b', title: 'Comunidad · El muro',      component: S05bMuro,       transition: 'fade' },
  { id: 's05c', title: 'Comunidad · Noticias',     component: S05cNoticias,   transition: 'fade' },
  { id: 's05d', title: 'Comunidad · Eventos',      component: S05dEventos,    transition: 'fade' },
  { id: 's05e', title: 'Comunidad · Formularios',  component: S05eFormularios, transition: 'fade' },
  { id: 's05f', title: 'Comunidad · Dinámicas',    component: S05fDinamicas,  transition: 'fade' },
  { id: 's05g', title: 'Comunidad · Soporte',      component: S05gSoporte,    transition: 'split' }, // g -> h: entra Campus HP
  { id: 's05h', title: 'Campus · Instituto',       component: S05hInstituto,  transition: 'fade' },
  { id: 's05i', title: 'Campus · Campus',          component: S05iCampus,     transition: 'fade' },
  { id: 's05j', title: 'Campus · Módulos',         component: S05jModulos,    transition: 'fade' },
  { id: 's05l', title: 'Campus · Repositorios',    component: S05lRepositorios, transition: 'split' }, // l -> m: entra Reportes HP
  { id: 's05m', title: 'Reportes HP',   component: S05mReportes,  transition: 'split' }, // m -> n: entra Mejora continua
  { id: 's05n', title: 'Mejora continua', component: S05nMejoraContinua, transition: 'fade' },
  { id: 's07c', title: 'Beneficios',    component: S07cBeneficios, transition: 'fade' },  // 7c -> 7d: fundido
  { id: 's07d', title: 'Cumplimiento',  component: S07dCumplimiento, transition: 'fade' }, // 7d -> 7e: fundido
  { id: 's07e', title: 'Cierre',        component: S07eCierre,    transition: 'split' },  // 7e -> 9: cortina de cierre
  { id: 's09', title: 'Gracias',        component: S09Gracias,    transition: 'fade' },
]
