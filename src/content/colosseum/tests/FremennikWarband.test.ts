import "../../../../test/setupFiles";

import {
  DelayedAction,
  MagicWeapon,
  MeleeWeapon,
  Random,
  RangedWeapon,
  Settings,
  TestNpc,
  TestRegion,
  Viewport,
  World,
} from "osrs-sdk";

import {
  FremennikWarbandArcher,
  FremennikWarbandBerserker,
  FremennikWarbandSeer,
} from "../js/mobs/FremennikWarband";

class OneTileTarget extends TestNpc {
  override get size() {
    return 1;
  }
}

describe("Fremennik warband", () => {
  let region: TestRegion;
  let world: World;
  let target: TestNpc;

  const tick = (count = 1) => {
    for (let index = 0; index < count; index++) {
      world.globalTickCounter++;
      world.tickRegion(region);
    }
  };

  beforeEach(() => {
    Settings.inputDelay = 0;
    DelayedAction.reset();
    Viewport.viewport = { tick: jest.fn() } as unknown as Viewport;
    region = new TestRegion(40, 40);
    world = new World();
    region.world = world;
    world.addRegion(region);
    target = new OneTileTarget(region, { x: 20, y: 20 }, {});
    target.freeze(Number.MAX_SAFE_INTEGER);
    region.addMob(target);
  });

  test.each([
    [FremennikWarbandBerserker, 3, "stab"],
    [FremennikWarbandSeer, 4, "magic"],
    [FremennikWarbandArcher, 5, "range"],
  ])("%p first attacks on its fixed wave-start phase", (Warbander, firstAttackTick, style) => {
    const mob = new Warbander(region, { x: 20, y: 21 }, { aggro: target, cooldown: firstAttackTick });
    const attack = jest.spyOn(mob.weapons[style], "attack");
    region.addMob(mob);

    tick(firstAttackTick - 1);
    expect(attack).not.toHaveBeenCalled();
    tick();
    expect(attack).toHaveBeenCalledTimes(1);
  });

  test("runs two tiles and skips an attack without shifting its six-tick cycle", () => {
    const archer = new FremennikWarbandArcher(region, { x: 20, y: 26 }, { aggro: target, cooldown: 1 });
    const attack = jest.spyOn(archer.weapons.range, "attack");
    region.addMob(archer);

    tick();
    expect(archer.location).toEqual({ x: 20, y: 24 });
    expect(attack).not.toHaveBeenCalled();
    expect(archer.attackDelay).toBe(6);

    tick(5);
    expect(attack).not.toHaveBeenCalled();
    tick();
    expect(attack).toHaveBeenCalledTimes(1);
  });

  test("moves through tiles occupied by other NPCs", () => {
    const blocker = new TestNpc(region, { x: 19, y: 20 }, {});
    const archer = new FremennikWarbandArcher(region, { x: 19, y: 21 }, { aggro: target });
    region.addMob(blocker);
    region.addMob(archer);

    tick();

    expect(archer.location).toEqual(blocker.location);
  });

  test.each([
    [FremennikWarbandBerserker, { x: 20, y: 21 }, { x: 20, y: 19 }],
    [FremennikWarbandArcher, { x: 21, y: 20 }, { x: 19, y: 20 }],
    [FremennikWarbandSeer, { x: 19, y: 20 }, { x: 21, y: 20 }],
  ])("%p runs into its formation position beside the target", (Warbander, start, expected) => {
    const mob = new Warbander(region, start, { aggro: target, cooldown: 6 });
    region.addMob(mob);

    tick();

    expect(mob.location).toEqual(expected);
  });

  test("a frozen archer can attack from two tiles away", () => {
    const archer = new FremennikWarbandArcher(region, { x: 20, y: 22 }, { aggro: target, cooldown: 1 });
    const attack = jest.spyOn(archer.weapons.range, "attack");
    archer.freeze(10);
    region.addMob(archer);

    tick();

    expect(archer.location).toEqual({ x: 20, y: 22 });
    expect(attack).toHaveBeenCalledTimes(1);
  });

  test.each([
    [FremennikWarbandArcher, MeleeWeapon, RangedWeapon],
    [FremennikWarbandSeer, RangedWeapon, MagicWeapon],
    [FremennikWarbandBerserker, MagicWeapon, MeleeWeapon],
  ])("%p guarantees max hits from its weakness only", (Warbander, WeaknessWeapon, OtherWeapon) => {
    const attacker = new TestNpc(region, { x: 20, y: 21 }, {});
    const warbander = new Warbander(region, { x: 20, y: 20 });
    const weaknessWeapon = new WeaknessWeapon();
    const otherWeapon = new OtherWeapon();
    jest.spyOn(weaknessWeapon, "_maxHit").mockReturnValue(10);
    jest.spyOn(otherWeapon, "_maxHit").mockReturnValue(10);
    const originalRandom = Random.randomFn;
    Random.setRandom(() => 1);

    weaknessWeapon.attack(attacker, warbander, {});
    expect(weaknessWeapon.damageRoll).toBe(10);

    otherWeapon.attack(attacker, warbander, {});
    expect(otherWeapon.damageRoll).toBe(0);
    Random.setRandom(originalRandom);
  });

  test("uses the confirmed archer and seer projectile spot animations", () => {
    const archer = new FremennikWarbandArcher(region, { x: 20, y: 21 }, { aggro: target });
    const seer = new FremennikWarbandSeer(region, { x: 21, y: 20 }, { aggro: target });

    archer.attackStyle = archer.attackStyleForNewAttack();
    seer.attackStyle = seer.attackStyleForNewAttack();
    archer.attack();
    seer.attack();

    expect(target.incomingProjectiles[0].options.visuals.spotAnim.id).toBe(9);
    expect(target.incomingProjectiles[1].options.visuals.spotAnim.id).toBe(130);
  });
});
