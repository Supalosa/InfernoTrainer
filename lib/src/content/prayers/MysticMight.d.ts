import { BasePrayer, PrayerGroups } from "../../sdk/BasePrayer";
export declare class MysticMight extends BasePrayer {
    get name(): string;
    get groups(): PrayerGroups[];
    levelRequirement(): number;
    drainRate(): number;
    isOverhead(): boolean;
    feature(): string;
    playOnSound(): void;
    playOffSound(): void;
}