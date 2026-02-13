// systems/CombatSystem.js
export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  attack(target, attacker, tool) {
    if (!target || !target.active || !tool) return false;

    var damage = this.calculateDamage(tool, target.type);
    target.takeDamage(damage, attacker);

    this.applyToolDurability(tool);
    this.showDamageNumber(target, damage);

    return true;
  }

  calculateDamage(tool, targetType) {
    var baseDamage = tool.power || 1;
    var effectiveness = this.getEffectiveness(tool.type, targetType);
    return Math.floor(baseDamage * effectiveness);
  }

  getEffectiveness(toolType, targetType) {
    const matrix = {
      axe: { wood: 1.5, stone: 0.5, sheep: 0.8 },
      pickaxe: { wood: 0.5, stone: 1.5, sheep: 0.6 },
      sword: { wood: 0.3, stone: 0.3, sheep: 1.2 },
      hand: { wood: 0.5, stone: 0.3, sheep: 0.3 },
    };

    // CORREGIDO: Sin operador ?.
    var tool = matrix[toolType];
    if (tool && tool.hasOwnProperty(targetType)) {
      return tool[targetType];
    }

    return 1;
  }

  applyToolDurability(tool) {
    if (!tool) return;
    if (tool.durability === Infinity) return;

    tool.durability -= 1;
    this.scene.ui.updateToolDurability(tool);

    if (tool.durability <= 0) {
      this.breakTool(tool);
    }
  }

  breakTool(tool) {
    if (!tool) return;

    this.scene.ui.showMessage("💥 Herramienta rota!");

    var index = -1;
    if (this.scene.tools) {
      index = this.scene.tools.findIndex(function (t) {
        return t === tool;
      });
    }

    if (index !== -1) {
      this.scene.tools[index] = null;
    }

    // Restaurar mano
    this.scene.currentTool = {
      key: "hand",
      type: "hand",
      power: 1,
      durability: Infinity,
      maxDurability: Infinity,
    };

    this.scene.ui.updateTools(this.scene.tools, -1);
    this.scene.ui.updateToolDurability(this.scene.currentTool);
  }

  showDamageNumber(target, damage) {
    if (!target) return;

    var text = this.scene.add.text(target.x, target.y - 30, "-" + damage, {
      fontSize: "18px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 3,
      fontStyle: "bold",
    });

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 600,
      onComplete: function () {
        text.destroy();
      },
    });
  }
}
