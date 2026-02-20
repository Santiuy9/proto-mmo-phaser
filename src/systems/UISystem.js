import Phaser from "../phaser.js";

export default class UISystem {
  constructor(scene) {
    this.scene = scene;
    this.craftOpen = false;
    this.selectedRecipeIndex = 0;

    // 🔥 NUEVO: Sistema de mensajes modales
    this.messageActive = false;
    this.messageBox = null;
    this.messageText = null;
    this.pendingAction = null;
  }

  create() {
    const padding = 20;
    this.screenWidth = this.scene.scale.width;
    this.screenHeight = this.scene.scale.height;

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

    this.createStatsBars();
  }

  updateStats(stats) {
    this.updateHealthBar(stats.health, stats.maxHealth);
    this.updateHungerBar(stats.hunger, stats.maxHunger);
  }

  // ===== Menú de crafteo =====
  toggleCraftMenu() {
    this.craftOpen = !this.craftOpen;
    this.craftMenuText.setVisible(this.craftOpen);

    if (this.craftOpen) {
      // 🔥 Notificar a la escena que el crafteo se abrió
      if (this.scene.onMenuOpen) {
        this.scene.onMenuOpen("craft");
      }

      this.selectedRecipeIndex = 0;
      this.refreshCraftMenu();
    }
  }

