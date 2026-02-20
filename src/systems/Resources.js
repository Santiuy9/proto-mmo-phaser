import Phaser from "../phaser.js";

export default class Resources {
  constructor(scene) {
    this.scene = scene;
    if (!this.scene.inventory) this.scene.inventory = { wood: 0, stone: 0 };
  }

  interact(player) {
    if (!player || !player.body) return;

    const playerBody = player.body;

    let nearestResource = null;
    let minDist = Infinity;
    let damageFn = null;

    const checkZones = (zonesGroup, fn) => {
      zonesGroup.getChildren().forEach((zone) => {
        if (!zone.body) return;

        const zb = zone.body;

        const overlapX =
          playerBody.x + playerBody.width > zb.x &&
          playerBody.x < zb.x + zb.width;
        const overlapY =
          playerBody.y + playerBody.height > zb.y &&
          playerBody.y < zb.y + zb.height;

        if (overlapX && overlapY) {
          const dx =
            playerBody.x + playerBody.width / 2 - (zb.x + zb.width / 2);
          const dy =
            playerBody.y + playerBody.height / 2 - (zb.y + zb.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist) {
            minDist = dist;
            nearestResource = zone.getData("parent");
            damageFn = fn;
          }
        }
      });
    };

    // Revisamos árboles
    checkZones(this.scene.treeZones, this.damageTree.bind(this));
    // Revisamos piedras
    checkZones(this.scene.stoneZones, this.damageStone.bind(this));

    // Solo golpeamos el recurso más cercano
    if (nearestResource && damageFn) {
      damageFn(nearestResource, player.scene.currentTool);
    }
  }

  damageResource(resource, tool, type) {
    if (!resource.active) return;

    const typeMap = {
      wood: {
        actionFlag: "isCutting",
        minedFlag: "isCut",
        zones: this.scene.treeZones,
        invKey: "wood",
        tint: 0xff9999,
        dropTexture: "wood",
      },
      stone: {
        actionFlag: "isMining",
        minedFlag: "isMined",
        zones: this.scene.stoneZones,
        invKey: "stone",
        tint: 0x99ddff,
        dropTexture: "stone",
      },
    };

    const props = typeMap[type];
    if (!props || this.scene[props.actionFlag]) return;

    this.scene[props.actionFlag] = true;

    const duration =
      this.scene.animationsSystem.playToolAnimation(tool.type) || 500;
    const damage = tool.power * this.getToolEffectiveness(tool.type, type);

    this.scene.time.delayedCall(duration / 2, () => {
      if (!resource.active) return;

      resource.setTint(props.tint);
      this.scene.time.delayedCall(100, () => resource.clearTint());

      let hp = resource.getData("hp") - damage;
      resource.setData("hp", hp);

      // 🔥 APLICAR DURABILIDAD A LA HERRAMIENTA USANDO COMBAT SYSTEM
      if (this.scene.combat) {
        console.log("🔨 Aplicando durabilidad por golpe a recurso:", tool.type);
        this.scene.combat.applyToolDurability(tool);
      } else {
        // Fallback al método antiguo si no existe combat system
        this.applyToolDamage(tool, 1);
      }

      if (hp <= 0) {
        resource.setData(props.minedFlag, true);

        if (resource.interactZone) {
          props.zones.remove(resource.interactZone, true, true);
          resource.interactZone.destroy();
        }

        const dropCount = type === "wood" ? 2 : 2;

        for (let i = 0; i < dropCount; i++) {
          this.createDrop(resource.x, resource.y, type);
        }

        resource.disableBody(true, true);
        resource.destroy();
      }
    });

    this.scene.time.delayedCall(duration, () => {
      this.scene[props.actionFlag] = false;
    });
  }

  // Añade este nuevo método a Resources.js:
  createDrop(x, y, type) {
    // Determinar la textura según el tipo
    let texture;
    switch (type) {
      case "wood":
        texture = "wood";
        break;
      case "stone":
        texture = "stone";
        break;
      case "meat":
        texture = "Meat";
        break;
      default:
        return;
    }

    // Crear el drop
    const drop = this.scene.physics.add.sprite(
      x + Phaser.Math.Between(-20, 20),
      y + Phaser.Math.Between(-20, 20),
      texture
    );

    drop.setDepth(drop.y);
    drop.body.setAllowGravity(false);
    drop.body.setImmovable(true);
    drop.setData("type", type);

    // Animación de aparición
    drop.setScale(0);
    this.scene.tweens.add({
      targets: drop,
      scale: 1,
      duration: 300,
      ease: "BackOut",
    });

    // 🔥 Asegurar que se agrega al grupo correcto
    if (this.scene.dropsGroup) {
      this.scene.dropsGroup.add(drop);
    }
  }

  damageTree(tree, tool) {
    this.damageResource(tree, tool, "wood");
  }
  damageStone(stone, tool) {
    this.damageResource(stone, tool, "stone");
  }

  getToolEffectiveness(toolType, resourceType) {
    if (toolType === "hand") return 1;
    if (toolType === "axe" && resourceType === "wood") return 1.5;
    if (toolType === "pickaxe" && resourceType === "stone") return 1.5;
    return 0.5;
  }

  applyToolDamage(tool, amount = 1) {
    if (tool.durability === Infinity) return;

    // 🔥 Usar CombatSystem si existe
    if (this.scene.combat) {
      this.scene.combat.applyToolDurability(tool);
      return;
    }

    // Fallback al método antiguo
    tool.durability -= amount;
    if (tool.durability < 0) tool.durability = 0;

    if (this.scene.ui) {
      this.scene.ui.updateToolDurability(tool);
    }

    if (tool.durability === 0) {
      this.breakTool(tool);
    }
  }

  breakTool(tool) {
    this.scene.ui.showMessage("💥 Herramienta rota!");
    const index = this.scene.tools.findIndex((t) => t === tool);
    if (index !== -1) this.scene.tools[index] = null;
    this.scene.ui.updateTools(this.scene.tools, -1);

    this.scene.currentTool = {
      key: "hand",
      power: 1,
      durability: Infinity,
      maxDurability: Infinity,
      type: "hand",
    };
    this.scene.ui.updateToolDurability(this.scene.currentTool);
  }
}
