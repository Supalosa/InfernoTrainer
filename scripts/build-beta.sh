#!/usr/bin/env bash
set -euo pipefail

# TODO: Fix the SDK build/package declaration output so this normalization is
# no longer required here.

# Netlify build script that allows us to build against a specific branch of osrs-sdk and osrscachereader.

TRAINER_ROOT="${PWD}"
WORK_TMP="$(mktemp -d)"
CHECKOUT_ROOT="${WORK_TMP}/checkout"
SDK_TMP="${CHECKOUT_ROOT}/osrs-sdk"
READER_TMP="${CHECKOUT_ROOT}/osrscachereader"
CACHE_ROOT="${NETLIFY_CACHE_DIR:-/opt/build/cache}/osrs-cache-render"
: "${OSRS_OPENRS2_CACHE_ID:?OSRS_OPENRS2_CACHE_ID must name the OpenRS2 cache to extract}"

mkdir -p "${CHECKOUT_ROOT}" "${CACHE_ROOT}/.cache-render"
git clone --depth 1 --branch "${OSRS_SDK_BRANCH}" "${OSRS_SDK_REPO}" "${SDK_TMP}"
git clone --depth 1 --branch "${OSRS_CACHE_READER_BRANCH}" "${OSRS_CACHE_READER_REPO}" "${READER_TMP}"
ln -s "${CACHE_ROOT}/.cache-render" "${SDK_TMP}/.cache-render"

pushd "${READER_TMP}" >/dev/null
npm ci
popd >/dev/null

pushd "${SDK_TMP}" >/dev/null
npm ci
npm run assets -- "${OSRS_OPENRS2_CACHE_ID}"
npm run build
# webpack emits declarations below lib/osrs-sdk/src, while package.json's
# public types entrypoint is lib/index.d.ts. Flatten that generated tree before
# installing so the trainer's TypeScript compiler sees the same SDK API.
if [[ -f lib/osrs-sdk/src/index.d.ts ]]; then
  cp -a lib/osrs-sdk/src/. lib/
fi
popd >/dev/null

# The SDK React bindings are a separate workspace package and are not included
# when npm installs only the SDK workspace root.
npm install --no-save "${SDK_TMP}" "${SDK_TMP}/packages/osrs-sdk-react"
npm run build
mkdir -p dist/cache-render
cp -a "${SDK_TMP}/cache-render-bundle/." dist/cache-render/
