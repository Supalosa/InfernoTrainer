
import MissSplat from '../assets/images/hitsplats/miss.png'
import DamageSplat from '../assets/images/hitsplats/damage.png'
import { Settings } from './Settings'
import { LineOfSight } from './LineOfSight'
import { clamp, remove, filter } from 'lodash'
import { Game } from './Game'
import { BasePrayer } from './Prayers/BasePrayer'
import { Projectile } from './Weapons/Projectile'
import { XpDrop } from './XpDrop'
import { Weapon } from './Weapons/Weapon'
import { GameObject, Location } from './GameObject'
import { Pathing } from './Pathing'

export enum UnitTypes {
  MOB = 0,
  PLAYER = 1,
  ENTITY = 2,
}

export interface WeaponsMap {
  [key: string]: Weapon
}

export interface UnitOptions {
  weapon?: Weapon;
  aggro?: GameObject;
}

export interface UnitStats {
  attack: number;
  strength: number;
  defence: number;
  range: number;
  magic: number;
  hitpoint: number;
  prayer: number;
  run: number;
  specialAttack: number;
}

export interface UnitBonuses {
  attack: UnitStyleBonuses;
  defence: UnitStyleBonuses;
  other: UnitOtherBonuses;
  targetSpecific?: UnitTargetBonuses
}

export interface UnitStyleBonuses {
  stab: number;
  slash: number;
  crush: number;
  magic: number;
  range: number;
}

export interface UnitOtherBonuses {
  meleeStrength: number;
  rangedStrength: number;
  magicDamage: number;
  prayer: number
}

export interface UnitTargetBonuses {
  undead: number;
  slayer: number;
}


export class Unit extends GameObject {

  game: Game;
  prayers: BasePrayer[];
  lastOverhead?: BasePrayer;
  aggro?: GameObject;
  perceivedLocation: Location;
  attackCooldownTicks: number;
  hasLOS: boolean;
  frozen: number;
  incomingProjectiles: Projectile[];
  missedHitsplatImage: HTMLImageElement;
  damageHitsplatImage: HTMLImageElement;
  unitImage: HTMLImageElement;
  currentAnimation?: any;
  currentAnimationTickLength: number;
  currentStats: UnitStats;
  stats: UnitStats;
  bonuses: UnitBonuses;

  get type(): UnitTypes{
    return UnitTypes.MOB;
  }

  constructor (game: Game, location: Location, options?: UnitOptions) {
    super()

    this.game = game
    this.prayers = []
    this.lastOverhead = null
    this.aggro = options.aggro || null
    this.perceivedLocation = location
    this.location = location
    this.attackCooldownTicks = 0
    this.hasLOS = false
    this.frozen = 0
    // Number of ticks until NPC dies. If -1, the NPC is not dying.
    this.dying = -1
    this.incomingProjectiles = []

    this.missedHitsplatImage = new Image()
    this.missedHitsplatImage.src = MissSplat
    this.damageHitsplatImage = new Image()
    this.damageHitsplatImage.src = DamageSplat


    const unitImage = new Image(Settings.tileSize * this.size, Settings.tileSize * this.size)
    unitImage.src = this.image
    unitImage.onload = () => {
      this.unitImage = unitImage;
    }

    this.currentAnimation = null
    this.currentAnimationTickLength = 0
    this.setStats()
    this.currentStats.hitpoint = this.stats.hitpoint

    if (options.weapon) {
      this.bonuses = options.weapon.bonuses // temp code
    }
  }

  grantXp(xpDrop: XpDrop) {
    
  }

  setStats(){
    
  }

  movementStep () {
  }

  attackStep (game: Game) {
  }

  draw(tickPercent: number) {
    
    
  }
  get cooldown () {
    return 0
  }

  get attackRange () {
    return 0
  }

  get maxHit () {
    return 0
  }

  get image (): string {
    return null
  }

  isDying () {
    return (this.dying > 0)
  }

  removedFromGame () {

  }

