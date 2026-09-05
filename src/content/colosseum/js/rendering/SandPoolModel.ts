import * as THREE from "three";

import { Model, Location } from "osrs-sdk";

import { SolSandPool } from "../entities/SolSandPool";

const BEAM_HEIGHT = 5;
const BAND_COUNT = 4;
const BAND_OPACITIES = [1, 0.75, 0.5, 0.3];

export class SandPoolModel implements Model {
  static forSandPool(r: SolSandPool) {
    return new SandPoolModel(r);
  }

  private readonly bands: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }[];
  private readonly color: THREE.Color;

  constructor(private sandPool: SolSandPool, onTop = true) {
    const { size } = sandPool;
    this.color = new THREE.Color(sandPool.colorHex);
    this.bands = Array.from({ length: BAND_COUNT }, (_, index) => {
      const innerRadius = (size / 2) * index / BAND_COUNT;
      const outerRadius = (size / 2) * (index + 1) / BAND_COUNT;
      const material = new THREE.MeshBasicMaterial({
        color: this.color,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
        opacity: BAND_OPACITIES[index],
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 32), material);
      mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      mesh.renderOrder = index;
      return { mesh, material };
    });
  }

  draw(scene: THREE.Scene, clockDelta: number, tickPercent: number, location: Location) {
    if (this.bands[0].mesh.parent !== scene) {
      this.bands.forEach(({ mesh }) => scene.add(mesh));
    }
    const { x, y } = location;
    const visible = this.sandPool.visible(tickPercent);
    const opacity = this.sandPool.opacity(tickPercent);
    this.color.lerp(new THREE.Color(this.sandPool.colorHex), tickPercent);
    this.bands.forEach(({ mesh, material }, index) => {
      mesh.visible = visible;
      material.color.copy(this.color);
      material.opacity = opacity * BAND_OPACITIES[index];
      mesh.position.x = x + this.sandPool.size / 2;
      mesh.position.y = -0.49;
      mesh.position.z = y - this.sandPool.size / 2;
    });
  }

  destroy(scene: THREE.Scene) {
    this.bands.forEach(({ mesh }) => {
      if (mesh.parent === scene) scene.remove(mesh);
    });
  }

  getWorldPosition(): THREE.Vector3 {
    return this.bands[0].mesh.getWorldPosition(new THREE.Vector3());
  }

  async preload() {
    // do nothing
    return;
  }
}