  refreshCraftMenu() {
    const craftSystem = this.scene.crafting;
    if (!craftSystem) return;

    let text = "🛠 CRAFTEO\n\n";

    craftSystem.recipes.forEach((r, i) => {
      const canCraft = craftSystem.canCraft(r);
      const pointer = i === this.selectedRecipeIndex ? "👉 " : "   ";

      const woodHave = craftSystem.countMaterial("wood");
      const stoneHave = craftSystem.countMaterial("stone");

      text += `${pointer}${r.name}\n`;

      if (r.materials.wood) {
        const woodNeeded = r.materials.wood;
        const woodColor = woodHave >= woodNeeded ? "🟢" : "🔴";
        text += `     ${woodColor} 🪵 ${woodNeeded} (${woodHave})\n`;
      }
      if (r.materials.stone) {
        const stoneNeeded = r.materials.stone;
        const stoneColor = stoneHave >= stoneNeeded ? "🟢" : "🔴";
        text += `     ${stoneColor} 🪨 ${stoneNeeded} (${stoneHave})\n`;
      }

      if (!canCraft) {
        text += `     ⚠️ INSUFICIENTE\n`;
      }
    });

    text += "\n⬆⬇ elegir   ⚡E crear";
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

  // En UISystem.js, modificar craftSelected:

  craftSelected() {
    const recipe = this.recipes[this.selectedRecipeIndex];
    if (!recipe) return;

    const craftSystem = this.scene.crafting;
    if (!craftSystem) return;

    // Verificar si se puede craftear
    if (!craftSystem.canCraft(recipe)) {
      this.showModalMessage(`❌ Faltan materiales`, false);
      return;
    }

    // Verificar espacio en inventario
    const emptySlot = craftSystem.findEmptySlot();
    if (emptySlot === -1) {
      this.showModalMessage("❌ Inventario lleno", false);
      return;
    }

    // Consumir materiales y crear herramienta
    craftSystem.consumeMaterials(recipe.materials);
    this.scene.inventorySystem.addItem(recipe.key, 1);

    // Mensaje SIMPLE y ELEGANTE
    this.showModalMessage(`✨ ${recipe.name}`, true);

    // Actualizar UI
    this.refreshCraftMenu();
    if (this.scene.inventorySystem) {
      this.scene.inventorySystem.update();
    }
  }

  // ===== Mensajes temporales =====

  // En UISystem.js, reemplazar showModalMessage:

  showModalMessage(msg, isSuccess = true, onComplete = null) {
    if (this.messageActive) return;

    this.messageActive = true;

    // Bloquear input del juego
    this.scene.input.keyboard.enabled = false;

    const wasCraftOpen = this.craftOpen;
    if (wasCraftOpen) {
      this.craftMenuText.setVisible(false);
    }

    // Overlay semitransparente
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.5
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(10001);

    // Caja del mensaje
    const boxX = this.scene.cameras.main.width / 2;
    const boxY = this.scene.cameras.main.height / 2 - 50;

    const messageBox = this.scene.add.rectangle(
      boxX,
      boxY,
      450,
      140, // Un poco más alta para el mensaje extra
      0x000000,
      0.9
    );
    messageBox.setStrokeStyle(2, isSuccess ? 0x44ff44 : 0xff4444);
    messageBox.setScrollFactor(0);
    messageBox.setDepth(10002);

    // Mensaje principal
    const messageText = this.scene.add
      .text(boxX, boxY - 15, msg, {
        fontSize: "22px",
        color: isSuccess ? "#88ff88" : "#ff8888",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    messageText.setScrollFactor(0);
    messageText.setDepth(10003);

    // 🔥 NUEVO: Mensaje de instrucción (más pequeño y sutil)
    const instructionText = this.scene.add
      .text(boxX, boxY + 30, "Presiona E para cerrar", {
        fontSize: "16px",
        color: "#aaaaaa",
        fontStyle: "italic",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);
    instructionText.setScrollFactor(0);
    instructionText.setDepth(10003);

    // Guardar referencias
    this.messageBox = {
      overlay,
      messageBox,
      messageText,
      instructionText,
    };

    // Animación de entrada
    messageBox.setScale(0);
    messageText.setScale(0);
    instructionText.setScale(0);

    this.scene.tweens.add({
      targets: [messageBox, messageText, instructionText],
      scale: 1,
      duration: 200,
      ease: "BackOut",
    });

    // 🔥 MANEJADOR DE TECLA E
    const keyHandler = (event) => {
      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        event.stopPropagation();
        this.closeModalMessage(wasCraftOpen, onComplete);
        window.removeEventListener("keydown", keyHandler);
      }
    };

    window.addEventListener("keydown", keyHandler);
    this.messageKeyHandler = keyHandler;

    // Auto-cierre después de 3 segundos
    this.modalTimer = this.scene.time.delayedCall(3000, () => {
      if (this.messageActive) {
        window.removeEventListener("keydown", keyHandler);
        this.closeModalMessage(wasCraftOpen, onComplete);
      }
    });
  }

  closeModalMessage(restoreCraftMenu, onComplete) {
    if (!this.messageActive) return;

    // 🔥 Limpiar timer y handler
    if (this.modalTimer) {
      this.modalTimer.remove();
      this.modalTimer = null;
    }

    if (this.messageKeyHandler) {
      window.removeEventListener("keydown", this.messageKeyHandler);
      this.messageKeyHandler = null;
    }

    // Restaurar input
    this.scene.input.keyboard.enabled = true;

    if (this.messageBox) {
      // Animación de salida
      this.scene.tweens.add({
        targets: [
          this.messageBox.overlay,
          this.messageBox.messageBox,
          this.messageBox.messageText,
          this.messageBox.instructionText,
        ],
        alpha: 0,
        y: "-=30",
        duration: 200,
        onComplete: () => {
          if (this.messageBox) {
            this.messageBox.overlay.destroy();
            this.messageBox.messageBox.destroy();
            this.messageBox.messageText.destroy();
            if (this.messageBox.instructionText) {
              this.messageBox.instructionText.destroy();
            }
          }
          this.messageBox = null;
          this.messageActive = false;

          // Restaurar menú de crafteo
          if (restoreCraftMenu) {
            this.scene.time.delayedCall(100, () => {
              this.craftMenuText.setVisible(true);
              this.refreshCraftMenu();
            });
          }

          if (onComplete) onComplete();
        },
      });
    }
  }

  createStatsBars() {
    const width = 200;
    const height = 16;
    const uiDepth = 10000;

    // Fondo vida
    this.healthBarBg = this.scene.add
      .rectangle(20, 20, width, height, 0x000000)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    // Vida
    this.healthBar = this.scene.add
      .rectangle(20, 20, width, height, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(uiDepth + 1);

    // Fondo hambre
    this.hungerBarBg = this.scene.add
      .rectangle(20, 45, width, height, 0x000000)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(uiDepth);

    // Hambre
    this.hungerBar = this.scene.add
      .rectangle(20, 45, width, height, 0xffa500)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(uiDepth + 1);

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
