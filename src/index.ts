'use strict'

import { Inferno } from './content/inferno/Inferno'
import { VerzikP3 } from './content/verzik/VerzikP3'
import { Game } from './sdk/Game'
import { ControlPanelController } from './sdk/ControlPanelController'
import { Settings } from './sdk/Settings'
import { InventoryControls } from './sdk/ControlPanels/InventoryControls'
import { Region } from './sdk/Region'

Settings.readFromStorage()
const selectedRegionName = Settings.region
let selectedRegion: Region;

console.log('selected region is ' + selectedRegionName)
switch (selectedRegionName) {
  case 'verzikp3':
    selectedRegion = new VerzikP3()
    break
  case 'inferno':
  default:
    selectedRegion = new Inferno()
}

// Create game
const game = new Game(
  'map',
  selectedRegion
  )

const controlPanel = new ControlPanelController()
InventoryControls.inventory = selectedRegion.getInventory()

game.setControlPanel(controlPanel)
controlPanel.setGame(game)

selectedRegion.initialize(game)

// Start the engine
game.startTicking()

const timer = setInterval(() => {
  game.heldDown-- // Release hold down clamps
  if (game.heldDown <= 0) {
    clearInterval(timer)
  }
}, 600)

/// /////////////////////////////////////////////////////////

document.getElementById('version').innerHTML = 'Version ' + process.env.COMMIT_REF || '' + ' - ' + process.env.BUILD_DATE || ''
