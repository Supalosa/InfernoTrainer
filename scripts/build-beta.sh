#!/usr/bin/env bash
set -euo pipefail

TRAINER_ROOT="${PWD}"
WORK_TMP="$(mktemp -d)"
CHECKOUT_ROOT="${WORK_TMP}/checkout"
SDK_TMP="${CHECKOUT_ROOT}/osrs-sdk"
READER_TMP="${CHECKOUT_ROOT}/osrscachereader"
CACHE_ROOT="${NETLIFY_CACHE_DIR:-/opt/build/cache}/osrs-cache-render"

mkdir -p "${CHECKOUT_ROOT}" "${CACHE_ROOT}/.cache-render"
git clone --depth 1 --branch "${OSRS_SDK_BRANCH}" "${OSRS_SDK_REPO}" "${SDK_TMP}"
git clone --depth 1 --branch "${OSRS_CACHE_READER_BRANCH}" "${OSRS_CACHE_READER_REPO}" "${READER_TMP}"
ln -s "${CACHE_ROOT}/.cache-render" "${SDK_TMP}/.cache-render"

pushd "${SDK_TMP}" >/dev/null
npm ci
npm run assets
npm run build
npm pack --pack-destination "${SDK_TMP}"
SDK_TARBALL="$(find "${SDK_TMP}" -maxdepth 1 -type f -name 'osrs-sdk-*.tgz' -print -quit)"
test -n "${SDK_TARBALL}"
popd >/dev/null

npm install --no-save "${SDK_TARBALL}"
npm run build
mkdir -p dist/cache-render
cp -a "${SDK_TMP}/cache-render-bundle/." dist/cache-render/
