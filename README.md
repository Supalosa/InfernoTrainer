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

Use Node 20. Asset requirements belong to this trainer in [src/assets.ts](src/assets.ts).
[osrs-assets.config.ts](osrs-assets.config.ts) pins the OpenRS2 cache and output directory.
See [assets.md](assets.md) for package installation and local development.

Install dependencies and generate the static asset bundle before starting the trainer:

    npm run assets
    npm run start

The generated directory is `public/osrs-assets`. Webpack copies it into
`dist/osrs-assets`; the trainer loads its manifest from the same site by default.
To host assets separately:

    OSRS_CACHE_RENDER_MANIFEST_URL=https://assets.example.com/manifest.json npm run start

### Netlify beta builds

The beta context runs [scripts/build-beta.sh](scripts/build-beta.sh). It builds
the SDK and reader revisions selected in `netlify.toml`, compiles this trainer's
asset manifest, and includes the generated directory in the deployed site.

Downloads are reused under `NETLIFY_CACHE_DIR/osrs-cache-render/openrs2`
(default `/opt/build/cache/osrs-cache-render/openrs2`). The trainer config pins
the cache used for normal builds. An optional `OSRS_OPENRS2_CACHE_ID` overrides
it for experiments; check map XTEA availability when selecting another cache.

The SDK and reader selectors may be branch names or immutable tags. Use tags for
reproducible deployments.