  // Returns true if the NPC can move towards the unit it is aggro'd against.
  canMove () {
    return (!this.hasLOS && this.frozen <= 0 && !this.isDying())
  }

  // TODO more modular
  get rangeAttackAnimation () {
    return null
  }

  get sound (): string {
    return null
  }

  get color (): string {
    return '#FFFFFF'
  }

  shouldShowAttackAnimation () {
    return this.attackCooldownTicks === this.cooldown && this.dying === -1
  }

  setHasLOS () {
    if (this.aggro === this.game.player) {
      this.hasLOS = LineOfSight.hasLineOfSightOfPlayer(this.game, this.location.x, this.location.y, this.size, this.attackRange, true)
    } else if (this.type === UnitTypes.PLAYER) {
      this.hasLOS = LineOfSight.hasLineOfSightOfMob(this.game, this.location.x, this.location.y, this.aggro, this.attackRange)
    } else if (this.aggro.type === UnitTypes.MOB) {
      this.hasLOS = LineOfSight.hasLineOfSightOfMob(this.game, this.location.x, this.location.y, this.aggro, this.attackRange, this.type === UnitTypes.MOB)
    } else if (this.aggro.type === UnitTypes.ENTITY) {
      this.hasLOS = false
    }
  }

  // Returns true if this mob is in melee range of its target.
  isWithinMeleeRange () {
    const targetX = this.aggro.location.x
    const targetY = this.aggro.location.y
    let isWithinMeleeRange = false

    if (targetX === this.location.x - 1 && (targetY <= this.location.y + 1 && targetY > this.location.y - this.size - 1)) {
      isWithinMeleeRange = true
    } else if (targetY === this.location.y + 1 && (targetX >= this.location.x && targetX < this.location.x + this.size)) {
      isWithinMeleeRange = true
    } else if (targetX === this.location.x + this.size && (targetY <= this.location.y + 1 && targetY > this.location.y - this.size - 1)) {
      isWithinMeleeRange = true
    } else if (targetY === this.location.y - this.size && (targetX >= this.location.x && targetX < this.location.x + this.size)) {
      isWithinMeleeRange = true
    }
    return isWithinMeleeRange
  }

  // Returns true if this mob is on the specified tile.
  isOnTile (x: number, y: number) {
    return (x >= this.location.x && x <= this.location.x + this.size) && (y <= this.location.y && y >= this.location.y - this.size)
  }

  // Returns the closest tile on this mob to the specified point.
  getClosestTileTo (x: number, y: number) {
    // We simply clamp the target point to our own boundary box.
    return [clamp(x, this.location.x, this.location.x + this.size), clamp(y, this.location.y, this.location.y - this.size)]
  }

  addProjectile (projectile: Projectile) {
    this.incomingProjectiles.push(projectile)
  }

  setLocation (location: Location) {
    this.location = location
  }

  setPrayers (prayers: BasePrayer[]) {
    this.prayers = prayers
  }

  attackAnimation (tickPercent: number) {
    // override pls
  }

  dead () {
    this.perceivedLocation = this.location
    this.dying = 3
  }

  detectDeath () {
    if (this.dying === -1 && this.currentStats.hitpoint <= 0) {
      this.dead()
      return
    }

    if (this.dying > 0) {
      this.dying--
    }
    if (this.dying === 0) {
      this.removedFromGame()
    }
  }

  processIncomingAttacks () {
    this.incomingProjectiles = filter(this.incomingProjectiles, (projectile: Projectile) => projectile.remainingDelay > -1)
    this.incomingProjectiles.forEach((projectile) => {
      
      projectile.currentLocation = {
        x: Pathing.linearInterpolation(projectile.currentLocation.x, projectile.to.location.x + projectile.to.size / 2, 1 / (projectile.remainingDelay + 1)),
        y: Pathing.linearInterpolation(projectile.currentLocation.y, projectile.to.location.y - projectile.to.size / 2 + 1, 1 / (projectile.remainingDelay + 1)),
      }  
      
      projectile.remainingDelay--

      if (projectile.remainingDelay === 0) {
        this.currentStats.hitpoint -= projectile.damage
      }
    })
    this.currentStats.hitpoint = Math.max(0, this.currentStats.hitpoint)
  }

