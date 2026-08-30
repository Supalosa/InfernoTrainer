# Inferno Trainer

- [Click here to try the Inferno Trainer](https://www.infernotrainer.com/)
- [Click here to beta test the Inferno Trainer](https://beta.infernotrainer.com/)
- [Join our Discord](https://discord.gg/Z3ZyY7Yzt5)

## What is this project?

This project stemmed from my interest in Old School Runescape's Inferno, and my desire for an open source, relatively clean re-implementation of the Old School Runescape engine. The underlying code is designed closer to a true game engine compared to any other trainer or simulator. The goal is for there to be a clean, well-defined API between all "Game Content" code and any underlying "Engine" code

## How do I use it?

### Pick your own waves

If you want to practice a wave, click one of the links above. You can type in a wave and it will produce a random spawn, and you can re-play the exact spawn if you wish.

### Practice a wave I failed in-game

Alternatively, if you are practicing the Inferno and have the Inferno Stats plugin (Available on RuneLite's Plugin Hub), you can click a wave in the panel and it will load the simulation with the exact spawn. I would recommend you disable the "Hide when outside of the Inferno" feature for when you plank.

## I found a bug!

Likely. Please open a issue above. Videos, screenshots, proof of OSRS science, etc is appreciated. I want this to be a faithful re-implementation of OSRS and all bugs are appreciated.

## Can I contribute?

Sure. Right now the code is undergoing rapid development and the API is not stable. I am open to pull requests but I suggest you start small and let me talk to you first to make sure we're aligned.

## Development notes

Use Node 16 for now. There's an SSL error on version >= 18.

To use a local checkout of `osrs-sdk` from the sibling directory (note: the SDK **must** be a sibling of this project and have the name `osrs-sdk`), run:

    npm run link:sdk

This builds the SDK  and uses the standard npm link workflow without changing
the committed dependency or lockfile. Re-run it after SDK source changes, then
restart the trainer dev server. Use `npm unlink osrs-sdk` followed by
`npm install` to restore the published package.

To select a hosted cache-render bundle at build/dev-server time:

    OSRS_CACHE_RENDER_MANIFEST_URL=https://assets.example.com/osrs-cache-render/manifest.json npm run start

    npm run start

### Netlify beta builds

The `beta` branch uses the `[context.beta]` configuration in `netlify.toml` and
[`scripts/build-beta.sh`](scripts/build-beta.sh). That build clones the SDK
repository and branch named by `OSRS_SDK_REPO` and
`OSRS_SDK_BRANCH` (defaulting to the cache-render branch), builds it, downloads
and extracts the cache-render assets using the cache reader repository and
branch named by `OSRS_CACHE_READER_REPO` and `OSRS_CACHE_READER_BRANCH`, then
installs that built SDK checkout before building the trainer. The generated cache bundle is
copied into `dist/cache-render` and served by the trainer site. The OpenRS2
cache is stored under `/opt/build/cache/osrs-cache-render` (or
`NETLIFY_CACHE_DIR` when provided), so subsequent builds reuse it. These values
can be overridden in Netlify for a fork or another SDK branch.

The beta context uses these asset settings:

    OSRS_ASSET_BASE_URL=https://assets-soltrainer.netlify.app
    OSRS_CACHE_RENDER_MANIFEST_URL=/cache-render/manifest.json

The trainer build bundles that SDK into `dist/main.js`. Since the SDK branch is
cloned by name, each beta deploy uses the latest commit on that branch. For a
fully reproducible deploy, change the command to check out a specific commit
after cloning.

Running test

    npx jest
