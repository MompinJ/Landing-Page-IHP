import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { BALANCE } from '../data/balance';
import { isShieldItem } from '../data/items';
import { BIOME_SEQUENCE, generateRows, rows, zoneOf, type ZoneTheme } from '../world/rows';
import { startDying } from '../world/death';
import { runtime } from './runtime';

/** Fila de arranque de depuración (?row=N en la URL) — 0 en producción/kiosco */
function debugStartRow(): number {
  if (typeof window === 'undefined') return 0;
  const row = Number(new URLSearchParams(window.location.search).get('row'));
  return Number.isFinite(row) && row > 0 ? Math.floor(row) : 0;
}

/**
 * Fases de la partida. `briefing` es la pantalla de instrucciones, y es una
 * FASE y no un estado interno del menú a propósito: el mando de Xbox arbitra
 * por fase (`useGamepadControls`), así que si el briefing viviera dentro del
 * componente, A lo saltaría sin que nadie lo leyera — que es exactamente lo
 * que pasa en un stand.
 */
export type GamePhase = 'menu' | 'briefing' | 'playing' | 'gameover';

export interface RankingEntry {
  name: string;
  score: number;
  accuracy: number;
  date: string;
  /** Siglas de la última terminal alcanzada — la etiqueta del ranking */
  unit?: string;
}

/** Último evento de gameplay relevante para feedback de HUD/VFX.
 *  `seq` es un contador monotónico: la UI reacciona a cada cambio aunque
 *  el tipo de evento se repita. */
export interface GameEvent {
  seq: number;
  type: 'good' | 'bad' | 'obstacle';
  label?: string;
  /** Puntos otorgados/restados por este evento (ya con multiplicador) */
  points: number;
}

interface GameState {
  phase: GamePhase;
  score: number;
  /** Fila actual del jugador — dispara el re-render de la ventana del mapa */
  currentRow: number;
  /** Fila máxima alcanzada (indicador de progreso) */
  maxRow: number;
  /** Racha actual de conceptos correctos seguidos */
  streak: number;
  /** Multiplicador activo derivado de la racha (x1/x2/x3) */
  multiplier: 1 | 2 | 3;
  /** Vidas restantes (la partida termina al llegar a 0) */
  lives: number;
  /** Escudo activo: absorbe el próximo golpe sin perder vida */
  shield: boolean;
  goodCollected: number;
  badHit: number;
  obstaclesHit: number;
  /** Conceptos únicos encontrados (para pantalla final) */
  foundConcepts: string[];
  /** PASAPORTE: unidades de negocio pisadas en esta partida, en orden.
   *  Es lo que le da meta a una partida que si no sería infinita. */
  visitedUnits: ZoneTheme[];
  /** Se sellaron las cinco terminales */
  passportComplete: boolean;
  /** Último sello, para el aviso en pantalla (seq monotónico como lastEvent) */
  lastStamp: { seq: number; unit: ZoneTheme } | null;
  /** Terminal en la que está el jugador ahora mismo */
  currentUnit: ZoneTheme;
  /**
   * CARTEL DE ENTRADA: la terminal que se acaba de pisar. Se dispara CADA vez
   * que se cruza una frontera de unidad, no solo la primera — el recorrido da
   * vueltas y el jugador tiene que saber siempre dónde está parado.
   * `stage` es el índice absoluto de zona (para la vuelta y el "N de 5") y
   * `fresh` marca si además cayó sello nuevo de pasaporte.
   */
  enteredUnit: { seq: number; unit: ZoneTheme; stage: number; fresh: boolean } | null;
  lastEvent: GameEvent | null;
  ranking: RankingEntry[];

  /** Portada → instrucciones. Las instrucciones NO viven en el menú: son el
   *  paso previo a la partida, se leen cuando de verdad hacen falta. */
  openBriefing: () => void;
  startGame: () => void;
  setCurrentRow: (row: number) => void;
  advanceRow: (row: number) => void;
  enterUnit: (unit: ZoneTheme, stage: number) => void;
  stampUnit: (unit: ZoneTheme) => void;
  collectGood: (label: string) => void;
  hitBad: (label: string) => void;
  /** `label` describe el golpe en el popup (por omisión, «¡Choque!») */
  hitObstacle: (label?: string) => void;

  endGame: () => void;
  backToMenu: () => void;
  /** `unit` son las siglas de la unidad de negocio que elige el jugador */
  submitScore: (name: string, unit?: string) => void;
}

