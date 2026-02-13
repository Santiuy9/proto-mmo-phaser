export default class Interactions {
  constructor(scene) {
    this.scene = scene;

    this.currentTreeZone = null;
    this.currentStoneZone = null;

    this.setupOverlaps();
  }

  setupOverlaps() {
    const scene = this.scene;

    scene.physics.add.overlap(scene.player, scene.treeZones, (player, zone) => {
      this.currentTreeZone = zone;
    });

    scene.physics.add.overlap(
      scene.player,
      scene.stoneZones,
      (player, zone) => {
        this.currentStoneZone = zone;
      }
    );

    // Reset cada frame si ya no hay overlap
    scene.events.on("update", () => {
      this.currentTreeZone = null;
      this.currentStoneZone = null;

      scene.physics.overlap(scene.player, scene.treeZones, (player, zone) => {
        this.currentTreeZone = zone;
      });

      scene.physics.overlap(scene.player, scene.stoneZones, (player, zone) => {
        this.currentStoneZone = zone;
      });
    });
  }

  tryInteract(tool) {
    if (this.currentTreeZone) {
      const tree = this.currentTreeZone.getData("parent");

      if (!tree || tree.getData("isCut")) {
        this.currentTreeZone = null; // limpiar zona muerta
      } else {
        this.scene.resources.damageTree(tree, tool);
        return;
      }
    }

    if (this.currentStoneZone) {
      const stone = this.currentStoneZone.getData("parent");

      if (!stone || stone.getData("isMined")) {
        this.currentStoneZone = null;
      } else {
        this.scene.resources.damageStone(stone, tool);
        return;
      }
    }
  }
}
