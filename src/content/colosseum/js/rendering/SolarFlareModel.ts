import * as THREE from "three";

import { GROUND_OVERLAY_Y, GroundOverlayRenderOrder, Model, Location } from "osrs-sdk";

import { SolarFlareOrb } from "../entities/SolarFlareOrb";

const SOLAR_FLARE_PATH_SIZE = 5;
const SOLAR_FLARE_PATH_INSET = 1;
const solarFlarePathShape = new THREE.Shape([
  new THREE.Vector2(0, 0),
  new THREE.Vector2(SOLAR_FLARE_PATH_SIZE, 0),
  new THREE.Vector2(SOLAR_FLARE_PATH_SIZE, SOLAR_FLARE_PATH_SIZE),
  new THREE.Vector2(0, SOLAR_FLARE_PATH_SIZE),
]);
solarFlarePathShape.holes.push(
  new THREE.Path([
    new THREE.Vector2(SOLAR_FLARE_PATH_INSET, SOLAR_FLARE_PATH_INSET),
    new THREE.Vector2(SOLAR_FLARE_PATH_INSET, SOLAR_FLARE_PATH_SIZE - SOLAR_FLARE_PATH_INSET),
    new THREE.Vector2(SOLAR_FLARE_PATH_SIZE - SOLAR_FLARE_PATH_INSET, SOLAR_FLARE_PATH_SIZE - SOLAR_FLARE_PATH_INSET),
    new THREE.Vector2(SOLAR_FLARE_PATH_SIZE - SOLAR_FLARE_PATH_INSET, SOLAR_FLARE_PATH_INSET),
  ]),
);
const SOLAR_FLARE_PATH_GEOMETRY = new THREE.ShapeGeometry(solarFlarePathShape);
const SOLAR_FLARE_PATH_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x000000,
  side: THREE.FrontSide,
  transparent: true,
  opacity: 0.2,
  depthTest: false,
  depthWrite: false,
});

export class SolarFlareModel implements Model {
  static forSolarFlare(r: SolarFlareOrb) {
    return new SolarFlareModel(r);
  }

  private material: THREE.MeshBasicMaterial;
  private sphere: THREE.Mesh;

  private outline: THREE.LineSegments;

  constructor(
    private solarFlare: SolarFlareOrb,
    onTop = true,
  ) {
    const { size } = solarFlare;
    this.material = new THREE.MeshBasicMaterial({
      color: solarFlare.colorHex,
      side: THREE.FrontSide,
      transparent: true,
    });
    const geometry = new THREE.SphereGeometry(size * 0.4, 24, 24);
    this.sphere = new THREE.Mesh(geometry, this.material);
    this.sphere.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: solarFlare.colorHex,
      linewidth: 2,
    });
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0),
      new THREE.Vector3(size, 0, 0),
      new THREE.Vector3(size, 0, -size),
      new THREE.Vector3(size, 0, -size),
      new THREE.Vector3(0, 0, -size),
      new THREE.Vector3(0, 0, -size),
      new THREE.Vector3(0, 0, 0),
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    this.outline = new THREE.LineSegments(lineGeometry, lineMaterial);
  }

  draw(scene: THREE.Scene, clockDelta: number, tickPercent: number, location: Location) {
    if (this.sphere.parent !== scene) {
      scene.add(this.sphere);
      scene.add(this.outline);
    }
    const { x, y } = location;
    this.sphere.visible = this.solarFlare.visible(tickPercent);
    this.material.opacity = this.solarFlare.opacity(tickPercent);
    this.material.color.lerp(new THREE.Color(this.solarFlare.colorHex), tickPercent);
    this.sphere.position.x = x + this.solarFlare.size / 2;
    this.sphere.position.y = 0;
    this.sphere.position.z = y - this.solarFlare.size / 2;

    this.outline.position.x = this.solarFlare.location.x;
    this.outline.position.y = -0.49;
    this.outline.position.z = this.solarFlare.location.y;
  }

  destroy(scene: THREE.Scene) {
    if (this.sphere.parent === scene) {
      scene.remove(this.sphere);
      scene.remove(this.outline);
    }
  }

  getWorldPosition(): THREE.Vector3 {
    return this.sphere.getWorldPosition(new THREE.Vector3());
  }

  async preload() {
    //
  }
}

export class SolarFlareTileModel implements Model {
  private path: THREE.Mesh;

  constructor(location: Location) {
    this.path = new THREE.Mesh(SOLAR_FLARE_PATH_GEOMETRY, SOLAR_FLARE_PATH_MATERIAL);
    this.path.rotation.x = -Math.PI / 2;
    this.path.position.set(location.x, GROUND_OVERLAY_Y, location.y + SOLAR_FLARE_PATH_SIZE - 1);
    this.path.renderOrder = GroundOverlayRenderOrder.MARKED_TILE - 1;
  }

  draw(scene: THREE.Scene) {
    if (this.path.parent !== scene) {
      scene.add(this.path);
    }
  }

  destroy(scene: THREE.Scene) {
    if (this.path.parent === scene) {
      scene.remove(this.path);
    }
  }

  getWorldPosition(): THREE.Vector3 {
    return this.path.getWorldPosition(new THREE.Vector3());
  }

  async preload() {
    //
  }
}