/**
 * Clave del ranking local, VERSIONADA. El `:v2` entra con el reescalado de la
 * puntuación a decenas: las marcas viejas se guardaron en centenas (+100 por
 * concepto, 250 por sello) y rondaban los 20.000 puntos, así que en la tabla
 * nueva serían inalcanzables para siempre y el stand arrancaría con un podio
 * que nadie puede tocar. Cambiar la clave deja la tabla vieja en el disco sin
 * borrar nada y empieza una limpia en la escala nueva.
 */
const RANKING_KEY = 'data-hunter-hp:ranking:v2';

function loadRanking(): RankingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function multiplierFor(streak: number): 1 | 2 | 3 {
  if (streak >= BALANCE.COMBO_X3_AT) return 3;
  if (streak >= BALANCE.COMBO_X2_AT) return 2;
  return 1;
}

/** Precisión = correctos / (correctos + errores). 100% si no hubo interacciones. */
export function accuracyOf(s: Pick<GameState, 'goodCollected' | 'badHit' | 'obstaclesHit'>): number {
  const total = s.goodCollected + s.badHit + s.obstaclesHit;
  return total === 0 ? 100 : Math.round((s.goodCollected / total) * 100);
}

/**
 * Estado REACTIVO del juego (HUD, fases, puntuación).
 *
 * Regla de arquitectura: el bucle de render 3D NUNCA se suscribe a este store
 * con hooks — lee/escribe vía `useGameStore.getState()` (actualización
 * transitoria, cero re-renders de React por frame). Los valores que cambian a
 * 60 fps (posición, velocidad, distancia) viven en `runtime`, no aquí.
 */
