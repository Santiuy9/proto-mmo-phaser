// systems/CombatSystem.js
export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  attack(target, attacker, tool) {
    if (!target || !target.active || !tool) {
      console.log("❌ Attack falló: target o tool inválido");
      return false;
    }

    console.log("⚔️ Atacando con herramienta:", tool);

    // Calcular daño
    const damage = this.calculateDamage(tool, target.type);
    console.log("   Daño calculado:", damage);

    // Aplicar daño al objetivo
    target.takeDamage(damage, attacker);

    // 🔥 APLICAR DURABILIDAD - ESTA LÍNEA ES CRÍTICA
    this.applyToolDurability(tool);

    // Mostrar número de daño
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
    console.log("🔧 applyToolDurability - tool:", tool);

    if (!tool) {
      console.log("  ❌ No hay tool");
      return;
    }

    if (tool.durability === Infinity) {
      console.log("  ∞ Durabilidad infinita, no se reduce");
      return;
    }

    const inventory = this.scene.inventorySystem;
    if (!inventory) {
      console.log("  ❌ No hay inventory");
      return;
    }

    // Buscar el item en el inventario por ID
    let itemEncontrado = null;
    let slotEncontrado = -1;

    for (let i = 0; i < inventory.items.length; i++) {
      if (inventory.items[i] && inventory.items[i].id === tool.itemId) {
        itemEncontrado = inventory.items[i];
        slotEncontrado = i;
        break;
      }
    }

    if (!itemEncontrado) {
      console.log("  ❌ No se encontró el item con ID:", tool.itemId);
      return;
    }

    console.log("  Item encontrado en slot:", slotEncontrado);
    console.log("  ANTES - durabilidad:", itemEncontrado.durability);

    // Reducir durabilidad
    itemEncontrado.durability -= 1;

    console.log("  DESPUÉS - durabilidad:", itemEncontrado.durability);

    // Actualizar tool
    tool.durability = itemEncontrado.durability;

    // Si se rompe
    if (itemEncontrado.durability <= 0) {
      console.log("  💥 HERRAMIENTA ROTA");

      // 🔥 SOLUCIÓN: Usar el método del inventory en lugar de Item directamente
      if (inventory.removeItem) {
        inventory.removeItem(slotEncontrado, 1);
      } else {
        // Fallback manual
        inventory.items[slotEncontrado] = {
          id: null,
          type: null,
          count: 0,
          maxStack: 64,
          durability: null,
          maxDurability: null,
        };
      }

      this.scene.currentTool = {
        key: "hand",
        type: "hand",
        power: 1,
        durability: Infinity,
        maxDurability: Infinity,
        itemId: null,
      };

      this.scene.ui.showModalMessage("💥 ¡Herramienta rota!", false);
    }

    // Forzar actualizaciones
    if (this.scene.hotbar) {
      console.log("  🔄 Actualizando hotbar");
      this.scene.hotbar.update();
    }

    inventory.update();
  }

  breakTool(tool, slotIndex) {
    this.scene.ui.showModalMessage("💥 ¡Herramienta rota!", false);

    // Eliminar el item del inventario
    const inventory = this.scene.inventorySystem;
    if (inventory && slotIndex !== undefined) {
      inventory.items[slotIndex] = Item.empty();
      inventory.update();
    }

    // Restaurar mano
    this.scene.currentTool = { ...this.scene.HAND_TOOL };

    if (this.scene.hotbar) {
      this.scene.hotbar.update();
    }
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
