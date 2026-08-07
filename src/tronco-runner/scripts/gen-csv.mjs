// Vuelca el banco de palabras del juego (src/words.js) a un CSV plano, ya
// normalizado y sin duplicados, para poder reusarlo en otras dinamicas.
//
//   node scripts/gen-csv.mjs
//
// Sale en dinamicas/tronco-runner/Palabras del juego.csv. Correr DESPUES de
// gen-words.mjs, que es quien lee el glosario original de RRHH.
import { writeFileSync } from 'node:fs'
import { ZONE_WORDS } from '../src/words.js'

const HERE = new URL('.', import.meta.url).pathname
const OUT = `${HERE}../../../dinamicas/tronco-runner/Palabras del juego.csv`

// Mismo orden que ZONE_WORDS. El tema va aqui y no en words.js porque alli las
// listas se identifican por su posicion.
const ZONES = [
  {
    terminal: 'Usos Multiples',
    themes: ['Operaciones', 'SIGA', 'Procesos de RRHH', 'Relaciones Laborales'],
    badTheme: 'Riesgo operativo',
  },
  { terminal: 'Contenedores', themes: ['Ciberseguridad', 'Tecnologia'], badTheme: 'Riesgo ciber' },
  {
    terminal: 'Intermodal',
    themes: ['Sostenibilidad', 'Desarrollo de nuevos productos'],
    badTheme: 'Riesgo ambiental',
  },
  {
    terminal: 'Cruceros',
    themes: ['Nomenclatura naval', 'Programas de Bienestar', 'Entorno laboral'],
    badTheme: 'Riesgo personal',
  },
  {
    terminal: 'Astillero',
    themes: ['Filosofia HP', 'Seguridad en las operaciones', 'Brigadas'],
    badTheme: 'Riesgo de seguridad',
  },
]

// Version sin acentos ni eñe: la piden los juegos que comparan tecla a tecla
// (ahorcado, sopa de letras, mecanografia).
const plain = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Ñ/g, 'N')

const rows = []
ZONE_WORDS.forEach((zone, zi) => {
  const z = ZONES[zi]
  zone.good.forEach((tier, ti) => {
    for (const w of tier) {
      rows.push({
        palabra: w,
        tema: z.themes[ti],
        terminal: z.terminal,
        tipo: 'Valor',
        reparto: ti === 0 ? 'Principal' : 'Apoyo',
      })
    }
  })
  for (const w of zone.bad) {
    rows.push({ palabra: w, tema: z.badTheme, terminal: z.terminal, tipo: 'Riesgo', reparto: 'Principal' })
  }
})

const head = '#,Palabra,Sin acentos,Letras,Tema,Terminal,Tipo,Reparto'
const lines = rows.map((r, i) =>
  [i + 1, r.palabra, plain(r.palabra), r.palabra.length, r.tema, r.terminal, r.tipo, r.reparto].join(',')
)

writeFileSync(OUT, [head, ...lines].join('\n') + '\n')

const byLen = {}
for (const r of rows) byLen[r.palabra.length] = (byLen[r.palabra.length] || 0) + 1
console.log(`${rows.length} palabras (${rows.filter((r) => r.tipo === 'Valor').length} valores, ${rows.filter((r) => r.tipo === 'Riesgo').length} riesgos)`)
console.log('largo:', Object.keys(byLen).sort((a, b) => a - b).map((k) => `${k}=${byLen[k]}`).join(' '))
console.log('escrito', OUT)
