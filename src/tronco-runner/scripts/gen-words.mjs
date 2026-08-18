import { readFileSync, writeFileSync } from 'node:fs'

// El glosario vive junto al juego desplegado, que es donde lo deja RRHH.
const HERE = new URL('.', import.meta.url).pathname
const CSV = `${HERE}../../../dinamicas/tronco-runner/Glosario de palabras.csv`

// Acentos y mayusculas que faltan en el CSV. Clave = como sale al pasar a
// mayusculas, valor = como debe leerse en pantalla.
const FIX = {
  ANALISIS: 'ANÁLISIS',
  ARTICULO: 'ARTÍCULO',
  AUDICION: 'AUDICIÓN',
  BUZON: 'BUZÓN',
  CAMION: 'CAMIÓN',
  CONDICION: 'CONDICIÓN',
  DESAFIO: 'DESAFÍO',
  DESVIO: 'DESVÍO',
  DIESEL: 'DIÉSEL',
  DIMENSION: 'DIMENSIÓN',
  DINAMICA: 'DINÁMICA',
  EMISION: 'EMISIÓN',
  EMPATIA: 'EMPATÍA',
  ENERGIA: 'ENERGÍA',
  EOLICA: 'EÓLICA',
  ERGONOMIA: 'ERGONOMÍA',
  ESTANDAR: 'ESTÁNDAR',
  FERREO: 'FÉRREO',
  FISICO: 'FÍSICO',
  FOSIL: 'FÓSIL',
  GRAFICO: 'GRÁFICO',
  HABITO: 'HÁBITO',
  HIBRIDO: 'HÍBRIDO',
  INSPECCION: 'INSPECCIÓN',
  LIDER: 'LÍDER',
  LIMITE: 'LÍMITE',
  MARITIMO: 'MARÍTIMO',
  MERCANCIA: 'MERCANCÍA',
  MINIMO: 'MÍNIMO',
  NOMINA: 'NÓMINA',
  OPTIMO: 'ÓPTIMO',
  ORGANO: 'ÓRGANO',
  PATRON: 'PATRÓN',
  PEATON: 'PEATÓN',
  POLITICA: 'POLÍTICA',
  PORTICO: 'PÓRTICO',
  PRESTACION: 'PRESTACIÓN',
  QUIMICO: 'QUÍMICO',
  RECEPCION: 'RECEPCIÓN',
  TECNICO: 'TÉCNICO',
  UNICA: 'ÚNICA',
  VACACION: 'VACACIÓN',
  VAGON: 'VAGÓN',
}

// Palabras del glosario que en el juego son ficha ROJA: lo que hay que esquivar.
// Se listan por tema para que cada zona suelte los riesgos que le tocan.
const BAD = new Set([
  'AMENAZA', 'ATAQUE', 'FRAUDE', 'MALWARE', 'RANSOM', 'DELITO', 'ERROR', 'OCULTO',
  'DAÑOS', 'DERRAME', 'GRAVE', 'PELIGRO', 'RIESGO', 'TÓXICO',
  'INCENDIO', 'FUEGO', 'DESASTRE', 'INMINENTE', 'QUÍMICO',
  'ANSIEDAD', 'ESTRÉS', 'ENFERMEDAD', 'AUSENCIA',
  'CONFLICTO', 'SANCIÓN',
  'DEFECTO', 'FALLAS', 'DESALOJO', 'DESVÍO',
  'FÓSIL', 'EMISIÓN', 'DIÉSEL', 'RUIDO',
])

// Reparto tema -> zona. El primer tema es el principal: se baraja y se agota
// antes de tocar los de apoyo, asi que la zona siempre arranca con lo suyo.
const ZONES = [
  { key: 'tum', themes: ['Operaciones', 'SIGA', 'Procesos de RRHH', 'Relaciones Laborales'] },
  { key: 'tec', themes: ['Ciberseguridad', 'Tecnología'] },
  { key: 'intermodal', themes: ['Sostenibilidad', 'Desarrollo de nuevos productos'] },
  { key: 'crucero', themes: ['Nomenclatura naval', 'Programas de Bienestar', 'Entorno laboral'] },
  { key: 'astillero', themes: ['Filosofía HP', 'Seguridad en las operaciones', 'Brigadas'] },
]

