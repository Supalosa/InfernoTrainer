import React, { useState, useSyncExternalStore } from "react";
import {
  CacheRender,
  cacheSound,
  ControlPanelController,
  Region,
  Settings,
  Sound,
  SoundCache,
  Trainer,
  TrainerInstance,
  TrainerLoadingState,
} from "osrs-sdk";
import { DefaultSidebar, GameOverlay, LoadoutManager, Modal, RuneScapeButton, RuneScapePanel, TrainerApp, TrainerLoadingSplash, useSettingsStore } from "osrs-sdk-react";
import { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";
import { WAVE_COMPOSITIONS, WaveNumber, WavesRegion } from "./content/colosseum/js/WavesRegion";
import { COLOSSEUM_ASSETS } from "./assets";
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

type AttackSetting = Exclude<
  keyof ColosseumSettingsState,
  "forceDoubleSouth" | "myopiaLevel" | "npcsAggressive" | "waveNumber" | "showSolarFlareTiles" | "solarFlareLevel"
>;

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

function WavesSidebar() {
  const settings = useSettingsStore(colosseumSettings);
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={settings.npcsAggressive}
          onChange={(event) => colosseumSettings.set({ npcsAggressive: event.currentTarget.checked })}
        />
        Aggressive NPCs on wave start
      </label>
      <RuneScapeButton type="button" onClick={() => Trainer.reset()}>Reset wave</RuneScapeButton>
    </>
  );
}

function WaveStartModal({ region }: { region: WavesRegion }) {
  const settings = useSettingsStore(colosseumSettings);
  const open = useSyncExternalStore(
    region.subscribeWaveState,
    region.isWaveStartModalOpen,
    region.isWaveStartModalOpen,
  );
  const selectedWave = useSyncExternalStore(
    region.subscribeWaveState,
    region.getSelectedWave,
    region.getSelectedWave,
  );

  const waveLabels: Record<WaveNumber, string> = {
    1: "Warband, Shaman",
    2: "Warband, Shaman, Javelin",
    3: "Warband, Shaman, 2x Javelin",
    4: "Warband, Shaman, Manticore",
    5: "Warband, Shaman, Javelin, Manticore",
    6: "Warband, Shaman, 2x Javelin, Manticore",
    7: "Warband, Javelin, Manticore, Shockwave",
    8: "Warband, 2x Javelin, Manticore, Shockwave",
    9: "Warband, Javelin, 2x Manticore",
    10: "Warband, 2x Javelin, 2x Manticore",
    11: "Warband, Javelin, 2x Manticore, Shockwave",
    12: "performance test / good luck",
  };

  return (
    <Modal blocking={false} open={open} aria-label="Start wave">
      <RuneScapePanel style={{ width: 280 }}>
        <h2 style={{ marginTop: 0, textAlign: "center" }}>Secret double south trainer</h2>
        <p style={{ marginTop: 0, textAlign: "center" }}>
          Wave starts include the Fremennik warband and timed reinforcements.
          Javelin toss is not implemented yet.
        </p>
        <select
          aria-label="Wave"
          value={selectedWave}
          onChange={(event) => region.setSelectedWave(Number(event.currentTarget.value) as WaveNumber)}
        >
          {(Object.keys(WAVE_COMPOSITIONS) as unknown as WaveNumber[]).map((wave) => (
            <option key={wave} value={wave}>Wave {wave} — {waveLabels[wave]}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={settings.forceDoubleSouth}
            onChange={(event) => colosseumSettings.set({ forceDoubleSouth: event.currentTarget.checked })}
          />
          Force double south
        </label>
        <RuneScapeButton
          type="button"
          onClick={() => region.requestWaveStart()}
          onMouseEnter={() => SoundCache.play(new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.waveStartStartHover.id), 0.05))}
        >
          Start
        </RuneScapeButton>
      </RuneScapePanel>
    </Modal>
  );
}

function BossSidebar({ region }: { region: ColosseumRegion }) {
  const settings = useSettingsStore(colosseumSettings);
  return (
    <>
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
        value={settings.solarFlareLevel}
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
          checked={settings.showSolarFlareTiles}
          onChange={(event) => region.setShowSolarFlareTiles(event.currentTarget.checked)}
        />
        Solar Flare Tiles
      </label>

      <p>Myopia:</p>
      <select
        aria-label="Myopia"
        value={settings.myopiaLevel}
        onChange={(event) => colosseumSettings.set({ myopiaLevel: Number(event.currentTarget.value) })}
      >
        <option value={0}>None</option>
        <option value={1}>Level 1</option>
        <option value={2}>Level 2</option>
        <option value={3}>Level 3</option>
      </select>
      <br />
    </>
  );
}

function Sidebar({ onLoadoutToggle, region }: { onLoadoutToggle: () => void; region: ColosseumRegion }) {
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div>
      {region instanceof WavesRegion
        ? <WavesSidebar />
        : <BossSidebar region={region} />}
      <hr />

      <div style={{ paddingBottom: 10, paddingTop: 10, textAlign: "center", width: "100%" }}>
        <div id="gpu_warning" />
      </div>
      <RuneScapeButton type="button" onClick={() => window.location.assign("https://discord.gg/nryYHbvtTa")}>Discord</RuneScapeButton>
      <RuneScapeButton type="button" onClick={() => setShowCredits((visible) => !visible)}>Credits</RuneScapeButton>
      {showCredits && <Credits />}
      <hr />
      <RuneScapeButton type="button" onClick={() => window.location.assign("https://los.colosim.com")}>Line-of-Sight Solver</RuneScapeButton>
      <hr />
      <RuneScapeButton type="button" onClick={() => ControlPanelController.controller.setActiveControl("SETTINGS")}>Settings</RuneScapeButton>
      <RuneScapeButton type="button" onClick={onLoadoutToggle}>Loadout</RuneScapeButton>
    </div>
  );
}

export function ColosseumApp() {
  const [trainer] = useState(createTrainer);
  const [loading, setLoading] = useState<TrainerLoadingState>();
  const [loadoutOpen, setLoadoutOpen] = useState(false);

  const isLoaded = loading?.status === "ready";

  return (
    <TrainerApp
      trainer={trainer}
      onLoadingStateChange={setLoading}
    >
      <GameOverlay>
        <div id="disclaimer_panel">Work in progress.<br />All assets are property of Jagex.</div>
        <TrainerLoadingSplash state={loading} />
        {trainer.region instanceof WavesRegion && isLoaded && <WaveStartModal region={trainer.region} />}
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
