#!/usr/bin/env bash
# BAYONA — local launch
cd "$(dirname "$0")"
echo "  BAYONA — TU VIDA ES EL JUEGO"
echo "  ► http://localhost:8080"
python3 -m http.server 8080
