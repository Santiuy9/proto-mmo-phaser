import * as Phaser from "phaser";

// CONFIGURACIÓN
const INVENTORY_CONFIG = {
  SLOT_SIZE: 50,
  PADDING: 5,
  DEFAULT_POSITION: { x: 400, y: 300 },
  MAX_STACK: 64,
  HOTBAR_MAX: 9,
  // 🔥 NUEVO: Ancho fijo del inventario
  FIXED_WIDTH: 600, // Puedes ajustar este valor
  COLORS: {
    SLOT_NORMAL: 0x333333,
    SLOT_BORDER: 0x666666,
    SELECTOR: 0xffaa00,
    BACKPACK_BORDER: 0xffaa00,
    BACKGROUND: 0x222222,
    BACKGROUND_STROKE: 0x888888,
  },
};

const INVENTORY_TIERS = {
  1: { rows: 2, columns: 3, name: "Básico", slots: 6 },
  2: { rows: 3, columns: 4, name: "Pequeña", slots: 12 },
  3: { rows: 4, columns: 5, name: "Mediana", slots: 20 },
  4: { rows: 5, columns: 6, name: "Grande", slots: 30 },
  5: { rows: 6, columns: 7, name: "Épica", slots: 42 },
};

// CLASE ITEM
class Item {
  constructor(
    type,
    count = 1,
    maxStack = INVENTORY_CONFIG.MAX_STACK,
    durability = null
  ) {
    this.id = this.generateId();
    this.type = type;
    this.count = count;
    this.maxStack = maxStack;

    console.log("🆕 Creando item:", { type, count, durability });

    if (this.isTool()) {
      this.durability =
        durability !== null ? durability : this.getMaxDurability();
      this.maxDurability = this.getMaxDurability();
    } else {
      this.durability = null;
      this.maxDurability = null;
    }
  }

  static empty() {
    return new Item(null, 0);
  }

  generateId() {
    return "item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  isTool() {
    const tools = [
      "stoneAxe",
      "stonePickaxe",
      "stoneSword",
      "axe",
      "pickaxe",
      "sword",
    ];
    return tools.includes(this.type);
  }

  getMaxDurability() {
    const durabilityMap = {
      stoneAxe: 20,
      stonePickaxe: 20,
      stoneSword: 30,
      axe: 20,
      pickaxe: 20,
      sword: 30,
    };
    return durabilityMap[this.type] || Infinity;
  }

  clone() {
    return new Item(this.type, this.count, this.maxStack, this.durability);
  }

  isEmpty() {
    return !this.type || this.count <= 0;
  }

  canStackWith(other) {
    return (
      other &&
      other.type === this.type &&
      this.count < this.maxStack &&
      other.type !== null
    );
  }

  add(amount) {
    const canAdd = Math.min(amount, this.maxStack - this.count);
    this.count += canAdd;
    return canAdd;
  }

  remove(amount) {
    const canRemove = Math.min(amount, this.count);
    this.count -= canRemove;
    return canRemove;
  }

  reduceDurability(amount = 1) {
    if (this.durability === null || this.durability === Infinity) return true;

    this.durability -= amount;

    if (this.durability <= 0) {
      this.durability = 0;
      return false;
    }
    return true;
  }

  getDurabilityPercent() {
    if (this.durability === null || this.durability === undefined) return 1;
    if (this.maxDurability === null || this.maxDurability === undefined)
      return 1;
    if (this.durability === Infinity) return 1;

    return this.durability / this.maxDurability;
  }
}

// CLASE PRINCIPAL INVENTORYSYSTEM
export default class InventorySystem {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;

    // Configuración visual
    this.slotSize = INVENTORY_CONFIG.SLOT_SIZE;
    this.padding = INVENTORY_CONFIG.PADDING;
    this.inventoryX = INVENTORY_CONFIG.DEFAULT_POSITION.x;
    this.inventoryY = INVENTORY_CONFIG.DEFAULT_POSITION.y;

    // Slot de mochila
    this.backpackSlot = {
      equipped: null,
      tier: 1,
    };
    this.backpackSlotIndex = -1;

    // Configuración de niveles
    this.inventoryTiers = INVENTORY_TIERS;
    this.currentTier = 1;
    this.updateTierConfig();

    // Items del inventario
    this.items = [];
    this.hotbar = [];
    this.selectedHotbarSlot = 0;

    // Sistema de selección
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.selectedSlotIndex = -1;
    this.cursorItem = null;

    // Elementos visuales
    this.container = null;
    this.slots = [];
    this.tierText = null;

    // Inicializar
    this.initInventory();

