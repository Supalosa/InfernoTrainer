import "../../../../test/setupFiles";

import { DelayedAction, EquipmentControls, EquipmentTypes, Player, Random, Settings, TestRegion, Viewport, World } from "osrs-sdk";
import { Attacks, SolHeredit } from "../js/mobs/SolHeredit";


// sol heredit movement tests
describe("sol heredit attacks", () => {
  let region: TestRegion;
  let world: World;
  let player: Player;
  let boss: SolHeredit;

  const reset = () => {
    Settings.inputDelay = 0;
    DelayedAction.reset();
    region = new TestRegion(30, 30);
    world = new World();
    region.world = world;
    world.addRegion(region);
    Viewport.setupViewport(region, document.createElement("canvas"), document.createElement("div"), true);
    player = new Player(region, { x: 15, y: 15 });
    boss = new SolHeredit(region, { x: 13, y: 20 }, { aggro: player });
    boss.stunned = 0;
    region.addPlayer(player);
    Viewport.viewport.setPlayer(player);
  };

  beforeEach(() => {
    reset();
  });

  // checking the timing between the attack sequence starting and taking damage
  test("check timing of damage is correct", () => {
    boss.setAggro(player);
    region.addMob(boss);

    boss.forceAttack = Attacks.SPEAR;
    world.tickWorld();
    expect(boss.firstSpear).toEqual(false);
    world.tickWorld(2);
    expect(player.currentStats.hitpoint).toEqual(99);
    world.tickWorld();
    // player got hit
    expect(player.currentStats.hitpoint).toBeLessThan(99);
    const hp = player.currentStats.hitpoint;
    world.tickWorld(3);
    boss.forceAttack = Attacks.SPEAR;
    expect(boss.firstSpear).toEqual(false);
    world.tickWorld();
    expect(boss.firstSpear).toEqual(true);
    world.tickWorld();
    expect(player.currentStats.hitpoint).toEqual(hp);
    world.tickWorld(2);
    // player got hit again
    expect(player.currentStats.hitpoint).toBeLessThan(hp);
  });

  test("check boss must be adjacent for one tick to attack", () => {
    boss.setAggro(player);
    region.addMob(boss);
    boss.setLocation({ x: 13, y: 24 });

    world.tickWorld();
    expect(boss.location.y).toEqual(22);
    expect(boss.hasLOS).toEqual(false);
    expect(boss.attackDelay).toBeLessThan(0);
    world.tickWorld();
    expect(boss.location.y).toEqual(20);
    expect(boss.hasLOS).toEqual(true);
    // does not attack here
    expect(boss.attackDelay).toBeLessThan(0);
    world.tickWorld();
    expect(boss.location.y).toEqual(20);
    expect(boss.attackDelay).toBeGreaterThan(0);
  });

  test("check moving one tick at a time delays attack", () => {
    boss.setAggro(player);
    region.addMob(boss);
    boss.setLocation({ x: 13, y: 23 });
    world.tickWorld();
    expect(boss.location.y).toEqual(21);

    for (let yy = 14; yy > 5; --yy) {
      player.moveTo(13, yy);
      world.tickWorld();
      expect(boss.location.y).toEqual(yy + 6);
      expect(boss.hasLOS).toEqual(true);
      expect(boss.attackDelay).toBeLessThan(0);
    }
  });

  test("requires two auto attacks after a phase transition before a special", () => {
    // The special is the final weighted-pool entry, so select it as soon as the cooldown permits.
    const random = jest.spyOn(Random, "get").mockReturnValue(0.999);
    boss.setAggro(player);
    region.addMob(boss);
    boss.phaseId = 3;
    boss.forceAttack = Attacks.PHASE_TRANSITION;

    world.tickWorld();
    expect(boss.specialAttackCooldown).toEqual(2);
    boss.forceAttack = null;
    expect((boss as any).selectAttack()).toEqual(Attacks.SPEAR);
    boss.specialAttackCooldown--;
    expect((boss as any).selectAttack()).toEqual(Attacks.SPEAR);
    boss.specialAttackCooldown--;
    expect((boss as any).selectAttack()).toEqual(Attacks.TRIPLE_LONG);

    random.mockRestore();
  });

  describe("triple attack tests", () => {
    beforeEach(() => {
      reset();
    });

    test("check triple attack (above 75%) has attack delay of 12", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
    });

    test("check triple attack (between 50 and 75%) has attack delay of 11", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 2;
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(11);
    });

    test("check triple attack (below 50%) has attack delay of 12", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 3;
      boss.forceAttack = Attacks.TRIPLE_LONG;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
    });

    test("check short triple attack (above 50%) is blockable", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 1;
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
      world.tickWorld(2);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld(2);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld(2);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
    });

    test("check long triple attack (below 50%) is blockable", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 3;
      boss.forceAttack = Attacks.TRIPLE_LONG;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
      world.tickWorld(2);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld(2);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld(3);
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
      player.prayerController.findPrayerByName("Protect from Melee").deactivate();
      world.tickWorld();
      expect(player.currentStats.hitpoint).toEqual(99);
    });

    test("check early melee prayer in triple fails", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 1;
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
      world.tickWorld();
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld(2);
      expect(player.currentStats.hitpoint).toBeLessThan(99);
    });

    test("check early overhead prayer in triple fails, even with correct melee prayer", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 1;
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
      world.tickWorld();
      player.prayerController.findPrayerByName("Protect from Range").activate(player);
      world.tickWorld();
      player.prayerController.findPrayerByName("Protect from Melee").activate(player);
      world.tickWorld();
      expect(player.currentStats.hitpoint).toBeLessThan(99);
    });

    test("check failed triple attack turns off overhead prayer", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.phaseId = 1;
      boss.forceAttack = Attacks.TRIPLE_SHORT;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(12);
      world.tickWorld();
      player.prayerController.findPrayerByName("Protect from Range").activate(player);
      world.tickWorld(2);
      expect(player.currentStats.hitpoint).toBeLessThan(99);
      expect(player.prayerController.findPrayerByName("Protect from Range").isActive).toBeFalsy();
    });
  });

  describe("grapple attack tests", () => {
    beforeEach(() => {
      new EquipmentControls();
      reset();
    });
    test("check grapple attack has attack delay of 7", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.forceAttack = Attacks.GRAPPLE;
      world.tickWorld();
      expect(boss.attackDelay).toEqual(7);
    });

    test("check grapple attack adds an equipment interaction", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.forceAttack = Attacks.GRAPPLE;
      expect(EquipmentControls.instance.equipmentInteractions).toHaveLength(1);
      world.tickWorld();
      expect(EquipmentControls.instance.equipmentInteractions).toHaveLength(2);
    });

    test("check grapple attack resets equipment interaction 4 ticks after attack", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.forceAttack = Attacks.GRAPPLE;
      expect(EquipmentControls.instance.equipmentInteractions).toHaveLength(1);
      world.tickWorld(3);
      expect(EquipmentControls.instance.equipmentInteractions).toHaveLength(2);
      world.tickWorld();
      expect(EquipmentControls.instance.equipmentInteractions).toHaveLength(1);
    });

    test("check a final-two-tick grapple parry grants max damage rolls for the next attack", () => {
      boss.setAggro(player);
      region.addMob(boss);
      boss.forceAttack = Attacks.GRAPPLE;
      world.tickWorld();
      world.tickWorld(3);
      Object.values(EquipmentTypes).forEach((slot) => EquipmentControls.instance.equipmentInteractions[0](slot));
      world.tickWorld();

      expect(player.forceMaxDamageRollsOnNextAttack).toBe(true);
    });
  });
});
