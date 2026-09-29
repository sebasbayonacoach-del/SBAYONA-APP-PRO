#!/usr/bin/env bash
# BAYONA — local launch
cd "$(dirname "$0")"
exec node tools/serve.mjs