  drawHPBar () {
    this.game.ctx.fillStyle = 'red'
    this.game.ctx.fillRect(
      (-this.size / 2) * Settings.tileSize,
      (-this.size / 2) * Settings.tileSize,
      Settings.tileSize * this.size,
      5
    )

    this.game.ctx.fillStyle = 'green'
    const w = (this.currentStats.hitpoint / this.stats.hitpoint) * (Settings.tileSize * this.size)
    this.game.ctx.fillRect(
      (-this.size / 2) * Settings.tileSize,
      (-this.size / 2) * Settings.tileSize,
      w,
      5
    )
  }

  drawHitsplats () {
    let projectileOffsets = [
      [0, 12],
      [0, 28],
      [-14, 20],
      [14, 20]
    ]

    let projectileCounter = 0
    this.incomingProjectiles.forEach((projectile) => {
      if (projectile.remainingDelay > 0) {
        return
      }
      if (projectileCounter > 3) {
        return
      }
      projectileCounter++
      const image = (projectile.damage === 0) ? this.missedHitsplatImage : this.damageHitsplatImage
      if (!projectile.offsetX && !projectile.offsetY) {
        projectile.offsetX = projectileOffsets[0][0]
        projectile.offsetY = projectileOffsets[0][1]
      }

      projectileOffsets = remove(projectileOffsets, (offset) => {
        return offset[0] !== projectile.offsetX || offset[1] !== projectile.offsetY
      })

      this.game.ctx.drawImage(
        image,
        projectile.offsetX - 12,
        -((this.size + 1) * Settings.tileSize) / 2 - projectile.offsetY,
        24,
        23
      )
      this.game.ctx.fillStyle = '#FFFFFF'
      this.game.ctx.font = '16px Stats_11'
      this.game.ctx.textAlign = 'center'
      this.game.ctx.fillText(
        String(projectile.damage),
        projectile.offsetX,
        -((this.size + 1) * Settings.tileSize) / 2 - projectile.offsetY + 15
      )
      this.game.ctx.textAlign = 'left'
    })
  }

  drawOverheadPrayers () {
    const overheads = this.prayers.filter(prayer => prayer.isOverhead())
    if (overheads.length) {
      this.game.ctx.drawImage(
        overheads[0].overheadImage(),
        -Settings.tileSize / 2,
        -Settings.tileSize * 3,
        Settings.tileSize,
        Settings.tileSize
      )
    }
  }


  // The rendering context is the world.
  drawIncomingProjectiles(tickPercent: number) {

    this.incomingProjectiles.forEach((projectile) => {
      if (projectile.options.hidden) {
        return;
      }

      if (projectile.remainingDelay < 0) {
        return;
      }

      let startX = projectile.currentLocation.x;
      let startY = projectile.currentLocation.y;
      let endX = projectile.to.location.x + projectile.to.size / 2;
      let endY = projectile.to.location.y - projectile.to.size / 2 + 1;

      let perceivedX = Pathing.linearInterpolation(startX, endX, tickPercent / (projectile.remainingDelay + 1));
      let perceivedY = Pathing.linearInterpolation(startY, endY, tickPercent / (projectile.remainingDelay + 1));
  
      this.game.ctx.save();
      this.game.ctx.translate(
        perceivedX * Settings.tileSize, 
        (perceivedY) * Settings.tileSize
      )
        

      if (projectile.image) {
        this.game.ctx.rotate(Math.PI)
        this.game.ctx.drawImage(
          projectile.image,
          -Settings.tileSize / 2, 
          -Settings.tileSize / 2,
          Settings.tileSize,
          Settings.tileSize
        );
      }else{
        this.game.ctx.beginPath()
        this.game.ctx.fillStyle = '#D1BB7773'
        this.game.ctx.arc(0, 0, 5, 0, 2 * Math.PI)
        this.game.ctx.fill()
      }
      this.game.ctx.restore();
    });
  }

}
