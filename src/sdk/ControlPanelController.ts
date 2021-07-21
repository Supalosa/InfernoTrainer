'use strict'
import { AccountControls } from './ControlPanels/AccountControls'
import { AncientsSpellbookControls } from './ControlPanels/AncientsSpellbookControls'
import { BaseControls } from './ControlPanels/BaseControls'
import { ClanChatControls } from './ControlPanels/ClanChatControls'
import { CombatControls } from './ControlPanels/CombatControls'
import { EmotesControls } from './ControlPanels/EmotesControls'
import { EmptyControls } from './ControlPanels/EmptyControls'
import { EquipmentControls } from './ControlPanels/EquipmentControls'
import { FriendsControls } from './ControlPanels/FriendsControls'
import { InventoryControls } from './ControlPanels/InventoryControls'
import { MusicControls } from './ControlPanels/MusicControls'
import { PrayerControls } from './ControlPanels/PrayerControls'
import { QuestsControls } from './ControlPanels/QuestsControls'
import { SettingsControls } from './ControlPanels/SettingsControls'
import { StatsControls } from './ControlPanels/StatsControls'
import { Region } from './Region'
import { Settings } from './Settings'

interface TabPosition{
  x: number;
  y: number;
}

export class ControlPanelController {
  static controls = Object.freeze({
    INVENTORY: new InventoryControls(),
    PRAYER: new PrayerControls(),
    EQUIPMENT: new EquipmentControls(),
    STATS: new StatsControls(),
    ANCIENTSSPELLBOOK: new AncientsSpellbookControls()
  });

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  region?: Region;
  controls: BaseControls[];
  selectedControl: BaseControls;
  

  constructor () {
    this.canvas = document.getElementById('controlPanel') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')

    this.canvas.width = 33 * 7
    this.canvas.height = 36 * 2 + 275

    this.region = null

    this.canvas.addEventListener('mousedown', this.controlPanelClick.bind(this))

    this.controls = [
      new CombatControls(),
      ControlPanelController.controls.STATS,
      new QuestsControls(),
      ControlPanelController.controls.INVENTORY,
      ControlPanelController.controls.EQUIPMENT,
      ControlPanelController.controls.PRAYER,
      ControlPanelController.controls.ANCIENTSSPELLBOOK,
      new EmptyControls(),
      new FriendsControls(),
      new AccountControls(),
      new ClanChatControls(),
      new SettingsControls(),
      new EmotesControls(),
      new MusicControls()
    ]

    this.selectedControl = ControlPanelController.controls.PRAYER

    document.addEventListener('keypress', (event) => {
      if (Settings.is_keybinding){
        return;
      }
      this.controls.forEach((control) => {
        if (control.keyBinding === event.key) {
          this.selectedControl = control
        }
      })
    })
  }

  setRegion (region: Region) {
    this.region = region
  }

  tabPosition (i: number, compact: boolean): TabPosition {
    if (compact) {
      const x = i % 7
      const y = Math.floor(i / 7)
      return { x: x * 33, y: y * 36 + 275 }
    }
    // untested
    return { x: i * 33, y: 0 }
  }

  controlPanelClick (e: MouseEvent) {
    const x = e.offsetX
    const y = e.offsetY

    if (y > 275) {
      this.controls.forEach((control: BaseControls, index: number) => {
        const tabPosition = this.tabPosition(index, true)
        if (tabPosition.x <= x && x < tabPosition.x + 33) {
          if (tabPosition.y <= y && x < tabPosition.y + 36) {
            if (this.controls[index] === this.selectedControl) {
              this.selectedControl = null
              return
            }
            this.selectedControl = this.controls[index]
          }
        }
      })
    }

    if (!this.selectedControl) {
      return
    }

    const panelX = this.canvas.width - 204
    const panelY = 0
    const panelWidth = 204
    const panelHeight = 275
    if (panelX < x && x < panelX + panelWidth) {
      if (panelY < y && y < panelY + panelHeight) {
        const relativeX = x - panelX
        const relativeY = y - panelY
        this.selectedControl.clickedPanel(this.region, relativeX, relativeY)
      }
    }
  }

  draw (region: Region) {
    this.ctx.fillStyle = '#000'

    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.selectedControl && this.selectedControl.draw) {
      this.selectedControl.draw(region, this, this.canvas.width - 204, 0)
    }

    let selectedPosition: TabPosition = null
    this.controls.forEach((control, index) => {
      const tabPosition = this.tabPosition(index, true)
      if (control.tabImage){
        this.ctx.drawImage(control.tabImage, tabPosition.x, tabPosition.y)
      }
      if (control === this.selectedControl) {
        selectedPosition = tabPosition
      }
    })
    if (selectedPosition) {
      this.ctx.strokeStyle = '#00FF0073'
      this.ctx.lineWidth = 3
      this.ctx.strokeRect(selectedPosition.x, selectedPosition.y, 33, 36)
    }
  }
}