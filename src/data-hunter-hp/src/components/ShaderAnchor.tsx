import { useFrame, useThree } from '@react-three/fiber';
import { useReducer, useRef } from 'react';
import * as THREE from 'three';
import { registraSonda } from '../debug/debug';
import { useGameStore } from '../store/useGameStore';

/**
 * ANCLA DE SHADERS — lo que le faltaba al precalentado para que no volviera el
 * tirón.
 *
 * EL DIAGNÓSTICO, que costó llegar. `<Warmup>` compila todos los shaders en el
 * briefing y funciona: al empezar la partida no queda ninguno por compilar. Y
 * aun así seguían saliendo frames de 40-60 ms en mitad del juego, y el contador
 * de programas de WebGL subía en uno justo en ese frame. ¿Compilando qué, si ya
 * estaban todos compilados?
 *
 * RE-compilando. three lleva la cuenta de cuántos materiales usan cada programa
 * y, cuando el último se descarta, BORRA el programa. React descarta el material
 * de cualquier componente que se desmonta, y aquí se desmontan filas
 * continuamente según pasa el mapa: medido, 298 materiales descartados en un
 * solo recorrido. Casi siempre da igual —queda otro material vivo de la misma
 * clase—, pero en la frontera de una terminal se va el último de los suyos, el
 * programa se borra, y al aparecer el siguiente barco hay que compilar y enlazar
 * otra vez. En medio de la partida. Los tirones caían en las filas 26, 34 y 37:
 * la zona de CRUCEROS, que es exactamente donde se notaba jugando.
 *
 * LA CURA es que ningún programa llegue nunca a cero usuarios. No hace falta
 * tocar los 55 materiales declarados en línea que hay repartidos por siete
 * ficheros —un refactor grande y con mucho que romper— porque esos 298
 * materiales solo se reparten **12 programas distintos**: el programa no
 * depende del color ni del brillo (esos son uniformes, se cambian sin
 * recompilar) sino de la FORMA del shader — si lleva luz, si lleva textura, si
 * lleva color por vértice.
 *
 * Así que se guarda un material de cada programa, colgado de un grupo invisible
 * que no se desmonta nunca. Doce mallas que no se dibujan, y a cambio ningún
 * programa se borra jamás. Es barato justo porque se ancla por PROGRAMA y no
 * por material.
 *
 * Y por qué no basta con guardar una referencia al material que ya está en la
 * escena: la cuenta de three no se lleva por referencias de JavaScript sino por
 * llamadas a `dispose()`, y a ese material se lo va a desmontar React igual. Hay
 * que tener un material PROPIO, clonado, que no cuelgue de ningún componente que
 * se desmonte.
 */

/** Un material por cada programa distinto. Vive en el módulo: sobrevive a que
 *  se rehaga el mapa entre partidas, igual que la caché de geometría. */
const ancladas: THREE.Material[] = [];
const clavesAncladas = new Set<string>();

/** Cuántos programas hay anclados (lo leen los scripts de medición) */
export function shaderAnchorSize(): number {
  return ancladas.length;
}
registraSonda('shaderAnchorSize', shaderAnchorSize);

/**
 * Geometría mínima de soporte. Un material no adquiere su programa por existir:
 * lo adquiere cuando three lo prepara para dibujar una malla, así que cada
 * anclado necesita una. Lleva `color` además de posición y normal porque los
 * materiales fusionados van con color por vértice, y sin ese atributo el
 * programa que se compilaría no sería el mismo.
 */
const GEO_ANCLA = (() => {
  const g = new THREE.BoxGeometry(0.001, 0.001, 0.001);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
})();

/** La clave del programa que three ha compilado para este material, si ya lo
 *  tiene. Es lo que agrupa los 298 materiales en 12 clases. */
function claveDePrograma(gl: THREE.WebGLRenderer, material: THREE.Material): string | null {
  const props = (gl.properties as unknown as { get(m: THREE.Material): { currentProgram?: { cacheKey?: string } } }).get(
    material,
  );
  return props?.currentProgram?.cacheKey ?? null;
}

export function ShaderAnchor() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const phase = useGameStore((s) => s.phase);
  const [, redibuja] = useReducer((n: number) => n + 1, 0);
  /** Hay anclados nuevos que todavía no han adquirido su programa */
  const porCompilar = useRef(false);

  useFrame(() => {
    // Se recolecta en el menú y el briefing, que es cuando `<Warmup>` está
    // haciendo desfilar filas de las cinco terminales por la escena — o sea
    // cuando pasan por delante todas las clases de material que existen. En
    // partida el hilo es del juego y aquí no se toca nada.
    if (phase !== 'menu' && phase !== 'briefing') return;

    if (porCompilar.current) {
      porCompilar.current = false;
      // Los anclados nuevos adquieren aquí su programa. A partir de este punto
      // la cuenta de usuarios de ese programa ya no puede bajar a cero.
      gl.compile(scene, camera);
      return;
    }

    let nuevos = 0;
    scene.traverse((o) => {
      const conMaterial = o as THREE.Mesh;
      if (!conMaterial.material) return;
      const materiales = Array.isArray(conMaterial.material) ? conMaterial.material : [conMaterial.material];
      for (const m of materiales) {
        const clave = claveDePrograma(gl, m);
        // Sin clave = three todavía no lo ha compilado; ya se recogerá. Y los
        // propios anclados vuelven a salir en este recorrido, pero su clave ya
        // está en el conjunto, así que no se duplican.
        if (!clave || clavesAncladas.has(clave)) continue;
        clavesAncladas.add(clave);
        ancladas.push(m.clone());
        nuevos++;
      }
    });

    if (nuevos > 0) {
      porCompilar.current = true;
      redibuja(); // que el grupo de abajo monte las mallas nuevas
    }
  });

  return (
    // `visible={false}`: no se dibuja ni un píxel, solo mantiene vivos los
    // programas. `dispose={null}`: este grupo no se desmonta nunca, pero si
    // algún día se desmontara NO debe descartar los materiales — es justo lo
    // contrario de lo que viene a hacer.
    <group visible={false} dispose={null}>
      {ancladas.map((material, i) =>
        (material as THREE.PointsMaterial).isPointsMaterial ? (
          // Las partículas del VFX compilan un shader distinto del de una malla,
          // así que su ancla tiene que ser `points` o se anclaría otro programa.
          <points key={i} geometry={GEO_ANCLA} material={material} dispose={null} />
        ) : (
          <mesh key={i} geometry={GEO_ANCLA} material={material} dispose={null} />
        ),
      )}
    </group>
  );
}
