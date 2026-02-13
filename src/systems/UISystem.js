import * as Phaser from "phaser";

export default class UISystem {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const padding = 20;
    this.screenWidth = this.scene.scale.width;
    this.screenHeight = this.scene.scale.height;

    // ===== HUD recursos =====
    this.hudText = this.scene.add
      .text(this.screenWidth - padding, padding, "", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.hudText.setStyle({
      align: "left",
      lineSpacing: 6,
    });

    // ===== Inventario =====
    this.inventoryOpen = false;
    this.inventoryText = this.scene.add
      .text(400, 300, "", {
        fontSize: "22px",
        fill: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 12, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    // ===== Menú de crafteo =====
    this.craftOpen = false;
    this.selectedRecipeIndex = 0;

    this.craftMenuText = this.scene.add
      .text(400, 200, "", {
        fontSize: "22px",
        fill: "#00ff88",
        backgroundColor: "#000000",
        padding: { x: 16, y: 16 },
        align: "left",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.recipes = [
      {
        name: "Hacha de piedra",
        key: "stoneAxe",
        wood: 1,
        stone: 2,
        type: "axe",
      },
      {
        name: "Pico de piedra",
        key: "stonePickaxe",
        wood: 1,
        stone: 2,
        type: "pickaxe",
      },
      {
        name: "Espada de piedra",
        key: "stoneSword",
        wood: 2,
        stone: 1,
        type: "sword",
      },
    ];

    // ===== Slots de herramientas =====
    this.toolSlots = [];
    const icons = ["Tool_Axe", "Tool_Pickaxe", "Tool_Sword"];

    for (let i = 0; i < 3; i++) {
      const slotBg = this.scene.add
        .rectangle(20 + i * 60, 70, 50, 50, 0x000000, 0.5)
        .setOrigin(0)
        .setScrollFactor(0)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(10000);

      const icon = this.scene.add
        .image(45 + i * 60, 95, icons[i])
        .setDisplaySize(32, 32)
        .setScrollFactor(0)
        .setDepth(10001)
        .setVisible(false);

      this.toolSlots.push({ bg: slotBg, icon });
    }

    // ===== Barras de durabilidad =====
    this.durabilityBars = [];
    for (let i = 0; i < 3; i++) {
      const bg = this.scene.add
        .rectangle(20 + i * 60, 125, 50, 6, 0x222222)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(9999);

      const bar = this.scene.add
        .rectangle(20 + i * 60, 125, 50, 6, 0x00ff00)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(10000);

      this.durabilityBars.push({ bg, bar });
    }

    this.createStatsBars();
  }

  // ===== Actualizar HUD de recursos =====
  updateInventory(wood, stone, meat = 0) {
    this.hudText.setText(
      `🪵 Wood:  ${wood}\n🪨 Stone: ${stone}\n🥩 Meat:  ${meat}`
    );
  }

  updateStats(stats) {
    this.updateHealthBar(stats.health, stats.maxHealth);
    this.updateHungerBar(stats.hunger, stats.maxHunger);
  }

  // ===== Actualizar slots de herramientas =====
  updateTools(tools, selectedIndex) {
    const iconMap = {
      stoneAxe: "Tool_Axe",
      stonePickaxe: "Tool_Pickaxe",
      stoneSword: "Tool_Sword",
    };

    this.toolSlots.forEach((slot, i) => {
      const tool = tools[i];

      if (tool) {
        slot.icon.setTexture(iconMap[tool.key]);
        slot.icon.setVisible(true);
        this.durabilityBars[i].bg.setVisible(true);
        this.durabilityBars[i].bar.setVisible(true);
      } else {
        slot.icon.setVisible(false);
        this.durabilityBars[i].bg.setVisible(false);
        this.durabilityBars[i].bar.setVisible(false);
      }

      slot.bg.setStrokeStyle(
        i === selectedIndex ? 3 : 2,
        i === selectedIndex ? 0xffff00 : 0xffffff
      );
    });
  }

  updateToolDurability(tool) {
    if (!tool || tool.durability === Infinity) return;

    const index = this.scene.tools.findIndex((t) => t === tool);
    if (index === -1) return;

    const percent = tool.durability / tool.maxDurability;
    const barObj = this.durabilityBars[index];

    barObj.bar.width = 50 * percent;

    if (percent > 0.6) barObj.bar.fillColor = 0x00ff00;
    else if (percent > 0.3) barObj.bar.fillColor = 0xffff00;
    else barObj.bar.fillColor = 0xff0000;
  }

  // ===== Inventario =====
  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryText.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventoryText();
  }

  refreshInventoryText() {
    const inv = this.scene.inventory;
    const tools = this.scene.tools;

    let text = "🎒 INVENTARIO\n\n";
    text += `🪵 Madera: ${inv.wood}\n`;
    text += `🪨 Piedra: ${inv.stone}\n\n`;

    tools.forEach((tool, i) => {
      if (!tool) text += `Slot ${i + 1}: Vacío\n`;
      else {
        const names = {
          stoneAxe: "Hacha de piedra",
          stonePickaxe: "Pico de piedra",
          stoneSword: "Espada de piedra",
        };
        text += `Slot ${i + 1}: ${names[tool.key] || tool.key}\n`;
      }
    });

    text += "\n(1–2–3 para equipar)";
    this.inventoryText.setText(text);
  }

  // ===== Menú de crafteo =====
  toggleCraftMenu() {
    this.craftOpen = !this.craftOpen;
    this.craftMenuText.setVisible(this.craftOpen);

    if (this.craftOpen) {
      this.selectedRecipeIndex = 0;
      this.refreshCraftMenu();
    }
  }

  refreshCraftMenu() {
    const inv = this.scene.inventory;

    let text = "🛠 CRAFTEO\n\n";
    this.recipes.forEach((r, i) => {
      const canCraft = inv.wood >= r.wood && inv.stone >= r.stone;
      const pointer = i === this.selectedRecipeIndex ? "👉 " : "   ";
      text += `${pointer}${r.name} (${r.wood}🪵 ${r.stone}🪨) ${
        canCraft ? "" : "❌"
      }\n`;
    });

    text += "\n⬆⬇ elegir   E crear";
    this.craftMenuText.setText(text);
  }

  updateCraftingInput(cursors) {
    if (!this.craftOpen) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
      this.selectedRecipeIndex =
        (this.selectedRecipeIndex - 1 + this.recipes.length) %
        this.recipes.length;
      this.refreshCraftMenu();
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.down)) {
      this.selectedRecipeIndex =
        (this.selectedRecipeIndex + 1) % this.recipes.length;
      this.refreshCraftMenu();
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.interact)) {
      this.craftSelected();
    }
  }

