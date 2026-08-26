#!/usr/bin/env bash
#
# Regenera los dos QR de la pantalla del marcador.
#
#   ./qr.sh https://mi-dominio.vercel.app
#
# Los QR se generan A MANO y quedan como ficheros SVG en el repo en vez de
# pintarse en el navegador con una libreria. Dos razones, y las dos son del
# stand: no hace falta cargar codigo de terceros en una pantalla que tiene que
# arrancar sola, y sobre todo el QR sigue estando aunque el wifi no.
#
# SVG y no PNG porque la pantalla puede ser un monitor o un televisor: un
# vectorial se lee igual de lejos en los dos sin pesar mas.
#
# Nivel de correccion H (el mas alto): el codigo aguanta que se vea de reojo,
# con reflejos o desde un angulo, que es como se escanea de verdad en un pasillo
# de congreso.

set -euo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "Uso: ./qr.sh https://dominio-desplegado" >&2
  exit 1
fi
BASE="${BASE%/}"   # sin barra final, para no acabar con // en la URL

cd "$(dirname "$0")"

gen() {
  local destino="$1" ruta="$2"
  qrencode -t SVG -l H -m 0 -s 8 -o "$destino" "${BASE}${ruta}"
  echo "  $destino  ->  ${BASE}${ruta}"
}

echo "Generando QR para $BASE"
gen qr-port-quest.svg     "/dinamicas/data-hunter-hp/index.html"
gen qr-terminal-rally.svg "/dinamicas/tronco-runner/index.html"
echo "Listo."
