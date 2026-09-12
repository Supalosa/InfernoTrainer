import {
  AbyssalTentacle,
  AmuletOfFury,
  AmuletOfTorture,
  AraneaBoots,
  AvernicDefender,
  BarrowsGloves,
  BerserkerRing_i,
  CrystalBody,
  CrystalHelm,
  CrystalLegs,
  DragonArrows,
  DragonDefender,
  FerociousGloves,
  InfernalCape,
  NoxiousHalberd,
  PrimordialBoots,
  SuperCombatPotion,
  TorvaFullhelm,
  TorvaPlatebody,
  TorvaPlatelegs,
  UltorRing,
  UnitOptions,
} from "osrs-sdk";
import { SaradominBrew, SuperRestore } from "osrs-sdk";
import { ScytheOfVitur, BladeOfSaeldor, Player } from "osrs-sdk";

export class ColosseumLoadout {
  static readonly availableLoadouts = [
    { value: "max_melee", label: "Max Melee" },
    { value: "crystal_nally", label: "Crystal Nally" },
  ];

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

  loadoutCrystalNally() {
    return {
      equipment: {
        weapon: new NoxiousHalberd(),
        offhand: null,
        helmet: new CrystalHelm(),
        necklace: new AmuletOfFury(),
        cape: new InfernalCape(),
        ammo: new DragonArrows(),
        chest: new CrystalBody(),
        legs: new CrystalLegs(),
        feet: new AraneaBoots(),
        gloves: new BarrowsGloves(),
        ring: new BerserkerRing_i(),
      },
      inventory: [
        new AbyssalTentacle(),
        new DragonDefender(),
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
    switch (this.loadoutType) {
      case "max_melee":
        return this.loadoutMaxMelee() as unknown as UnitOptions;
      case "crystal_nally":
        return this.loadoutCrystalNally() as unknown as UnitOptions;
      default:
        return this.loadoutMaxMelee() as unknown as UnitOptions;
    }
  }
}
