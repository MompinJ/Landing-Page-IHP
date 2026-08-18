/**
 * Servicio de puntuaciones para el LIVE LEADERBOARD del stand.
 * Contrato (REST y WS comparten shape):
 *   POST {VITE_SCORE_API}/scores   body: ScorePayload
 *   WS   {VITE_SCORE_API}/live     evento 'score' -> ScorePayload
 * La 2a pantalla consume GET /scores/top10 y rota el Top 10 en vivo.
 */
export interface ScorePayload {
  name: string;
  score: number;
  accuracy: number;
  maxRow: number;
  concepts: string[];
  /** Terminales del mapa recorridas (sellos del pasaporte), en orden */
  units: string[];
  /** Siglas de la unidad de negocio a la que pertenece el jugador */
  unit?: string;
  date: string;
  event: 'congreso-hutchison-ports';
}

const API = import.meta.env.VITE_SCORE_API as string | undefined;

/** Envio asincrono tolerante a fallos (el kiosco nunca se bloquea) */
export function postScore(payload: ScorePayload): void {
  if (!API) return; // sin backend: ranking local solamente
  void fetch(`${API}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
