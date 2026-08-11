#!/usr/bin/env bash
# Compila la pagina y la deja lista en la carpeta desplegada.
# Este repo va estatico y sin build step, asi que hay que hacerlo a mano.
set -euo pipefail

FUENTE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTINO="$FUENTE/../../para-ti-v7qybjrdrcit"

cd "$FUENTE"
npm run build

# Se borra primero para no dejar bundles viejos con hash distinto
rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -r dist/. "$DESTINO/"

echo
echo "Listo. Archivos publicados:"
find "$DESTINO" -type f | sed "s|$DESTINO|para-ti-v7qybjrdrcit|" | sort
