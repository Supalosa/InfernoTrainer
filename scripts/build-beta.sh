#!/usr/bin/env bash
set -euo pipefail

# Build the selected SDK and reader branches, then compile this trainer's assets.
WORK_TMP="$(mktemp -d)"
SDK_TMP="${WORK_TMP}/osrs-sdk"
READER_TMP="${WORK_TMP}/osrscachereader"
CACHE_ROOT="${NETLIFY_CACHE_DIR:-/opt/build/cache}/osrs-cache-render"

npm ci
mkdir -p "${CACHE_ROOT}"
git clone --depth 1 --branch "${OSRS_SDK_BRANCH}" "${OSRS_SDK_REPO}" "${SDK_TMP}"
git clone --depth 1 --branch "${OSRS_CACHE_READER_BRANCH}" "${OSRS_CACHE_READER_REPO}" "${READER_TMP}"
pushd "${READER_TMP}" >/dev/null
npm ci
popd >/dev/null
pushd "${SDK_TMP}" >/dev/null
npm ci
npm run build
SDK_VERSION="$(node -p "require('./package.json').version")"
TOOL_VERSION="$(node -p "require('./packages/osrs-sdk-assets/package.json').version")"
REACT_VERSION="$(node -p "require('./packages/osrs-sdk-react/package.json').version")"
if [[ "${TOOL_VERSION}" != "${SDK_VERSION}" ]]; then
  echo "osrs-sdk and osrs-sdk-assets versions must match"
  exit 1
fi
npm pack --pack-destination "${WORK_TMP}" --silent
npm pack --workspace osrs-sdk-assets --pack-destination "${WORK_TMP}" --silent
npm pack --workspace osrs-sdk-react --pack-destination "${WORK_TMP}" --silent
popd >/dev/null

# Use the locally packed SDK packages for this build.
npm install --no-save "${WORK_TMP}/osrs-sdk-${SDK_VERSION}.tgz" \
  "${WORK_TMP}/osrs-sdk-assets-${SDK_VERSION}.tgz" \
  "${WORK_TMP}/osrs-sdk-react-${REACT_VERSION}.tgz"
ASSET_ARGS=(--cache-dir "${CACHE_ROOT}/openrs2" --reader-path "${READER_TMP}")
if [[ -n "${OSRS_OPENRS2_CACHE_ID:-}" ]]; then
  ASSET_ARGS+=(--cache "${OSRS_OPENRS2_CACHE_ID}")
fi
npm run assets -- "${ASSET_ARGS[@]}"
npm run build
