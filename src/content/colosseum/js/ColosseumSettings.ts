"use strict";

import {
  createJsonSettingsStorage,
  createSettingsStore,
  SettingsStorage,
} from "osrs-sdk";

export type ColosseumSettingsState = {
  showSolarFlareTiles: boolean;
  solarFlareLevel: number;
  useGrapple: boolean;
  usePhaseTransitions: boolean;
  useShields: boolean;
  useSpears: boolean;
  useTriple: boolean;
};

const STORAGE_KEY = "colosseum-trainer:settings";
const defaults: ColosseumSettingsState = {
  showSolarFlareTiles: false,
  solarFlareLevel: 1,
  useGrapple: true,
  usePhaseTransitions: true,
  useShields: true,
  useSpears: true,
  useTriple: true,
};

const jsonStorage = createJsonSettingsStorage<ColosseumSettingsState>(STORAGE_KEY, 1);

// Import the trainer's original one-key-per-setting values the first time the
// consolidated store is loaded. The legacy keys can remain for rollback/debugging.
const storage: SettingsStorage<ColosseumSettingsState> = {
  load(fallbacks) {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) {
      return jsonStorage.load(fallbacks);
    }

    const legacySolarFlareLevel = Number.parseInt(
      window.localStorage.getItem("solarFlareLevel") ?? String(fallbacks.solarFlareLevel),
      10,
    );
    const migrated = {
      showSolarFlareTiles: window.localStorage.getItem("showSolarFlareTiles") === "true",
      solarFlareLevel: Number.isFinite(legacySolarFlareLevel)
        ? legacySolarFlareLevel
        : fallbacks.solarFlareLevel,
      useGrapple: window.localStorage.getItem("useGrapple") !== "false",
      usePhaseTransitions: window.localStorage.getItem("usePhaseTransitions") !== "false",
      useShields: window.localStorage.getItem("useShields") !== "false",
      useSpears: window.localStorage.getItem("useSpears") !== "false",
      useTriple: window.localStorage.getItem("useTriple") !== "false",
    };
    jsonStorage.save(migrated);
    return migrated;
  },
  save: jsonStorage.save,
};

export const colosseumSettings = createSettingsStore({ defaults, storage });
