import { defineConfig } from "osrs-sdk-assets";
import { COLOSSEUM_ASSETS } from "./src/assets";

export default defineConfig({
  cache: { openrs2: 2437 },
  assets: COLOSSEUM_ASSETS,
  outDir: "./public/osrs-assets",
});
