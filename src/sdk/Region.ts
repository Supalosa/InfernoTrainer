'use strict'
import { remove } from 'lodash'
import { ClickAnimation } from './ClickAnimation'
import { Settings } from './Settings'
import { ContextMenu, MenuOption } from './ContextMenu'
import { ControlPanelController } from './ControlPanelController'
import { Pathing } from './Pathing'
import { XpDropController } from './XpDropController'
import { Unit } from './Unit'
import { Player } from './Player'
import { Entity } from './Entity'

export class Region {
  wave: string;
  mobs: Unit[] = [];
  inputDelay?: NodeJS.Timeout = null;
  frameCounter: number = 0
  heldDown: number = 6
  controlPanel?: ControlPanelController;
  player?: Player;
  entities: Entity[] = [];
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  contextMenu: ContextMenu;
  gridCanvas: OffscreenCanvas;
  offPerformanceDelta: number;
  offPerformanceCount: number;
  clickAnimation?: ClickAnimation;

  drawTime: number;
  frameTime: number;
  tickTime: number;
  timeBetweenTicks: number;
  fps: number;
  lastT: number;

  constructor (selector: string, width: number, height: number) {
    this.clickAnimation = null
    this.contextMenu = new ContextMenu()

    this.canvas = document.getElementById(selector) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')
    this.canvas.width = Settings.tileSize * width
    this.canvas.height = Settings.tileSize * height
    this.width = width
    this.height = height

    this.gridCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height)
    const gridContext = this.gridCanvas.getContext('2d')

    gridContext.fillRect(0, 0, this.canvas.width, this.canvas.height)
    for (let i = 0; i < this.width * this.height; i++) {
      gridContext.fillStyle = (i % 2) ? '#100' : '#210'
      gridContext.fillRect(
        i % this.width * Settings.tileSize,
        Math.floor(i / this.width) * Settings.tileSize,
        Settings.tileSize,
        Settings.tileSize
      )
    }

    this.offPerformanceDelta = 0
    this.offPerformanceCount = 0

    this.canvas.addEventListener('click', this.mapClick.bind(this))
    this.canvas.addEventListener('contextmenu', (e) => {
      let x = e.offsetX
      let y = e.offsetY

      this.contextMenu.setPosition({ x, y })
      if (Settings.rotated === 'south') {
        x = this.width * Settings.tileSize - e.offsetX
        y = this.height * Settings.tileSize - e.offsetY
      }

      /* gather options */
      const mobs = Pathing.collidesWithAnyMobsAtPerceivedDisplayLocation(this, x, y, this.frameCounter / Settings.framesPerTick)
      let menuOptions: MenuOption[] = []
      mobs.forEach((mob) => {
        menuOptions = menuOptions.concat(mob.contextActions(this, x, y))
      })
      this.contextMenu.setMenuOptions(menuOptions)
      this.contextMenu.setActive()
    })

