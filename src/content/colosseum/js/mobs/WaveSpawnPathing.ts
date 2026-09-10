import { Mob } from "osrs-sdk";

type MobConstructor<T extends Mob = Mob> = new (...args: any[]) => T;

/** Colosseum wave NPCs behave as though their attack range is zero for their
 * first server tick, making them take one pathing step even when spawned with
 * line of sight to the player. */
export function withWaveSpawnPathing<TBase extends MobConstructor>(Base: TBase) {
  let prototype = Base.prototype;
  let rangeGetter: (() => number) | undefined;
  while (prototype && !rangeGetter) {
    rangeGetter = Object.getOwnPropertyDescriptor(prototype, "attackRange")?.get;
    prototype = Object.getPrototypeOf(prototype);
  }
  if (!rangeGetter) throw new Error(`${Base.name} has no attackRange getter`);

  return class WaveSpawnPathingMob extends Base {
    private waveSpawnPathingTicks = 1;

    override get attackRange() {
      return this.waveSpawnPathingTicks > 0 ? 0 : rangeGetter.call(this);
    }

    override attackStep() {
      super.attackStep();
      if (this.waveSpawnPathingTicks > 0) this.waveSpawnPathingTicks--;
    }
  };
}
