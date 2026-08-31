"use strict";

import { World, Settings, ImageLoader, Viewport, TileMarker, Location, MapController, Assets, Chrome, Region, Trainer, ControlPanelController, CacheRender } from "osrs-sdk";
import { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";

declare const __OSRS_CACHE_RENDER_MANIFEST_URL__: string;

declare global {
  interface Window {
    OSRS_CACHE_RENDER_MANIFEST_URL?: string;
  }
}

// The build-time environment variable takes precedence; the window override
// remains useful for ad-hoc browser testing.
CacheRender.configure(__OSRS_CACHE_RENDER_MANIFEST_URL__ || window.OSRS_CACHE_RENDER_MANIFEST_URL || "http://127.0.0.1:8081/manifest.json");

const SpecialAttackBarBackground = Assets.getAssetUrl("assets/images/attackstyles/interface/special_attack_background.png");

Settings.readFromStorage();
applyTransferredSettings();

type TransferredSettings = {
  version: 1;
  hotkeys?: Partial<Record<"inventory" | "spellbook" | "equipment" | "prayer" | "combat", string>>;
  ui?: {
    zoomScale?: number;
    maxUiScale?: number;
    menuVisible?: boolean;
  };
};

/**
 * Applies settings sent from colosim.com before any UI is created. The payload
 * is deliberately limited to portable preferences, rather than arbitrary
 * local-storage data.
 */
function applyTransferredSettings() {
  const encodedSettings = new URLSearchParams(window.location.search).get("settings");
  if (!encodedSettings) return;

  try {
    const base64 = encodedSettings.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    const settings = JSON.parse(atob(paddedBase64)) as TransferredSettings;
    if (settings.version !== 1) return;

    const hotkeySettings: Record<keyof NonNullable<TransferredSettings["hotkeys"]>, "inventory_key" | "spellbook_key" | "equipment_key" | "prayer_key" | "combat_key"> = {
      inventory: "inventory_key",
      spellbook: "spellbook_key",
      equipment: "equipment_key",
      prayer: "prayer_key",
      combat: "combat_key",
    };
    for (const [key, setting] of Object.entries(hotkeySettings)) {
      const value = settings.hotkeys?.[key as keyof typeof hotkeySettings];
      if (typeof value === "string" && value.length > 0) {
        Settings[setting] = value;
      }
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

// Choose the region based on the URL.
const AVAILABLE_REGIONS = {
  "colosseum.html": new ColosseumRegion(),
};
const DEFAULT_REGION_PATH = 'colosseum.html';

const regionName = window.location.pathname.split('/').pop();
const selectedRegion: Region = (regionName in AVAILABLE_REGIONS) ? AVAILABLE_REGIONS[regionName] : AVAILABLE_REGIONS[DEFAULT_REGION_PATH];

// Create world
const world = new World();
world.getReadyTimer = 5;
selectedRegion.world = world;
world.addRegion(selectedRegion);

// Initialise UI
document.getElementById('sidebar_content').innerHTML = selectedRegion.getSidebarContent();

document.getElementById("settings").addEventListener("click", () => {
  ControlPanelController.controller.setActiveControl('SETTINGS');
});

const tileMarkerColor = document.getElementById("tileMarkerColor") as HTMLInputElement;
tileMarkerColor.addEventListener("input", () => {
  Settings.tileMarkerColor = tileMarkerColor.value;
  TileMarker.onSetColor(Settings.tileMarkerColor);
  Settings.persistToStorage();
}, false);
tileMarkerColor.value = Settings.tileMarkerColor;

const { player } = selectedRegion.initialiseRegion();

Viewport.setupViewport(selectedRegion);
Viewport.viewport.setPlayer(player);

ImageLoader.onAllImagesLoaded(() => {
  MapController.controller.updateOrbsMask(player.currentStats, player.stats);
});
TileMarker.loadAll(selectedRegion);

player.perceivedLocation = player.location;
player.destinationLocation = player.location;
/// /////////////////////////////////////////////////////////
// UI controls

ImageLoader.onAllImagesLoaded(() =>
  MapController.controller.updateOrbsMask(Trainer.player.currentStats, Trainer.player.stats),
);

ImageLoader.onAllImagesLoaded(() => {
  drawAssetLoadingBar(loadingAssetProgress);
  imagesReady = true;
  checkStart();
});

const interval = setInterval(() => {
  ImageLoader.checkImagesLoaded(interval);
}, 50);

Assets.onAllAssetsLoaded(() => {
  // renders a single frame
  Viewport.viewport.initialise().then(() => {
    console.log("assets are preloaded");
    assetsPreloaded = true;
    checkStart();
  });
});

function drawAssetLoadingBar(loadingProgress: number) {
  const specialAttackBarBackground = ImageLoader.createImage(SpecialAttackBarBackground);
  const { width: canvasWidth, height: canvasHeight } = Chrome.size();
  const canvas = document.getElementById("world") as HTMLCanvasElement;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#FFFF00";
  context.font = "32px OSRS";
  context.textAlign = "center";
  context.fillText(`Loading models: ${Math.floor(loadingProgress * 100)}%`, canvas.width / 2, canvas.height / 2);
  const scale = 2;
  const left = canvasWidth / 2 - (specialAttackBarBackground.width * scale) / 2;
  const top = canvasHeight / 2 + 20;
  const width = specialAttackBarBackground.width * scale;
  const height = specialAttackBarBackground.height * scale;
  context.drawImage(specialAttackBarBackground, left, top, width, height);
  context.fillStyle = "#730606";
  context.fillRect(left + 2 * scale, top + 6 * scale, width - 4 * scale, height - 12 * scale);
  context.fillStyle = "#397d3b";
  context.fillRect(left + 2 * scale, top + 6 * scale, (width - 4 * scale) * loadingProgress, height - 12 * scale);
  context.fillStyle = "#000000";
  context.globalAlpha = 0.5;
  context.strokeRect(left + 2 * scale, top + 6 * scale, width - 4 * scale, height - 12 * scale);
  context.globalAlpha = 1;
}

let loadingAssetProgress = 0.0;
drawAssetLoadingBar(loadingAssetProgress);

Assets.onAssetProgress((loaded, total) => {
  loadingAssetProgress = loaded / total;
  drawAssetLoadingBar(loadingAssetProgress);
});

const assets2 = setInterval(() => {
  Assets.checkAssetsLoaded(assets2);
}, 50);

let imagesReady = false;
let assetsPreloaded = false;
let started = false;

function checkStart() {
  if (!started && imagesReady && assetsPreloaded) {
    started = true;
    // Start the engine
    world.startTicking();
  }
}

/// /////////////////////////////////////////////////////////

// UI disclaimer
const topHeaderContainer = document.getElementById("disclaimer_panel");
topHeaderContainer.innerHTML =
  'Work in progress.<br />' +
  topHeaderContainer.innerHTML;