    this.canvas.addEventListener('mousemove', (e) => this.contextMenu.cursorMovedTo(this, e.clientX, e.clientY))
  }

  mapClick (e) {
    const framePercent = this.frameCounter / Settings.framesPerTick

    let x = e.offsetX
    let y = e.offsetY
    if (Settings.rotated === 'south') {
      x = this.width * Settings.tileSize - e.offsetX
      y = this.height * Settings.tileSize - e.offsetY
    }

    const xAlign = this.contextMenu.location.x - (this.contextMenu.width / 2) < e.offsetX && e.offsetX < this.contextMenu.location.x + this.contextMenu.width / 2
    const yAlign = this.contextMenu.location.y < e.offsetY && e.offsetY < this.contextMenu.location.y + this.contextMenu.height

    if (this.contextMenu.isActive && xAlign && yAlign) {
      this.contextMenu.clicked(this, e.offsetX, e.offsetY)
    } else {
      if (this.inputDelay) {
        clearTimeout(this.inputDelay)
      }

      const mobs = Pathing.collidesWithAnyMobsAtPerceivedDisplayLocation(this, x, y, framePercent)
      this.player.aggro = null
      if (mobs.length) {
        this.redClick()
        this.playerAttackClick(mobs[0])
      } else {
        this.yellowClick()
        this.playerWalkClick(x, y)
      }
    }
    this.contextMenu.setInactive()
  }

  playerAttackClick (mob: Unit) {
    this.inputDelay = setTimeout(() => {
      this.player.aggro = mob
    }, Settings.inputDelay)
  }

  playerWalkClick (x: number, y: number) {
    this.inputDelay = setTimeout(() => {
      this.player.moveTo(Math.floor(x / Settings.tileSize), Math.floor(y / Settings.tileSize))
    }, Settings.inputDelay)
  }

  redClick () {
    this.clickAnimation = new ClickAnimation('red', this.contextMenu.cursorPosition.x, this.contextMenu.cursorPosition.y)
  }

  yellowClick () {
    this.clickAnimation = new ClickAnimation('yellow', this.contextMenu.cursorPosition.x, this.contextMenu.cursorPosition.y)
  }

  gameTick () {
    XpDropController.controller.tick();

    
    this.player.setPrayers(ControlPanelController.controls.PRAYER.getCurrentActivePrayers())
    this.entities.forEach((entity) => entity.tick())
    this.mobs.forEach((mob) => mob.movementStep())
    this.mobs.forEach((mob) => mob.attackStep(this))
    this.player.movementStep()
    this.player.attackStep(this)


    // Safely remove the mobs from the region. If we do it while iterating we can cause ticks to be stole'd
    const deadMobs = this.mobs.filter((mob) => mob.dying === 0)
    const deadEntities = this.entities.filter((mob) => mob.dying === 0)
    deadMobs.forEach((mob) => this.removeMob(mob))
    deadEntities.forEach((entity) => this.removeEntity(entity))
  }

  drawGame (framePercent: number) {
    // Give control panel a chance to draw, canvas -> canvas
    this.controlPanel.draw(this)

    // Draw all things on the map
    this.entities.forEach((entity) => entity.draw(framePercent))

    if (this.heldDown <= 0) {
      this.mobs.forEach((mob) => mob.draw(framePercent))
    }
    this.player.draw(framePercent)

    this.ctx.restore()

    this.contextMenu.draw(this)
    if (this.clickAnimation) {
      this.clickAnimation.draw(this, framePercent)
    }
  }

  gameLoop () {
    // Runs a tick every 600 ms (when frameCounter = 0), and draws every loop
    // Everything else is just measuring performance
    const t = performance.now()
    if (this.frameCounter === 0 && this.heldDown <= 0) {
      this.timeBetweenTicks = t - this.lastT
      this.lastT = t
      this.gameTick()
      this.tickTime = performance.now() - t
    }
    const t2 = performance.now()
    this.draw(this.frameCounter / Settings.framesPerTick)
    this.drawTime = performance.now() - t2
    this.frameCounter++
    if (this.frameCounter >= Settings.framesPerTick) {
      this.fps = this.frameCounter / this.timeBetweenTicks * 1000
      this.frameCounter = 0
    }
    this.frameTime = performance.now() - t
  }

  draw (framePercent: number) {
    this.ctx.globalAlpha = 1
    this.ctx.fillStyle = 'black'

    this.ctx.restore()
    this.ctx.save()
    if (Settings.rotated === 'south') {
      this.ctx.rotate(Math.PI)
      this.ctx.translate(-this.canvas.width, -this.canvas.height)
    }

    
    this.ctx.drawImage(this.gridCanvas, 0, 0);

    this.drawGame(framePercent)

    XpDropController.controller.draw(this.ctx, this.canvas.width - 140, 0, framePercent);

    this.ctx.restore()
    this.ctx.save()

    // Performance info
    this.ctx.fillStyle = '#FFFF0066'
    this.ctx.font = '16px OSRS'
    this.ctx.fillText(`FPS: ${Math.round(this.fps * 100) / 100}`, 0, 16)
    this.ctx.fillText(`DFR: ${Settings.framesPerTick * (1 / 0.6)}`, 0, 32)
    this.ctx.fillText(`TBT: ${Math.round(this.timeBetweenTicks)}ms`, 0, 48)
    this.ctx.fillText(`TT: ${Math.round(this.tickTime)}ms`, 0, 64)
    this.ctx.fillText(`FT: ${Math.round(this.frameTime)}ms`, 0, 80)
    this.ctx.fillText(`DT: ${Math.round(this.drawTime)}ms`, 0, 96)
    this.ctx.fillText(`Wave: ${this.wave}`, 0, 112)

    if (this.heldDown) {
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.font = '72px OSRS'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(`GET READY...${this.heldDown}`, this.canvas.width / 2, this.canvas.height / 2 - 50)
      this.ctx.textAlign = 'left'
    }
  }

  setPlayer (player: Player) {
    this.player = player
  }

  setControlPanel (controlPanel: ControlPanelController) {
    this.controlPanel = controlPanel
  }

  addEntity (entity: Entity) {
    this.entities.push(entity)
  }

  removeEntity (entity: Entity) {
    remove(this.entities, entity)
  }

  addMob (mob: Unit) {
    this.mobs.push(mob)
  }

  removeMob (mob: Unit) {
    remove(this.mobs, mob)
  }

  startTicking () {
    setInterval(this.gameLoop.bind(this), Settings.tickMs / Settings.framesPerTick)
  }
}
