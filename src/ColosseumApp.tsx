import React, { useState } from "react";
import {
  CacheRender,
  ControlPanelController,
  Region,
  Settings,
  TileMarker,
  TrainerInstance,
  TrainerLoadingState,
} from "osrs-sdk";
import { TrainerApp, TrainerLoading, useSettingsSnapshot, useSettingsStore } from "osrs-sdk-react";
import { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";
import {
  colosseumSettings,
  ColosseumSettingsState,
} from "./content/colosseum/js/ColosseumSettings";

declare const __OSRS_CACHE_RENDER_MANIFEST_URL__: string;

declare global {
  interface Window {
    OSRS_CACHE_RENDER_MANIFEST_URL?: string;
  }
}

type TransferredSettings = {
  version: 1;
  hotkeys?: Partial<Record<"inventory" | "spellbook" | "equipment" | "prayer" | "combat", string>>;
  ui?: {
    zoomScale?: number;
    maxUiScale?: number;
    menuVisible?: boolean;
  };
};

function applyTransferredSettings() {
  const encodedSettings = new URLSearchParams(window.location.search).get("settings");
  if (!encodedSettings) return;

  try {
    const base64 = encodedSettings.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    const settings = JSON.parse(atob(paddedBase64)) as TransferredSettings;
    if (settings.version !== 1) return;

    const hotkeySettings: Record<
      keyof NonNullable<TransferredSettings["hotkeys"]>,
      "inventory_key" | "spellbook_key" | "equipment_key" | "prayer_key" | "combat_key"
    > = {
      inventory: "inventory_key",
      spellbook: "spellbook_key",
      equipment: "equipment_key",
      prayer: "prayer_key",
      combat: "combat_key",
    };
    for (const [key, setting] of Object.entries(hotkeySettings)) {
      const value = settings.hotkeys?.[key as keyof typeof hotkeySettings];
      if (typeof value === "string" && value.length > 0) Settings[setting] = value;
    }

    if (Number.isFinite(settings.ui?.zoomScale)) {
      Settings.zoomScale = Math.max(0.5, Math.min(2, settings.ui.zoomScale));
    }
    if (Number.isFinite(settings.ui?.maxUiScale)) {
      Settings.maxUiScale = Math.max(0.5, Math.min(2, settings.ui.maxUiScale));
    }
    if (typeof settings.ui?.menuVisible === "boolean") {
      Settings.menuVisible = settings.ui.menuVisible;
    }

    Settings.persistToStorage();
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  } catch {
    // Ignore malformed or obsolete transfer links and use the saved settings.
  }
}

function createTrainer() {
  CacheRender.configure(
    __OSRS_CACHE_RENDER_MANIFEST_URL__
      || window.OSRS_CACHE_RENDER_MANIFEST_URL
      || "http://127.0.0.1:8081/manifest.json",
  );
  Settings.readFromStorage();
  applyTransferredSettings();
  colosseumSettings.load();

  const regions: Record<string, Region> = {
    "colosseum.html": new ColosseumRegion(),
  };
  const regionName = window.location.pathname.split("/").pop() ?? "colosseum.html";
  const region = regions[regionName] ?? regions["colosseum.html"];
  return new TrainerInstance(region, { readyTimer: 5 });
}

type AttackSetting = Exclude<keyof ColosseumSettingsState, "showSolarFlareTiles" | "solarFlareLevel">;

function AttackCheckbox({ label, setting }: { label: string; setting: AttackSetting }) {
  const settings = useSettingsStore(colosseumSettings);
  return (
    <label>
      <input
        type="checkbox"
        checked={settings[setting]}
        onChange={(event) => colosseumSettings.set({ [setting]: event.currentTarget.checked })}
      />
      {label}
      <br />
    </label>
  );
}

function Credits() {
  return (
    <ul>
      <li>Jagex</li>
      <li>Supalosa (engine and logic)</li>
      <li>Tesla Owner (engine)</li>
      <li>KiwiIskadda (detailed feedback)</li>
      <li>Syndra, Varadium, ro0bo, zyth (early feedback and testing)</li>
      <li>@kattykoo on discord (dm for colosseum tips and tricks)</li>
    </ul>
  );
}

function Sidebar({ region }: { region: ColosseumRegion }) {
  const settings = useSettingsSnapshot();
  const colosseumSettingsSnapshot = useSettingsStore(colosseumSettings);
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div id="right_panel" className={settings.menuVisible ? undefined : "hidden"}>
      <span style={{ color: "lime" }}>Right click Sol to skip to specific phases.</span>
      <hr />
      <p>Attack sequence selector:</p>
      <AttackCheckbox label="Shields" setting="useShields" />
      <AttackCheckbox label="Spears" setting="useSpears" />
      <AttackCheckbox label="Triple Parry" setting="useTriple" />
      <AttackCheckbox label="Grapple" setting="useGrapple" />
      <AttackCheckbox label="Phase Transitions" setting="usePhaseTransitions" />

      <p>Solar Flare:</p>
      <select
        aria-label="Solar Flare"
        value={colosseumSettingsSnapshot.solarFlareLevel}
        onChange={(event) => region.setSolarFlareLevel(Number(event.currentTarget.value))}
      >
        <option value={0}>None</option>
        <option value={1}>Level 1</option>
        <option value={2}>Level 2</option>
        <option value={3}>Level 3</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={colosseumSettingsSnapshot.showSolarFlareTiles}
          onChange={(event) => region.setShowSolarFlareTiles(event.currentTarget.checked)}
        />
        Solar Flare Tiles
      </label>
      <br />
      <hr />

      <p>Rendering:</p>
      <label htmlFor="render_fps">FPS cap</label>
      <select
        id="render_fps"
        value={settings.renderFps}
        onChange={(event) => Settings.set({ renderFps: Number(event.currentTarget.value) })}
      >
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
        <option value={120}>120 FPS</option>
        <option value={0}>Unlimited</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={settings.smoothCacheAnimations}
          onChange={(event) => Settings.set({ smoothCacheAnimations: event.currentTarget.checked })}
        />
        Smooth animations
      </label>
      <br />
      <hr />

      <a href="https://discord.gg/nryYHbvtTa">Discord</a><br />
      <button type="button" onClick={() => setShowCredits((visible) => !visible)}>Credits</button>
      {showCredits && <Credits />}
      <hr />
      <a href="https://los.colosim.com">Line-of-Sight Solver</a>
      <a href="https://inferno.colosim.com/?wave=69">Zuk Trainer</a>
      <a href="https://verzik.colosim.com/?">Verzik P3 Tanking Trainer</a>
      <hr />

      <button type="button" onClick={() => ControlPanelController.controller.setActiveControl("SETTINGS")}>Settings</button>
      <hr />
      <span>More settings:</span>
      <div>
        <input
          id="tileMarkerColor"
          type="color"
          value={settings.tileMarkerColor}
          onChange={(event) => {
            Settings.set({ tileMarkerColor: event.currentTarget.value });
            TileMarker.onSetColor(event.currentTarget.value);
          }}
        />
        <label htmlFor="tileMarkerColor">Tile Markers</label>
      </div>
      <div style={{ paddingBottom: 10, paddingTop: 10, textAlign: "center", width: "100%" }}>
        <div id="gpu_warning" />
      </div>
    </div>
  );
}

export function ColosseumApp() {
  const [trainer] = useState(createTrainer);
  const [loading, setLoading] = useState<TrainerLoadingState>();

  return (
    <TrainerApp trainer={trainer} onLoadingStateChange={setLoading}>
      <TrainerLoading state={loading} style={{ left: 10, position: "absolute", top: 10 }} />
      <div id="disclaimer_panel">Work in progress.<br />All assets are property of Jagex.</div>
      <Sidebar region={trainer.region as ColosseumRegion} />
    </TrainerApp>
  );
}
