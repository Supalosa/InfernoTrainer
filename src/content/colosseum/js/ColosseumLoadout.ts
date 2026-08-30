import { TorvaFullhelm, AmuletOfTorture, InfernalCape, DragonArrows, TorvaPlatebody, TorvaPlatelegs, PrimordialBoots, FerociousGloves, UltorRing, AvernicDefender, SuperCombatPotion, UnitOptions } from "osrs-sdk";
import { SaradominBrew, SuperRestore } from "osrs-sdk";
import { ScytheOfVitur, BladeOfSaeldor, NoxiousHalberd, Player } from "osrs-sdk";

export class ColosseumLoadout {
  loadoutType: string;

  constructor(loadoutType: string) {
    this.loadoutType = loadoutType;
  }

  loadoutMaxMelee() {
    return {
      equipment: {
        weapon: new ScytheOfVitur(),
        offhand: null,
        helmet: new TorvaFullhelm(),
        necklace: new AmuletOfTorture(),
        cape: new InfernalCape(),
        ammo: new DragonArrows(),
        chest: new TorvaPlatebody(),
        legs: new TorvaPlatelegs(),
        feet: new PrimordialBoots(),
        gloves: new FerociousGloves(),
        ring: new UltorRing(),
      },
      inventory: [
        new BladeOfSaeldor(),
        new AvernicDefender(),
        new NoxiousHalberd(),
        null,
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperCombatPotion(),
        new SuperCombatPotion(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        null,
        null,
        null,
        null,
      ],
    };
  }

  setStats(player: Player) {
    player.stats.prayer = 99;
    player.currentStats.prayer = 99;
    player.stats.defence = 99;
    player.currentStats.defence = 99;
  }

  applyStartingBoosts(player: Player) {
    // a fake supercombat boost
    for (const stat of ["attack", "strength", "defence"] as const) {
      const boost = Math.floor(player.stats[stat] * 0.15) + 5;
      player.currentStats[stat] = player.stats[stat] + boost;
    }
  }

  getLoadout(): UnitOptions {
    let loadout: UnitOptions;
    switch (this.loadoutType) {
      case "max_melee":
        loadout = this.loadoutMaxMelee();
        break;
    }
    return loadout;
  }
}