// Riesgos por zona. Van a mano porque el CSV concentra casi todo lo negativo en
// ciberseguridad y brigadas, y la TUM necesita once fichas rojas.
const ZONE_BAD = [
  ['DESALOJO', 'DESVÍO', 'DEFECTO', 'DAÑOS', 'DERRAME', 'TÓXICO', 'QUÍMICO', 'FUEGO', 'INMINENTE', 'GRAVE', 'PELIGRO', 'DESASTRE'],
  ['AMENAZA', 'ATAQUE', 'FRAUDE', 'MALWARE', 'RANSOM', 'DELITO', 'ERROR', 'OCULTO', 'FALLAS'],
  ['EMISIÓN', 'FÓSIL', 'DIÉSEL', 'RUIDO'],
  ['ESTRÉS', 'ANSIEDAD', 'ENFERMEDAD', 'AUSENCIA', 'CONFLICTO'],
  ['INCENDIO', 'RIESGO', 'SANCIÓN'],
]

const norm = (s) => {
  const u = s.trim().toUpperCase()
  return FIX[u] || u
}

const rows = readFileSync(CSV, 'utf8').split('\n').slice(4)
const byTheme = new Map()
const seen = new Set()
const dups = []

for (const line of rows) {
  const cols = line.split(',')
  if (cols.length < 3 || !cols[1].trim()) continue
  const word = norm(cols[1])
  const theme = cols[2].trim()
  if (!theme) continue
  if (seen.has(word)) {
    dups.push(`${word} (${theme})`)
    continue
  }
  seen.add(word)
  if (!byTheme.has(theme)) byTheme.set(theme, [])
  byTheme.get(theme).push(word)
}

console.log('duplicados descartados:', dups.join(', '))
console.log('temas:', [...byTheme.keys()].map((t) => `${t}=${byTheme.get(t).length}`).join(' | '))

const badSeen = new Set(ZONE_BAD.flat())
for (const w of BAD) if (!badSeen.has(w)) console.log('AVISO: riesgo sin zona ->', w)
for (const w of badSeen) if (!seen.has(w)) console.log('AVISO: riesgo que no esta en el CSV ->', w)

const out = []
out.push(`// GENERADO desde "Glosario de palabras.csv" (dinamicas/tronco-runner).`)
out.push(`// No editar a mano: cambia el CSV y vuelve a correr el generador.`)
out.push(`//`)
out.push(`// Cada zona del curso suelta el vocabulario de su tema. Los temas van en`)
out.push(`// orden: el primero es el principal y se agota antes de tocar los de apoyo,`)
out.push(`// asi que la zona siempre arranca con lo suyo. Las bolsas son mas grandes`)
out.push(`// que las fichas de la zona, o sea que en una carrera no se repite ninguna.`)
out.push('')
out.push('export const ZONE_WORDS = [')
for (let i = 0; i < ZONES.length; i++) {
  const z = ZONES[i]
  const tiers = z.themes.map((t) => (byTheme.get(t) || []).filter((w) => !BAD.has(w)))
  z.themes.forEach((t, k) => {
    if (!byTheme.has(t)) console.log('AVISO: tema inexistente ->', t)
    console.log(`  ${z.key} tier${k} ${t}: ${tiers[k].length}`)
  })
  out.push(`  {`)
  out.push(`    key: '${z.key}',`)
  out.push(`    // ${z.themes.map((t, k) => `${t} (${tiers[k].length})`).join(' -> ')}`)
  out.push(`    good: [`)
  tiers.forEach((tier, k) => {
    out.push(`      // ${z.themes[k]}`)
    out.push(`      [${tier.map((w) => `'${w}'`).join(', ')}],`)
  })
  out.push(`    ],`)
  out.push(`    bad: [${ZONE_BAD[i].map((w) => `'${w}'`).join(', ')}],`)
  out.push(`  },`)
}
out.push(']')
out.push('')

writeFileSync(`${HERE}../src/words.js`, out.join('\n'))
console.log('escrito src/words.js')
