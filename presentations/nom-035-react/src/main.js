// Punto de entrada: monta el deck (datos) en #root.
import { html } from './html.js';
import { Deck } from './Deck.js';
import { DECK } from './deck-data.js';

const root = window.ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${Deck} deck=${DECK} />`);
