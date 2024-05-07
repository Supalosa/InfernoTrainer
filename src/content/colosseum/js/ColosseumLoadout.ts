import { UnitOptions } from "../../../sdk/Unit";

import { RingOfSufferingImbued } from "../../equipment/RingOfSufferingImbued";
import { DragonArrows } from "../../equipment/DragonArrows";
import { SaradominBrew } from "../../items/SaradominBrew";
import { SuperRestore } from "../../items/SuperRestore";
import { Player } from "../../../sdk/Player";
import { ScytheOfVitur } from "../../weapons/ScytheOfVitur";
import { TorvaFullhelm } from "../../equipment/TorvaFullhelm";
import { InfernalCape } from "../../equipment/InfernalCape";
import { TorvaPlatebody } from "../../equipment/TorvaPlatebody";
import { TorvaPlatelegs } from "../../equipment/TorvaPlatelegs";
import { PrimordialBoots } from "../../equipment/PrimordialBoots";
import { BladeOfSaeldor } from "../../weapons/BladeOfSaeldor";
import { AmuletOfTorture } from "../../equipment/AmuletOfTorture";
import { FerociousGloves } from "../../equipment/FerociousGloves";
import { SuperCombatPotion } from "../../items/SuperCombatPotion";
import { AvernicDefender } from "../../equipment/AvernicDefender";
import { UltorRing } from "../../equipment/UltorRing";

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
        null,
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
