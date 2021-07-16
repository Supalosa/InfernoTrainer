'use strict';

import { Pillar } from "./js/Pillar";
import { Player } from '../../sdk/Player';
import { Waves } from "./js/Waves";
import { Mager } from "./js/mobs/Mager";
import { Ranger } from "./js/mobs/Ranger";
import { Meleer } from "./js/mobs/Meleer";
import { Blob } from "./js/mobs/Blob";
import { Bat } from "./js/mobs/Bat";
import { BrowserUtils } from "../../sdk/Utils/BrowserUtils";
import { TwistedBow } from "../weapons/TwistedBow";
import { Blowpipe } from "../weapons/Blowpipe";
import { Scenario } from "../../sdk/Scenario";

export class Inferno extends Scenario {

  getName() {
    return "Inferno";
  }

  getInventory() {
    return [new Blowpipe()];
  }

  initialize(region, document) {
    // Add pillars
    Pillar.addPillarsToRegion(region);


    // Add player
    const player = new Player(
      region,
      { x: parseInt(BrowserUtils.getQueryVar("x")) || 17, y: parseInt(BrowserUtils.getQueryVar("y")) || 3},
      { weapon: new TwistedBow() });
    region.setPlayer(player);

    // Add mobs

    const bat = BrowserUtils.getQueryVar("bat")
    const blob = BrowserUtils.getQueryVar("blob")
    const melee = BrowserUtils.getQueryVar("melee")
    const ranger = BrowserUtils.getQueryVar("ranger")
    const mager = BrowserUtils.getQueryVar("mager")

    if (bat || blob || melee || ranger || mager) {
      // Backwards compatibility layer for runelite plugin
      region.wave = "imported";

      (JSON.parse(mager) || []).forEach((spawn) => region.addMob(new Mager(region, {x: spawn[0], y: spawn[1]}, { aggro: player })));
      (JSON.parse(ranger) || []).forEach((spawn) => region.addMob(new Ranger(region, {x: spawn[0], y: spawn[1]}, { aggro: player })));
      (JSON.parse(melee) || []).forEach((spawn) => region.addMob(new Meleer(region, {x: spawn[0], y: spawn[1]}, { aggro: player })));
      (JSON.parse(blob) || []).forEach((spawn) => region.addMob(new Blob(region, {x: spawn[0], y: spawn[1]}, { aggro: player })));
      (JSON.parse(bat) || []).forEach((spawn) => region.addMob(new Bat(region, {x: spawn[0], y: spawn[1]}, { aggro: player })));
      document.getElementById("replayLink").href = `/${window.location.search}`;

    } else {

      // Native approach
      const wave = parseInt(BrowserUtils.getQueryVar("wave")) || 62;
      const spawns = BrowserUtils.getQueryVar("spawns") ? JSON.parse(decodeURIComponent(BrowserUtils.getQueryVar("spawns"))) : Waves.getRandomSpawns();

      const randomPillar = _.shuffle(region.entities)[0];
      Waves.spawn(region, randomPillar, spawns, wave).forEach(region.addMob.bind(region));
      region.wave = wave;

      const encodedSpawn = encodeURIComponent(JSON.stringify(spawns));
      document.getElementById("replayLink").href = `/?wave=${wave}&x=${player.location.x}&y=${player.location.y}&spawns=${encodedSpawn}`;
      document.getElementById("waveinput").value = wave;
    }
    ////////////////////////////////////////////////////////////
    // UI controls

    document.getElementById("playWaveNum").addEventListener("click", () => window.location = `/?wave=${document.getElementById("waveinput").value || wave}`);

  }
}