    // Sprites del cursor
    this.cursorItemSprite = null;
    this.cursorCountText = null;

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.update = this.update.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.upgradeTier = this.upgradeTier.bind(this);
    this.resetCursor = this.resetCursor.bind(this);
    this.findEmptySlot = this.findEmptySlot.bind(this);
    this.isBackpack = this.isBackpack.bind(this);
  }

  // ============================================
  // MÉTODOS DE CONFIGURACIÓN
  // ============================================
  updateTierConfig() {
    const tier = this.inventoryTiers[this.currentTier];
    this.rows = tier.rows;
    this.columns = tier.columns;
    this.totalSlots = tier.slots;
    this.tierName = tier.name;
    this.hotbarSize = this.columns;
  }

  initInventory() {
    this.items = [];
    for (let i = 0; i < this.totalSlots; i++) {
      this.items[i] = Item.empty();
    }
    this.updateHotbar();
  }

  updateHotbar() {
    this.hotbar = [];
    for (let i = 0; i < this.hotbarSize; i++) {
      this.hotbar[i] = this.items[i];
    }
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================
  resetCursor() {
    this.cursorItem = null;
    if (this.cursorItemSprite) {
      this.cursorItemSprite.setVisible(false);
    }
    if (this.cursorCountText) {
      this.cursorCountText.setVisible(false);
      this.cursorCountText.setText("");
    }
  }

  findEmptySlot() {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].isEmpty()) {
        return i;
      }
    }
    return -1;
  }

  isBackpack(item) {
    return item && item.type && item.type.startsWith("backpack_tier");
  }

  updateCursorVisual() {
    if (this.cursorItemSprite && this.cursorCountText && this.cursorItem) {
      this.cursorItemSprite.setTexture(
        this.getItemTexture(this.cursorItem.type)
      );
      this.cursorCountText.setText(this.cursorItem.count.toString());
    }
  }

  // SISTEMA DE MOCHILAS
  equipBackpack(backpackItem) {
    if (!backpackItem || !backpackItem.type) return false;

    const tierMatch = backpackItem.type.match(/backpack_tier(\d+)/);
    if (!tierMatch) return false;

    const tier = parseInt(tierMatch[1]);
    if (!tier || !this.inventoryTiers[tier]) return false;

    this.backpackSlot.equipped = {
      type: backpackItem.type,
      count: 1,
      tier: tier,
    };
    this.backpackSlot.tier = tier;

    const wasOpen = this.isOpen;
    this.upgradeToTier(tier);

    if (wasOpen) {
      this.isOpen = true;
      this.container.setVisible(true);
    }

    return true;
  }

  unequipBackpack() {
    console.log(
      "🎒 Desequipando mochila - Espacios actuales:",
      this.totalSlots
    );

    // Guardar items que están en slots que desaparecerán
    const nextTierConfig = this.inventoryTiers[1]; // Nivel básico (2x5 = 10 slots)
    const slotsQueDesaparecen = this.totalSlots - nextTierConfig.slots;

    console.log(`   Slots que desaparecen: ${slotsQueDesaparecen}`);

    if (slotsQueDesaparecen > 0) {
      // Recoger items de los slots que van a desaparecer (los últimos)
      const itemsAPerder = [];
      for (let i = nextTierConfig.slots; i < this.totalSlots; i++) {
        const item = this.items[i];
        if (!item.isEmpty()) {
          console.log(`   Item en slot ${i} se perderá:`, item.type);
          itemsAPerder.push({
            item: item.clone(),
            index: i,
          });
        }
      }

      // Soltar items al suelo
      if (itemsAPerder.length > 0) {
        console.log(`   Soltando ${itemsAPerder.length} items al suelo`);
        this.dropItemsToWorld(itemsAPerder);
      }
    }

    // Buscar slot vacío en el inventario básico para la mochila
    const emptySlot = this.findEmptySlotInRange(0, nextTierConfig.slots - 1);

    if (emptySlot !== -1) {
      // Devolver la mochila al inventario
      this.items[emptySlot] = new Item(this.backpackSlot.equipped.type, 1);
      this.backpackSlot.equipped = null;
      this.backpackSlot.tier = 1;

      // Volver al nivel básico
      this.upgradeToTier(1);

      this.scene.ui.showModalMessage("📦 Mochila desequipada", true);
      return true;
    } else {
      // No hay espacio para la mochila, la soltamos al suelo
      console.log("   No hay espacio para la mochila, se soltará al suelo");
      this.dropItemToWorld(
        this.backpackSlot.equipped.type,
        this.scene.player.x,
        this.scene.player.y
      );

      this.backpackSlot.equipped = null;
      this.backpackSlot.tier = 1;
      this.upgradeToTier(1);

      this.scene.ui.showModalMessage("📦 Mochila soltada al suelo", true);
      return true;
    }
  }

  dropItemsToWorld(items) {
    items.forEach((itemData) => {
      const item = itemData.item;

      // Crear UN drop que contenga TODOS los items
      this.createStackedDrop(
        item.type,
        this.scene.player.x + Phaser.Math.Between(-20, 20),
        this.scene.player.y + Phaser.Math.Between(-20, 20),
        item.count
      );
    });
  }

  // 🔥 NUEVO: Soltar un item específico al mundo
  dropItemToWorld(type, x, y, count = 1) {
    console.log(`💨 Soltando ${count} de ${type}`);

    const texture = this.getItemDropTexture(type);
    if (!texture) return;

    // CALCULAR TRAYECTORIA
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distanciaInicial = 40; // Más lejos aún
    const distanciaVuelo = 100;

    const startX = x + Math.cos(angle) * distanciaInicial;
    const startY = y + Math.sin(angle) * distanciaInicial;
    const destinoX = x + Math.cos(angle) * (distanciaInicial + distanciaVuelo);
    const destinoY = y + Math.sin(angle) * (distanciaInicial + distanciaVuelo);

    // 🔥 CREAR EL DROP PERO NO AÑADIRLO AL GRUPO DE FÍSICAS TODAVÍA
    const drop = this.scene.add.sprite(startX, startY, texture); // ← add.sprite, NO physics.add.sprite
    drop.setDepth(startY);

    // AÑADIR MANUALMENTE AL GRUPO DE DROPS (PERO SIN FÍSICA)
    this.scene.dropsGroup.add(drop);

    // Datos del drop
    drop.setData("type", type);
    drop.setData("count", count);
    drop.setData("justDropped", true);
    drop.setData("dropTime", this.scene.time.now);

    drop.setAlpha(0.7);

    if (count > 1) {
      const countText = this.scene.add.text(
        startX + 15,
        startY - 20,
        count.toString(),
        {
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        }
      );
      countText.setDepth(startY + 1);
      drop.countText = countText;
    }

    // 🔥 ANIMACIÓN DE VUELO
    this.scene.tweens.add({
      targets: drop,
      x: destinoX,
      y: destinoY,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        // 🔥 AHORA SÍ: CONVERTIRLO EN UN SPRITE FÍSICO
        this.scene.physics.add.existing(drop);
        drop.body.setAllowGravity(false);
        drop.body.setImmovable(true);

        drop.setData("justDropped", false);
        drop.setAlpha(1);

        // Rebote
        this.scene.tweens.add({
          targets: drop,
          y: destinoY - 8,
          duration: 100,
          yoyo: true,
          repeat: 1,
        });

        console.log(
          `   ✅ Aterrizó en (${Math.round(drop.x)}, ${Math.round(drop.y)})`
        );
      },
    });
  }

  createStackedDrop(type, x, y, count) {
    const texture = this.getItemDropTexture(type);
    if (!texture) return;

    const drop = this.scene.physics.add.sprite(x, y, texture);
    drop.setDepth(y);
    drop.body.setAllowGravity(false);
    drop.body.setImmovable(true);
    drop.setData("type", type);
    drop.setData("count", count);

    // Texto de cantidad
    const countText = this.scene.add.text(x + 20, y - 20, count.toString(), {
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    });
    countText.setDepth(y + 1);

    // Guardar referencia para actualizar después
    drop.countText = countText;

    // Animación
    drop.setScale(0);
    this.scene.tweens.add({
      targets: drop,
      scale: 1,
      duration: 300,
      ease: "BackOut",
    });

    this.scene.dropsGroup.add(drop);
  }

  findEmptySlotInRange(start, end) {
    for (let i = start; i <= end; i++) {
      if (this.items[i].isEmpty()) {
        return i;
      }
    }
    return -1;
  }

  upgradeToTier(tier) {
    if (tier === this.currentTier) return;

    const isDowngrade = tier < this.currentTier;
    const oldItems = [...this.items];
    const oldBackpackEquipped = this.backpackSlot.equipped;
    const wasOpen = this.isOpen;

    // Si es downgrade, verificar items que se perderán
    if (isDowngrade) {
      const newTierConfig = this.inventoryTiers[tier];
      const slotsQueDesaparecen = this.totalSlots - newTierConfig.slots;

      if (slotsQueDesaparecen > 0) {
        const itemsAPerder = [];
        for (let i = newTierConfig.slots; i < this.totalSlots; i++) {
          if (!oldItems[i].isEmpty()) {
            itemsAPerder.push({
              item: oldItems[i].clone(),
              index: i,
            });
          }
        }

        if (itemsAPerder.length > 0) {
          console.log(
            `📦 Downgrade: ${itemsAPerder.length} items se soltarán al suelo`
          );
          this.dropItemsToWorld(itemsAPerder);
        }
      }
    }

    this.resetCursor();
    this.currentTier = tier;
    this.updateTierConfig();

    const newItems = [];
    for (let i = 0; i < this.totalSlots; i++) {
      if (i < oldItems.length) {
        newItems[i] = oldItems[i];
      } else {
        newItems[i] = Item.empty();
      }
    }

    this.items = newItems;
    this.updateHotbar();
    this.backpackSlot.equipped = oldBackpackEquipped;

    if (this.container) {
      this.container.destroy();
      this.slots = [];
      this.createVisuals();
    }

    if (wasOpen) {
      this.isOpen = true;
      this.container.setVisible(true);
      this.cursorRow = 0;
      this.cursorCol = 0;
    }

    this.update();

    if (this.scene.hotbar) {
      this.scene.hotbar.rebuild();
    }
  }

  upgradeTier() {
    if (this.currentTier >= 5) {
      this.scene.ui.showModalMessage(
        "✨ ¡Ya tienes el inventario máximo!",
        true
      );
      return;
    }

    const nextTier = this.currentTier + 1;
    const oldItems = [...this.items];

    this.currentTier = nextTier;
    this.updateTierConfig();

    const newItems = [];
    for (let i = 0; i < this.totalSlots; i++) {
      newItems[i] = i < oldItems.length ? oldItems[i] : Item.empty();
    }

    this.items = newItems;
    this.updateHotbar();

    if (this.container) {
      this.container.destroy();
      this.slots = [];
      this.createVisuals();
    }

    this.scene.ui.showModalMessage(
      `📦 ¡Inventario mejorado!\n${this.tierName}`,
      true
    );
    this.update();
  }

  // CREACIÓN VISUAL
  createVisuals() {
    this.container = this.scene.add.container(this.inventoryX, this.inventoryY);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Calcular dimensiones de los slots
    const slotsHeight =
      this.rows * (this.slotSize + this.padding) + this.padding;

    // 🔥 Usar ANCHO FIJO en lugar de calcular
    const bgWidth = INVENTORY_CONFIG.FIXED_WIDTH;

    const BACKPACK_AREA = 80;
    const TITLE_HEIGHT = 70;
    const INSTRUCTIONS_HEIGHT = 40;
    const PADDING = 20;

    const bgHeight =
      slotsHeight +
      TITLE_HEIGHT +
      INSTRUCTIONS_HEIGHT +
      PADDING * 2 +
      BACKPACK_AREA;

    // Fondo
    const background = this.scene.add.rectangle(
      0,
      0,
      bgWidth,
      bgHeight,
      0x222222,
      0.95
    );
    background.setStrokeStyle(2, 0x888888);
    this.container.add(background);

    // Título
    const title = this.scene.add
      .text(0, -bgHeight / 2 + 40, `INVENTARIO - ${this.tierName}`, {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(title);

    // Sección de mochila (centrada con ancho fijo)
    this.createBackpackSection(bgHeight, bgWidth);

    // Instrucciones
    const instructions = this.scene.add
      .text(
        0,
        bgHeight / 2 - 25,
        "WASD: Navegar   |   E: Tomar/Soltar   |   X: Dividir   |   Q: Soltar   |   I: Cerrar",
        {
          fontSize: "14px",
          color: "#aaaaaa",
          backgroundColor: "#333333",
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5);
    this.container.add(instructions);

    // Crear slots (centrados en el ancho fijo)
    this.createSlots(bgHeight, BACKPACK_AREA, bgWidth);

    // Sprites del cursor...
    this.cursorItemSprite = this.scene.add.image(0, 0, "");
    this.cursorItemSprite.setDisplaySize(40, 40);
    this.cursorItemSprite.setDepth(1001);
    this.cursorItemSprite.setVisible(false);
    this.cursorItemSprite.setScrollFactor(0);

    this.cursorCountText = this.scene.add.text(0, 0, "", {
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.cursorCountText.setDepth(1002);
    this.cursorCountText.setScrollFactor(0);
    this.cursorCountText.setVisible(false);
  }

  createBackpackSection(bgHeight, bgWidth) {
    const backpackY = -bgHeight / 2 + 100;

    // 🔥 TEXTO "MOCHILA" MÁS GRANDE Y VISIBLE
    const backpackLabel = this.scene.add
      .text(-bgWidth / 2 + 70, backpackY - 15, "MOCHILA", {
        // Movido más arriba
        fontSize: "18px", // Un poco más grande
        color: "#ffffff", // Blanco en lugar de gris
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5);
    this.container.add(backpackLabel);

    // 🔥 SLOT DE MOCHILA CON BORDE NORMAL (como los demás slots)
    const backpackSlotX = -bgWidth / 2 + 110;
    const backpackSlotY = backpackY + 30; // Desplazado hacia abajo para dejar espacio al texto

    const backpackBg = this.scene.add.rectangle(
      backpackSlotX,
      backpackSlotY,
      this.slotSize,
      this.slotSize,
      0x333333 // Mismo color que los slots normales
    );
    // 🔥 BORDE IGUAL QUE LOS DEMÁS SLOTS (gris, no amarillo)
    backpackBg.setStrokeStyle(1, 0x666666); // Mismo color gris que los slots normales
    this.container.add(backpackBg);

    // Icono de mochila
    const backpackIcon = this.scene.add.image(backpackSlotX, backpackSlotY, "");
    backpackIcon.setDisplaySize(40, 40);
    backpackIcon.setVisible(false);
    this.container.add(backpackIcon);

    // Texto del nivel (más pequeño y discreto)
    const backpackText = this.scene.add
      .text(backpackSlotX + 25, backpackSlotY - 20, "", {
        fontSize: "12px",
        color: "#ffaa00", // Dorado solo para el texto del nivel
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(1);
    this.container.add(backpackText);

    this.backpackSlotSprite = {
      bg: backpackBg,
      icon: backpackIcon,
      text: backpackText,
      x: backpackSlotX,
      y: backpackSlotY,
    };
  }

  createSlots(bgHeight, backpackAreaHeight, bgWidth) {
    const slotsStartY = -bgHeight / 2 + 120 + backpackAreaHeight;

    // Calcular el ancho total de la cuadrícula
    const gridWidth =
      this.columns * (this.slotSize + this.padding) - this.padding;

    // Punto de inicio X para centrar la cuadrícula en el ancho fijo
    const startX = -gridWidth / 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const index = row * this.columns + col;
        if (index >= this.totalSlots) continue;

        const x = startX + col * (this.slotSize + this.padding);
        const y = slotsStartY + row * (this.slotSize + this.padding);

        // Crear slot
        const slotBg = this.scene.add.rectangle(
          x,
          y,
          this.slotSize,
          this.slotSize,
          0x333333
        );
        slotBg.setStrokeStyle(1, 0x666666);

        const selector = this.scene.add.rectangle(
          x,
          y,
          this.slotSize + 4,
          this.slotSize + 4,
          0x000000,
          0
        );
        selector.setStrokeStyle(2, 0xffaa00);

        const icon = this.scene.add.image(x, y, "");
        icon.setDisplaySize(40, 40);
        icon.setVisible(false);

        const text = this.scene.add
          .text(x + 15, y + 15, "", {
            fontSize: "16px",
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(1);

        this.slots[index] = {
          bg: slotBg,
          selector: selector,
          icon: icon,
          text: text,
          x,
          y,
          index,
          row,
          col,
        };

        this.container.add(slotBg);
        this.container.add(selector);
        this.container.add(icon);
        this.container.add(text);
      }
    }
  }

  // MANEJO DE ESTADO
  // En InventorySystem.js, método updateTierConfig:
  updateTierConfig() {
    const tier = this.inventoryTiers[this.currentTier];
    this.rows = tier.rows;
    this.columns = tier.columns;
    this.totalSlots = tier.slots;
    this.tierName = tier.name;

    // 🔥 La hotbar ahora tiene el mismo número de columnas
    this.hotbarSize = this.columns; // ANTES: Math.min(9, this.totalSlots)
  }

  // También en upgradeToTier, después de cambiar el tamaño:
  upgradeToTier(tier) {
    if (tier === this.currentTier) return;

    const oldItems = [...this.items];
    const oldBackpackEquipped = this.backpackSlot.equipped;
    const wasOpen = this.isOpen;

    this.resetCursor();
    this.currentTier = tier;
    this.updateTierConfig();

    const newItems = [];
    for (let i = 0; i < this.totalSlots; i++) {
      newItems[i] = i < oldItems.length ? oldItems[i] : Item.empty();
    }

    this.items = newItems;
    this.updateHotbar();
    this.backpackSlot.equipped = oldBackpackEquipped;

    if (this.container) {
      this.container.destroy();
      this.slots = [];
      this.createVisuals();
    }

    if (wasOpen) {
      this.isOpen = true;
      this.container.setVisible(true);
      this.cursorRow = 0;
      this.cursorCol = 0;
    }

    this.update();

    // 🔥 Notificar a la hotbar que debe RECONSTRUIRSE (no solo actualizar)
    if (this.scene.hotbar) {
      this.scene.hotbar.rebuild(); // Cambiado de update() a rebuild()
    }
  }

  // En toggle(), cuando se abre el inventario:
  toggle() {
    this.isOpen = !this.isOpen;

    if (this.container) {
      this.container.setVisible(this.isOpen);
      this.container.setPosition(this.inventoryX, this.inventoryY);
    }

    if (this.isOpen) {
      if (this.scene.onMenuOpen) this.scene.onMenuOpen("inventory");
      this.cursorRow = 0;
      this.cursorCol = 0;
      this.resetCursor();
      this.update();

      // 🔥 Actualizar hotbar al abrir inventario
      if (this.scene.hotbar) {
        this.scene.hotbar.update();
      }
    } else if (this.cursorItem) {
      this.returnCursorItemToSlot();
    }
  }

  // ============================================
  // MANEJO DE INPUT
  // ============================================
  handleInput(cursors) {
    if (!this.isOpen) return;
    if (!cursors) return;

    // Navegación con WASD
    if (cursors.up && Phaser.Input.Keyboard.JustDown(cursors.up))
      this.moveCursor(0, -1);
    if (cursors.down && Phaser.Input.Keyboard.JustDown(cursors.down))
      this.moveCursor(0, 1);
    if (cursors.left && Phaser.Input.Keyboard.JustDown(cursors.left))
      this.moveCursor(-1, 0);
    if (cursors.right && Phaser.Input.Keyboard.JustDown(cursors.right))
      this.moveCursor(1, 0);

    // Tecla E: Tomar/Soltar item
    if (cursors.interact && Phaser.Input.Keyboard.JustDown(cursors.interact)) {
      this.handleItemAction();
    }

    // Tecla X: Dividir stack
    if (cursors.split && Phaser.Input.Keyboard.JustDown(cursors.split)) {
      this.handleSplitStack();
    }

    // 🔥 NUEVO: Tecla Q: Soltar item al mundo
    if (cursors.drop && Phaser.Input.Keyboard.JustDown(cursors.drop)) {
      this.dropCurrentItem();
    }
  }

  moveCursor(dx, dy) {
    if (this.cursorRow === -1 && this.cursorCol === 0) {
      if (dy === 1) {
        this.cursorRow = 0;
        this.cursorCol = 0;
      }
      this.update();
      return;
    }

    const newCol = this.cursorCol + dx;
    const newRow = this.cursorRow + dy;

    if (newRow === -1 && this.cursorRow === 0) {
      this.cursorRow = -1;
      this.cursorCol = 0;
      this.update();
      return;
    }

    if (
      newCol >= 0 &&
      newCol < this.columns &&
      newRow >= 0 &&
      newRow < this.rows
    ) {
      this.cursorCol = newCol;
      this.cursorRow = newRow;
      this.update();
    }
  }

  // ============================================
  // ACCIONES DE ITEMS
  // ============================================
  handleItemAction() {
    if (this.cursorRow === -1) {
      this.handleBackpackAction();
      return;
    }

    const index = this.cursorRow * this.columns + this.cursorCol;
    if (index >= this.totalSlots) return;

    if (this.cursorItem) {
      this.handleItemPlacement(index);
    } else {
      this.handleItemPickup(index);
    }
    this.update();
  }

  handleItemPlacement(index) {
    const targetSlot = this.items[index];

    if (targetSlot.isEmpty()) {
      this.items[index] = this.cursorItem.clone();
      this.resetCursor();
    } else if (targetSlot.canStackWith(this.cursorItem)) {
      const added = targetSlot.add(this.cursorItem.count);
      this.cursorItem.count -= added;
      if (this.cursorItem.count <= 0) this.resetCursor();
    } else {
      [this.items[index], this.cursorItem] = [
        this.cursorItem.clone(),
        this.items[index].clone(),
      ];
    }
    this.updateCursorVisual();
  }

  handleItemPickup(index) {
    const sourceSlot = this.items[index];
    if (!sourceSlot.isEmpty()) {
      this.cursorItem = sourceSlot.clone();
      this.items[index] = Item.empty();
      this.updateCursorVisual();
    }
  }

  handleBackpackAction() {
    if (this.cursorItem) {
      if (this.isBackpack(this.cursorItem)) {
        if (this.equipBackpack(this.cursorItem)) {
          this.resetCursor();
          this.scene.ui.showModalMessage("🎒 ¡Mochila equipada!", true);
        }
      } else {
        this.scene.ui.showModalMessage(
          "❌ Solo puedes equipar mochilas aquí",
          false
        );
      }
    } else if (this.backpackSlot.equipped) {
      this.unequipBackpack(); // Ahora maneja items perdidos
    }
    this.update();
  }

  handleSplitStack() {
    if (this.cursorItem) return;

    const index = this.cursorRow * this.columns + this.cursorCol;
    if (index >= this.totalSlots) return;

    const sourceSlot = this.items[index];
    if (sourceSlot.type && sourceSlot.count > 1) {
      const halfCount = Math.floor(sourceSlot.count / 2);
      this.cursorItem = new Item(
        sourceSlot.type,
        halfCount,
        sourceSlot.maxStack
      );
      sourceSlot.count -= halfCount;
      this.updateCursorVisual();
      if (this.cursorItemSprite) this.cursorItemSprite.setVisible(true);
    }
    this.update();
  }

  returnCursorItemToSlot() {
    if (!this.cursorItem) return;

    const emptySlot = this.findEmptySlot();
    if (emptySlot !== -1) {
      this.items[emptySlot] = this.cursorItem.clone();
      this.resetCursor();
      return;
    }

    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].canStackWith(this.cursorItem)) {
        const added = this.items[i].add(this.cursorItem.count);
        this.cursorItem.count -= added;
        if (this.cursorItem.count <= 0) {
          this.resetCursor();
          break;
        }
      }
    }
  }

  update() {
    if (!this.slots || this.slots.length === 0) return;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const item = this.items[i];

      if (!slot) continue;

      // 🔥 SELECTOR (círculo naranja) - SOLO para el cursor
      if (this.cursorRow === -1) {
        // Si el cursor está en la mochila, todos los slots normales sin selector
        slot.selector.setStrokeStyle(0, 0x000000);
      } else if (i === this.cursorRow * this.columns + this.cursorCol) {
        // Slot donde está el cursor
        slot.selector.setStrokeStyle(2, INVENTORY_CONFIG.COLORS.SELECTOR);
      } else {
        slot.selector.setStrokeStyle(0, 0x000000);
      }

      // Icono y texto
      if (!item.isEmpty()) {
        slot.icon.setTexture(this.getItemTexture(item.type));
        slot.icon.setVisible(true);
        slot.text.setText(item.count.toString());
        slot.text.setVisible(true);
      } else {
        slot.icon.setVisible(false);
        slot.text.setVisible(false);
      }

      // 🔥 BORDE DEL SLOT - SIEMPRE GRIS (eliminar indicador de hotbar)
      slot.bg.setStrokeStyle(1, INVENTORY_CONFIG.COLORS.SLOT_BORDER);
    }

    // 🔥 SLOT DE MOCHILA
    if (this.backpackSlotSprite && this.backpackSlot) {
      // Borde según cursor (igual que los slots normales)
      if (this.cursorRow === -1) {
        this.backpackSlotSprite.bg.setStrokeStyle(
          3,
          INVENTORY_CONFIG.COLORS.SELECTOR
        );
      } else {
        this.backpackSlotSprite.bg.setStrokeStyle(
          1,
          INVENTORY_CONFIG.COLORS.SLOT_BORDER
        );
      }

      if (this.backpackSlot.equipped) {
        this.backpackSlotSprite.icon.setTexture(
          this.getItemTexture(this.backpackSlot.equipped.type)
        );
        this.backpackSlotSprite.icon.setVisible(true);
        this.backpackSlotSprite.text.setText(`Nv.${this.backpackSlot.tier}`);
        this.backpackSlotSprite.text.setVisible(true);
      } else {
        this.backpackSlotSprite.icon.setVisible(false);
        this.backpackSlotSprite.text.setVisible(false);
      }
    }

    // 🔥 CURSOR (item tomado)
    if (this.cursorItemSprite && this.cursorCountText && this.cursorItem) {
      this.cursorItemSprite.setVisible(true);
      this.cursorCountText.setVisible(true);

      if (this.cursorRow === -1 && this.backpackSlotSprite) {
        const slotX = this.backpackSlotSprite.x + this.container.x + 30;
        const slotY = this.backpackSlotSprite.y + this.container.y - 30;
        this.cursorItemSprite.setPosition(slotX, slotY);
        this.cursorCountText.setPosition(slotX + 15, slotY + 15);
      } else {
        const index = this.cursorRow * this.columns + this.cursorCol;
        const slot = this.slots[index];

        if (slot) {
          const slotX = slot.x + this.container.x + 30;
          const slotY = slot.y + this.container.y - 30;
          this.cursorItemSprite.setPosition(slotX, slotY);
          this.cursorCountText.setPosition(slotX + 15, slotY + 15);
        }
      }
    } else if (this.cursorItemSprite && this.cursorCountText) {
      this.cursorItemSprite.setVisible(false);
      this.cursorCountText.setVisible(false);
    }
  }

  // UTILIDADES
  getItemTexture(type) {
    const textures = {
      wood: "wood",
      stone: "stone",
      meat: "Meat",
      stoneAxe: "Tool_Axe",
      stonePickaxe: "Tool_Pickaxe",
      stoneSword: "Tool_Sword",
      backpack_tier2: "backpack_small",
      backpack_tier3: "backpack_medium",
      backpack_tier4: "backpack_large",
      backpack_tier5: "backpack_epic",
    };
    return textures[type] || "";
  }

  addItem(type, count = 1) {
    let remaining = count;
    let added = 0;

    // Apilar en stacks existentes
    for (let i = 0; i < this.items.length && remaining > 0; i++) {
      const item = this.items[i];
      if (item.type === type && item.count < item.maxStack) {
        const space = item.maxStack - item.count;
        const add = Math.min(space, remaining);
        item.count += add;
        remaining -= add;
        added += add;
      }
    }

    // Buscar slots vacíos
    for (let i = 0; i < this.items.length && remaining > 0; i++) {
      if (this.items[i].isEmpty()) {
        const add = Math.min(remaining, INVENTORY_CONFIG.MAX_STACK);
        this.items[i] = new Item(type, add);
        remaining -= add;
        added += add;
      }
    }

    this.update();
    if (this.scene.hotbar) this.scene.hotbar.update();

    // Devolver la cantidad que realmente se pudo añadir
    return added;
  }

  dropCurrentItem() {
    // Si no hay slot seleccionado o está vacío, no hacer nada
    if (this.cursorRow === -1) {
      return;
    }

    const currentIndex = this.cursorRow * this.columns + this.cursorCol;
    if (currentIndex >= this.totalSlots) return;

    const item = this.items[currentIndex];
    if (item.isEmpty()) return;

    console.log(`🎒 Soltando ${item.count} de ${item.type} al mundo`);

    // 🔥 USAR LA DIRECCIÓN GUARDADA (SIN OPERADOR ?.)
    const player = this.scene.player;

    // Obtener la última dirección del personaje
    let dirX = 1; // Por defecto derecha
    let dirY = 0;

    // Verificar si existe lastDirection
    if (this.scene.lastDirection) {
      dirX = this.scene.lastDirection.x;
      dirY = this.scene.lastDirection.y;
    }

    console.log(
      `   Dirección de lanzamiento: (${dirX.toFixed(2)}, ${dirY.toFixed(2)})`
    );

    // Normalizar (por si acaso)
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    if (length > 0) {
      dirX /= length;
      dirY /= length;
    }

    // Lanzar en esa dirección
    this.dropItemToWorldWithDirection(
      item.type,
      player.x,
      player.y,
      dirX,
      dirY,
      item.count
    );

    // Vaciar el slot
    this.items[currentIndex] = Item.empty();

    // Actualizar UI
    this.update();
    if (this.scene.hotbar) {
      this.scene.hotbar.update();
    }
  }

  // 🔥 NUEVO: Lanzar objeto en una dirección específica
  dropItemToWorldWithDirection(type, x, y, dirX, dirY, count = 1) {
    console.log(
      `💨 Lanzando ${count} de ${type} en dirección (${dirX.toFixed(
        2
      )}, ${dirY.toFixed(2)})`
    );

    const texture = this.getItemDropTexture(type);
    if (!texture) return;

    // DISTANCIA Y DURACIÓN
    const distancia = 50;
    const duracion = 400;

    // Calcular puntos de la trayectoria
    const distanciaInicial = 50;
    const startX = x + dirX * distanciaInicial;
    const startY = y + dirY * distanciaInicial;
    const destinoX = x + dirX * (distanciaInicial + distancia);
    const destinoY = y + dirY * (distanciaInicial + distancia);

    // Crear drop sin física inicialmente
    const drop = this.scene.add.sprite(startX, startY, texture);
    drop.setDepth(startY);
    this.scene.dropsGroup.add(drop);

    drop.setData("type", type);
    drop.setData("count", count);
    drop.setData("justDropped", true);
    drop.setData("dropTime", this.scene.time.now);
    drop.setAlpha(0.7);

    if (count > 1) {
      const countText = this.scene.add.text(
        startX + 15,
        startY - 20,
        count.toString(),
        {
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        }
      );
      countText.setDepth(startY + 1);
      drop.countText = countText;
    }

    // Rotar el sprite para que apunte en la dirección del movimiento
    drop.rotation = Math.atan2(dirY, dirX);

    // ANIMACIÓN DE VUELO
    this.scene.tweens.add({
      targets: drop,
      x: destinoX,
      y: destinoY,
      duration: duracion,
      ease: "Power2",
      onComplete: () => {
        // Activar física al aterrizar
        this.scene.physics.add.existing(drop);
        drop.body.setAllowGravity(false);
        drop.body.setImmovable(true);
        drop.setData("justDropped", false);
        drop.setAlpha(1);
        drop.rotation = 0; // Resetear rotación

        // Rebote
        this.scene.tweens.add({
          targets: drop,
          y: destinoY - 8,
          duration: 100,
          yoyo: true,
          repeat: 1,
        });
      },
    });
  }

  isToolType(type) {
    const tools = [
      "stoneAxe",
      "stonePickaxe",
      "stoneSword",
      "axe",
      "pickaxe",
      "sword",
    ];
    return tools.includes(type);
  }

  getMaxDurability(type) {
    const durabilityMap = {
      stoneAxe: 20,
      stonePickaxe: 20,
      stoneSword: 30,
      axe: 20,
      pickaxe: 20,
      sword: 30,
    };
    return durabilityMap[type] || null;
  }

  getItemDropTexture(type) {
    const textures = {
      wood: "wood",
      stone: "stone",
      meat: "Meat",
      stoneAxe: "Tool_Axe",
      stonePickaxe: "Tool_Pickaxe",
      stoneSword: "Tool_Sword",
      backpack_tier2: "backpack_small",
      backpack_tier3: "backpack_medium",
      backpack_tier4: "backpack_large",
      backpack_tier5: "backpack_epic",
      axe: "Tool_Axe",
      pickaxe: "Tool_Pickaxe",
      sword: "Tool_Sword",
    };

    // Si no encuentra, devolver una textura por defecto o null
    const texture = textures[type];
    if (!texture) {
      console.warn(`No hay textura definida para el tipo: ${type}`);
      return null;
    }

    return texture;
  }

  removeItem(slotIndex, count = 1) {
    if (slotIndex < 0 || slotIndex >= this.items.length) return false;

    const item = this.items[slotIndex];
    if (!item || item.isEmpty() || item.count < count) return false;

    item.count -= count;

    if (item.count <= 0) {
      // 🔥 USAR Item.empty() EN LUGAR DE OBJETO LITERAL
      this.items[slotIndex] = Item.empty();
    }

    this.update();
    if (this.scene.hotbar) this.scene.hotbar.update();
    return true;
  }

  selectHotbarSlot(index) {
    console.log("🎯 Seleccionando slot:", index);

    if (index >= 0 && index < this.hotbarSize) {
      this.selectedHotbarSlot = index;

      const item = this.items[index];
      console.log("  Item seleccionado:", item);

      if (!item.isEmpty()) {
        this.scene.currentTool = {
          key: item.type,
          type: this.getToolType(item.type),
          power: this.getToolPower(item.type),
          durability: item.durability,
          maxDurability: item.maxDurability,
          itemId: item.id,
        };

        console.log("  Tool actualizada:", this.scene.currentTool);
      } else {
        this.scene.currentTool = {
          key: "hand",
          type: "hand",
          power: 1,
          durability: Infinity,
          maxDurability: Infinity,
          itemId: null,
        };
      }

      this.update();

      if (this.scene.hotbar) {
        this.scene.hotbar.update();
      }
    }
  }

  updateEquippedTool(item) {
    console.log("⚙️ updateEquippedTool - item:", item);

    // 🔥 USAR EL MISMO OBJETO item, no crear uno nuevo
    // Esto mantiene la referencia a la durabilidad real
    this.scene.currentTool = {
      key: item.type,
      type: this.getToolType(item.type),
      power: this.getToolPower(item.type),
      durability: item.durability, // ← Referencia directa
      maxDurability: item.maxDurability, // ← Referencia directa
      itemId: item.id, // ← Referencia directa
      // Guardar referencia al item para actualizaciones futuras
      _itemRef: item, // ← TRUCO: guardar referencia
    };

    console.log("   currentTool actualizado:", this.scene.currentTool);
  }

  getToolType(type) {
    const typeMap = {
      stoneAxe: "axe",
      stonePickaxe: "pickaxe",
      stoneSword: "sword",
      axe: "axe",
      pickaxe: "pickaxe",
      sword: "sword",
    };
    return typeMap[type] || "hand";
  }

  getToolPower(type) {
    const powerMap = {
      stoneAxe: 2,
      stonePickaxe: 2,
      stoneSword: 3,
      axe: 2,
      pickaxe: 2,
      sword: 3,
    };
    return powerMap[type] || 1;
  }

  getHotbarItem(index) {
    return this.items[index] || null;
  }

  getSelectedItem() {
    return this.items[this.selectedHotbarSlot] || null;
  }

  canAddItem() {
    return this.findEmptySlot() !== -1;
  }

  tryEquipBackpackFromSlot(slotIndex) {
    const item = this.items[slotIndex];
    if (this.isBackpack(item) && this.equipBackpack(item)) {
      this.removeItem(slotIndex, 1);
      return true;
    }
    return false;
  }

  findItemIndexById(id) {
    console.log("🔍 Buscando item por ID:", id);
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i] && this.items[i].id === id) {
        console.log("   ✅ Encontrado en slot:", i);
        return i;
      }
    }
    console.log("   ❌ No encontrado");
    return -1;
  }

  destroy() {
    if (this.container) this.container.destroy();
    if (this.cursorItemSprite) this.cursorItemSprite.destroy();
    if (this.cursorCountText) this.cursorCountText.destroy();
  }
}
