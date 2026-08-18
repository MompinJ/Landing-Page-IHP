#!/usr/bin/env bash
# Compila la pagina y la deja lista en las dos carpetas desplegadas.
# Este repo va estatico y sin build step, asi que hay que hacerlo a mano.
#
# Son dos enlaces con el mismo codigo:
#   para-ti-v7qybjrdrcit  -> la buena, con los recuerdos legibles
#   para-ti-8xqyvcsdgesw  -> el espejo, con los recuerdos tachados
set -euo pipefail

FUENTE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$FUENTE/../.."
NORMAL="$RAIZ/para-ti-v7qybjrdrcit"
CENSURADA="$RAIZ/para-ti-8xqyvcsdgesw"

cd "$FUENTE"
npm run build

# Cada carpeta lleva su copia completa: son enlaces independientes.
# Se borran primero para no dejar bundles viejos con hash distinto.
for destino in "$NORMAL" "$CENSURADA"; do
  rm -rf "$destino"
  mkdir -p "$destino"
  cp -r dist/assets dist/fotos "$destino/"
done

# La unica diferencia: que html se sirve como index de cada carpeta
cp dist/index.html "$NORMAL/index.html"
cp dist/censurado.html "$CENSURADA/index.html"

echo
echo "Publicado:"
for destino in "$NORMAL" "$CENSURADA"; do
  echo "  $(basename "$destino")  ->  $(find "$destino" -type f | wc -l) archivos"
done
