// ============================================================
// CONTRATO de navegacion entre el Deck (flujo lineal) y las
// slides interactivas (dinamicas con su propio flujo interno).
//
// El Deck provee `claim(fn)`: una dinamica registra su handler y
// recibe una funcion para liberarlo al desmontarse.
//
// El handler recibe (dir, source):
//   dir    = +1 (adelante) | -1 (atras)
//   source = 'key' | 'wheel' | 'touch'
// y devuelve:
//   'consumed' -> la dinamica lo manejo; el deck NO se mueve.
//   'pass'     -> el deck navega normal a la slide vecina.
// ============================================================
import { createContext } from './html.js';

export const NavContext = createContext(null);