export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: 'menu',
    score: 0,
    currentRow: 0,
    maxRow: 0,
    streak: 0,
    multiplier: 1,
    lives: BALANCE.LIVES,
    shield: false,
    goodCollected: 0,
    badHit: 0,
    obstaclesHit: 0,
    foundConcepts: [],
    visitedUnits: [],
    passportComplete: false,
    lastStamp: null,
    currentUnit: BIOME_SEQUENCE[0],
    enteredUnit: null,
    lastEvent: null,
    ranking: loadRanking(),

    openBriefing: () => set({ phase: 'briefing' }),

    startGame: () => {
      runtime.reset();
      const startRow = debugStartRow();
      if (startRow > 0) {
        while (rows.length < startRow + BALANCE.VIEW_AHEAD + 2) generateRows(BALANCE.ROWS_BATCH);
        runtime.row = startRow;
        runtime.maxRow = startRow;
      }
      set({
        phase: 'playing',
        score: 0,
        currentRow: startRow,
        maxRow: startRow,
        streak: 0,
        multiplier: 1,
        lives: BALANCE.LIVES,
        shield: false,
        goodCollected: 0,
        badHit: 0,
        obstaclesHit: 0,
        foundConcepts: [],
        // La terminal donde arranca ya cuenta como visitada, pero sin bonus:
        // el sello se gana al CRUZAR a una nueva, no al aparecer en ella.
        visitedUnits: [zoneOf(startRow)],
        passportComplete: false,
        lastStamp: null,
        currentUnit: zoneOf(startRow),
        // El cartel también saluda a la terminal de arranque: la primera
        // pregunta de cualquier jugador al aparecer es "¿dónde estoy?".
        enteredUnit: {
          seq: 1,
          unit: zoneOf(startRow),
          stage: Math.floor(startRow / BALANCE.ZONE_LENGTH),
          fresh: false,
        },
        lastEvent: null,
      });
    },

    setCurrentRow: (row) => {
      if (row !== get().currentRow) set({ currentRow: row });
    },

    /**
     * Fila nueva alcanzada. Los puntos de progreso caen CADA `SCORE_ROW_EVERY`
     * filas, no en todas: con el marcador en decenas, cobrar cada fila
     * convertía la puntuación en un cuentakilómetros y las tarjetas —que son
     * la decisión del juego— dejaban de pesar en el resultado.
     */
    advanceRow: (row) =>
      set((s) => ({
        maxRow: row,
        score: s.score + (row % BALANCE.SCORE_ROW_EVERY === 0 ? BALANCE.SCORE_ROW : 0),
      })),

    /**
     * ENTRADA A TERMINAL. Idempotente: solo dispara cartel cuando la unidad
     * cambia de verdad, así que se puede llamar en cada paso sin cuidarse.
     */
    enterUnit: (unit, stage) =>
      set((s) => {
        if (s.currentUnit === unit && s.enteredUnit) return {};
        return {
          currentUnit: unit,
          enteredUnit: {
            seq: (s.enteredUnit?.seq ?? 0) + 1,
            unit,
            stage,
            fresh: !s.visitedUnits.includes(unit),
          },
        };
      }),

    /**
     * SELLO DE PASAPORTE al pisar por primera vez una unidad de negocio. Al
     * completar las cinco cae el premio gordo: es el "has recorrido el grupo
     * entero" que antes no existía en ninguna parte del juego.
     */
    stampUnit: (unit) =>
      set((s) => {
        if (s.visitedUnits.includes(unit)) return {};
        const visitedUnits = [...s.visitedUnits, unit];
        const complete = visitedUnits.length >= BIOME_SEQUENCE.length;
        return {
          visitedUnits,
          passportComplete: s.passportComplete || complete,
          lastStamp: { seq: (s.lastStamp?.seq ?? 0) + 1, unit },
          score:
            s.score +
            BALANCE.SCORE_STAMP +
            (complete && !s.passportComplete ? BALANCE.SCORE_PASSPORT_COMPLETE : 0),
        };
      }),

    collectGood: (label) =>
      set((s) => {
        const streak = s.streak + 1;
        const multiplier = multiplierFor(streak);
        const points = BALANCE.SCORE_GOOD * multiplier;
        // VIDA EXTRA cada 15 conceptos seguidos (máx. 3 corazones)
        const lives =
          streak > 0 && streak % BALANCE.EXTRA_LIFE_STREAK === 0
            ? Math.min(BALANCE.LIVES, s.lives + 1)
            : s.lives;
        // ESCUDO: los conceptos de proteccion activan un escudo de 1 golpe
        const shield = s.shield || isShieldItem(label);
        return {
          streak,
          multiplier,
          lives,
          shield,
          score: s.score + points,
          goodCollected: s.goodCollected + 1,
          foundConcepts: s.foundConcepts.includes(label)
            ? s.foundConcepts
            : [...s.foundConcepts, label],
          lastEvent: { seq: (s.lastEvent?.seq ?? 0) + 1, type: 'good', label, points },
        };
      }),

    hitBad: (label) =>
      set((s) => ({
        streak: 0,
        multiplier: 1,
        score: s.score + BALANCE.SCORE_BAD,
        badHit: s.badHit + 1,
        lastEvent: { seq: (s.lastEvent?.seq ?? 0) + 1, type: 'bad', label, points: BALANCE.SCORE_BAD },
      })),

    // El aturdimiento/knockback/invulnerabilidad los aplica traffic.ts.
    // Cada golpe físico (vehículo/grúa/caída al agua) cuesta UNA VIDA.
    hitObstacle: (label) => {
      // El escudo absorbe el golpe (sin perder vida)
      if (get().shield) {
        set((s) => ({
          shield: false,
          streak: 0,
          multiplier: 1,
          lastEvent: { seq: (s.lastEvent?.seq ?? 0) + 1, type: 'obstacle', label, points: 0 },
        }));
        return;
      }
      // CHOCAR CUESTA UNA VIDA, NO PUNTOS (SCORE_OBSTACLE = 0). El corazón que
      // se apaga ya es el castigo, y es el que el jugador mira.
      const remaining = get().lives - 1;
      set((s) => ({
        lives: remaining,
        streak: 0,
        multiplier: 1,
        score: s.score + BALANCE.SCORE_OBSTACLE,
        obstaclesHit: s.obstaclesHit + 1,
        lastEvent: {
          seq: (s.lastEvent?.seq ?? 0) + 1,
          type: 'obstacle',
          label,
          points: BALANCE.SCORE_OBSTACLE,
        },
      }));
      // ÚLTIMA VIDA: no se corta a la pantalla final en este mismo frame — se
      // arranca el remate y es `GameLoop` quien llama a `endGame` cuando
      // termina. Sin esa pausa el jugador nunca llegaba a ver qué lo mató: el
      // camión seguía su camino y encima aparecía la tarjeta de resultados.
      if (remaining <= 0) startDying();
    },

    endGame: () => set({ phase: 'gameover' }),

    backToMenu: () => set({ phase: 'menu' }),

    /**
     * Guarda el score en el ranking local. Estructura lista para sustituir
     * por un POST a una API REST de high-scores (mismo shape RankingEntry).
     */
    submitScore: (name, unit) => {
      const s = get();
      const entry: RankingEntry = {
        name: name.trim() || 'ANON',
        score: s.score,
        accuracy: accuracyOf(s),
        date: new Date().toISOString(),
        unit: unit?.trim() || undefined,
      };
      const ranking = [...s.ranking, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      try {
        localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
      } catch {
        /* almacenamiento no disponible (modo kiosco) — ranking solo en memoria */
      }
      set({ ranking });
    },
  })),
);
