'use strict'

export class Settings {
  static tileSize = 23;
  static framesPerTick = 30;
  static tickMs = 600;
  static playsAudio: boolean;
  static inputDelay: number;
  static rotated: string;
  static region: string;
  static displayXpDrops: boolean

  static inventory_key: string;
  static spellbook_key: string;
  static equipment_key: string;
  static prayer_key: string;

  static is_keybinding = false;

  static persistToStorage () {
    // window.localStorage.setItem('tileSize', Settings.tileSize);
    // window.localStorage.setItem('framesPerTick', Settings.framesPerTick);
    window.localStorage.setItem('playsAudio', String(Settings.playsAudio))
    window.localStorage.setItem('inputDelay', String(Settings.inputDelay))
    window.localStorage.setItem('rotated', Settings.rotated)
    window.localStorage.setItem('region', Settings.region)
    window.localStorage.setItem('displayXpDrops', String(Settings.displayXpDrops))

    window.localStorage.setItem('inventory_key', Settings.inventory_key)
    window.localStorage.setItem('spellbook_key', Settings.spellbook_key)
    window.localStorage.setItem('equipment_key', Settings.equipment_key)
    window.localStorage.setItem('prayer_key', Settings.prayer_key)

  }

  static readFromStorage () {
    Settings.playsAudio = window.localStorage.getItem('playsAudio') === 'true' || false
    // Settings.tileSize = parseInt(window.localStorage.getItem('tileSize')) || 23;
    // Settings.framesPerTick = parseInt(window.localStorage.getItem('framesPerTick')) || 30;
    Settings.inputDelay = parseInt(window.localStorage.getItem('inputDelay')) || 100
    Settings.rotated = window.localStorage.getItem('rotated') || 'south'
    Settings.region = 'inferno'
    Settings.displayXpDrops = window.localStorage.getItem('displayXpDrops') === 'true' || true

    Settings.inventory_key = window.localStorage.getItem('inventory_key') || '4'
    Settings.spellbook_key = window.localStorage.getItem('spellbook_key') || '2'
    Settings.equipment_key = window.localStorage.getItem('equipment_key') || '1'
    Settings.prayer_key = window.localStorage.getItem('prayer_key') || '3'
  }
}
