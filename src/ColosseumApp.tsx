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
import { DefaultSidebar, GameOverlay, LoadoutManager, TrainerApp, TrainerLoadingSplash, useSettingsSnapshot, useSettingsStore } from "osrs-sdk-react";
import { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";
import { WavesRegion } from "./content/colosseum/js/WavesRegion";
import { colosseumLoadout } from "./content/colosseum/js/ColosseumLoadout";
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

const loadoutTemplates = [colosseumLoadout];

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
      || new URL("osrs-assets/manifest.json", window.location.href).href,
  );
  Settings.readFromStorage();
  applyTransferredSettings();
  colosseumSettings.load();

  const regions: Record<string, Region> = {
    "colosseum.html": new ColosseumRegion(loadoutTemplates),
    "waves.html": new WavesRegion(loadoutTemplates),
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

function Sidebar({ onLoadoutToggle, region }: { onLoadoutToggle: () => void; region: ColosseumRegion }) {
  const settings = useSettingsSnapshot();
  const colosseumSettingsSnapshot = useSettingsStore(colosseumSettings);
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div>
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

      <a href="https://discord.gg/nryYHbvtTa">Discord</a><br />
      <button type="button" onClick={() => setShowCredits((visible) => !visible)}>Credits</button>
      {showCredits && <Credits />}
      <hr />
      <a href="https://los.colosim.com">Line-of-Sight Solver</a>
      <a href="https://inferno.colosim.com/?wave=69">Zuk Trainer</a>
      <a href="https://verzik.colosim.com/?">Verzik P3 Tanking Trainer</a>
      <hr />

      <button type="button" onClick={() => ControlPanelController.controller.setActiveControl("SETTINGS")}>Settings</button>
      <button type="button" onClick={onLoadoutToggle}>Loadout</button>
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
  const [loadoutOpen, setLoadoutOpen] = useState(false);

  return (
    <TrainerApp
      trainer={trainer}
      onLoadingStateChange={setLoading}
    >
      <GameOverlay>
        <div id="disclaimer_panel">Work in progress.<br />All assets are property of Jagex.</div>
        <TrainerLoadingSplash state={loading} />
        <LoadoutManager
          loadouts={loadoutTemplates}
          open={loadoutOpen}
          onClose={() => setLoadoutOpen(false)}
        />
      </GameOverlay>
      <DefaultSidebar>
        <Sidebar
          onLoadoutToggle={() => setLoadoutOpen((open) => !open)}
          region={trainer.region as ColosseumRegion}
        />
      </DefaultSidebar>
    </TrainerApp>
  );
}