  craftSelected() {
    const inv = this.scene.inventory;
    const recipe = this.recipes[this.selectedRecipeIndex];

    // 🔹 Verificar materiales
    if (inv.wood < recipe.wood || inv.stone < recipe.stone) {
      return this.showMessage("❌ Faltan materiales");
    }

    // 🔹 Verificar slot vacío
    const emptyIndex = this.scene.tools.findIndex((t) => t === null);
    if (emptyIndex === -1) return this.showMessage("🎒 Inventario lleno");

    // 🔹 Obtener stats de la herramienta
    const stats = this.scene.toolStats[recipe.key];

    if (!stats) return this.showMessage("❌ Error: herramienta no encontrada");

    // 🔹 Crear herramienta
    const newTool = {
      key: recipe.key,
      type: stats.type,
      power: stats.power,
      durability: stats.maxDurability,
      maxDurability: stats.maxDurability,
    };

    this.scene.tools[emptyIndex] = newTool;
    this.scene.currentTool = newTool;

    inv.wood -= recipe.wood;
    inv.stone -= recipe.stone;

    this.updateInventory(inv.wood, inv.stone);
    this.updateTools(this.scene.tools, emptyIndex);
    this.updateToolDurability(newTool);

    this.refreshCraftMenu();
    this.showMessage("🛠 Creado!");
  }

  // ===== Mensajes temporales =====
  showMessage(msg) {
    this.craftMenuText.setText(msg);
    this.scene.time.delayedCall(1000, () => {
      if (this.craftOpen) this.refreshCraftMenu();
    });
  }

  createStatsBars() {
    const width = 200;
    const height = 16;

    // Fondo vida
    this.healthBarBg = this.scene.add
      .rectangle(20, 20, width, height, 0x000000)
      .setOrigin(0)
      .setScrollFactor(0);

    // Vida
    this.healthBar = this.scene.add
      .rectangle(20, 20, width, height, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0);

    // Fondo hambre
    this.hungerBarBg = this.scene.add
      .rectangle(20, 45, width, height, 0x000000)
      .setOrigin(0)
      .setScrollFactor(0);

    // Hambre
    this.hungerBar = this.scene.add
      .rectangle(20, 45, width, height, 0xffa500)
      .setOrigin(0)
      .setScrollFactor(0);

    this.statsBarWidth = width;
  }

  updateHealthBar(current, max) {
    const percentage = Phaser.Math.Clamp(current / max, 0, 1);
    this.healthBar.width = this.statsBarWidth * percentage;
  }

  updateHungerBar(current, max) {
    const percentage = Phaser.Math.Clamp(current / max, 0, 1);
    this.hungerBar.width = this.statsBarWidth * percentage;
  }
}
