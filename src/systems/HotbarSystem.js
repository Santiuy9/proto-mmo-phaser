// En HotbarSystem.js, modificar la clase:

export default class HotbarSystem {
  constructor(scene) {
    this.scene = scene;

    // Configuración visual
    this.slotSize = 50;
    this.padding = 5;

    // Posición
    this.x = scene.cameras.main.width / 2;
    this.y = scene.cameras.main.height - 70;

    // Elementos visuales
    this.container = null;
    this.slotSprites = [];
    this.selectorSprite = null;
    this.background = null;
    this.helpText = null;

    // Estado
    this.currentSize = 0;

    // Bind methods
    this.update = this.update.bind(this);
    this.selectSlot = this.selectSlot.bind(this);
    this.rebuild = this.rebuild.bind(this);
  }

  rebuild() {
    if (!this.scene.inventorySystem) return;

    const inventory = this.scene.inventorySystem;
    const hotbarSize = inventory.hotbarSize;

    if (hotbarSize === this.currentSize && this.container) return;

    this.currentSize = hotbarSize;

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    if (hotbarSize === 0) return;

    this.container = this.scene.add.container(this.x, this.y);
    this.container.setScrollFactor(0);
    this.container.setDepth(900);

    const totalWidth =
      hotbarSize * (this.slotSize + this.padding) + this.padding;

    // Fondo
    this.background = this.scene.add.rectangle(
      0,
      0,
      totalWidth,
      this.slotSize + this.padding * 2,
      0x222222,
      0.8
    );
    this.background.setStrokeStyle(2, 0x888888);
    this.container.add(this.background);

    // Crear slots con barra de durabilidad
    this.slotSprites = [];
    for (let i = 0; i < hotbarSize; i++) {
      const x =
        -totalWidth / 2 +
        this.padding +
        i * (this.slotSize + this.padding) +
        this.slotSize / 2;
      const y = 0;

      // Fondo del slot
      const slotBg = this.scene.add.rectangle(
        x,
        y,
        this.slotSize,
        this.slotSize,
        0x333333
      );
      slotBg.setStrokeStyle(1, 0x666666);

      // Icono del item
      const icon = this.scene.add.image(x, y, "");
      icon.setDisplaySize(40, 40);
      icon.setVisible(false);

      // Texto de cantidad
      const text = this.scene.add
        .text(x + 15, y + 15, "", {
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(1);

      // 🔥 BARRA DE DURABILIDAD - Guardar referencia para actualizar después
      const durabilityBar = this.scene.add.rectangle(
        x - 20,
        y + 20,
        40,
        4,
        0x00ff00
      );
      durabilityBar.setOrigin(0, 0.5);
      durabilityBar.setVisible(false);
      durabilityBar.setDepth(901);

      // Fondo de la barra (siempre visible cuando la barra lo está)
      const durabilityBg = this.scene.add.rectangle(
        x - 20,
        y + 20,
        40,
        4,
        0x222222
      );
      durabilityBg.setOrigin(0, 0.5);
      durabilityBg.setVisible(false);
      durabilityBg.setDepth(900);

      this.container.add(slotBg);
      this.container.add(icon);
      this.container.add(text);
      this.container.add(durabilityBg);
      this.container.add(durabilityBar);
      this.container.setDepth(10000);

      this.slotSprites[i] = {
        bg: slotBg,
        icon: icon,
        text: text,
        durabilityBg: durabilityBg,
        durabilityBar: durabilityBar,
        index: i,
      };
    }

    // Selector
    const selectorX =
      -totalWidth / 2 +
      this.padding +
      inventory.selectedHotbarSlot * (this.slotSize + this.padding) +
      this.slotSize / 2;
    this.selectorSprite = this.scene.add.rectangle(
      selectorX,
      0,
      this.slotSize + 6,
      this.slotSize + 6,
      0x000000,
      0
    );
    this.selectorSprite.setStrokeStyle(3, 0xffaa00);
    this.container.add(this.selectorSprite);

    // Texto de ayuda
    if (hotbarSize > 0) {
      this.helpText = this.scene.add
        .text(0, this.slotSize / 2 + 15, `1-${hotbarSize}: Seleccionar`, {
          fontSize: "12px",
          color: "#aaaaaa",
        })
        .setOrigin(0.5);
      this.container.add(this.helpText);
    }

    this.updateSlots();
  }

  updateSlots() {
    if (!this.scene.inventorySystem || !this.container) return;

    const inventory = this.scene.inventorySystem;
    const hotbarSize = inventory.hotbarSize;

    for (let i = 0; i < hotbarSize; i++) {
      const item = inventory.items[i];
      const slot = this.slotSprites[i];

      if (!slot) continue;

      if (item && !item.isEmpty()) {
        slot.icon.setTexture(this.getItemTexture(item.type));
        slot.icon.setVisible(true);
        slot.text.setText(item.count > 1 ? item.count.toString() : "");
        slot.text.setVisible(item.count > 1);

        // Verificar si es herramienta
        const isTool =
          item.type &&
          (item.type.includes("Axe") ||
            item.type.includes("Pickaxe") ||
            item.type.includes("Sword") ||
            item.type === "stoneAxe" ||
            item.type === "stonePickaxe" ||
            item.type === "stoneSword");

        if (
          isTool &&
          item.durability !== undefined &&
          item.durability !== null
        ) {
          // Mostrar barra
          slot.durabilityBg.setVisible(true);
          slot.durabilityBar.setVisible(true);

          const percent = item.durability / item.maxDurability;

          // Cambiar color
          if (percent > 0.6) slot.durabilityBar.fillColor = 0x00ff00;
          else if (percent > 0.3) slot.durabilityBar.fillColor = 0xffff00;
          else slot.durabilityBar.fillColor = 0xff0000;

          // 🔥 ACTUALIZAR ANCHO
          slot.durabilityBar.width = 40 * percent;

          console.log(
            `     → Barra: ${Math.round(percent * 100)}% (ancho: ${
              slot.durabilityBar.width
            })`
          );
        } else {
          slot.durabilityBg.setVisible(false);
          slot.durabilityBar.setVisible(false);
        }
      } else {
        slot.icon.setVisible(false);
        slot.text.setVisible(false);
        slot.durabilityBg.setVisible(false);
        slot.durabilityBar.setVisible(false);
      }
    }
  }

  // 🔥 NUEVO: Verificar si un tipo de item es una herramienta
  isTool(type) {
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

  update() {
    if (!this.scene.inventorySystem) return;

    const inventory = this.scene.inventorySystem;
    const hotbarSize = inventory.hotbarSize;

    if (hotbarSize !== this.currentSize) {
      this.rebuild();
      return;
    }

    if (!this.container) return;

    // Actualizar posición del selector
    if (this.selectorSprite && this.background) {
      const totalWidth =
        hotbarSize * (this.slotSize + this.padding) + this.padding;
      const selectorX =
        -totalWidth / 2 +
        this.padding +
        inventory.selectedHotbarSlot * (this.slotSize + this.padding) +
        this.slotSize / 2;
      this.selectorSprite.x = selectorX;
    }

    // 🔥 SIEMPRE actualizar slots (no solo cuando cambia tamaño)
    this.updateSlots();
  }

  selectSlot(index) {
    if (!this.scene.inventorySystem) return;

    const inventory = this.scene.inventorySystem;
    if (index >= 0 && index < inventory.hotbarSize) {
      inventory.selectHotbarSlot(index);
      this.update();
    }
  }

  handleNumberKey(keyNumber) {
    this.selectSlot(keyNumber - 1);
  }

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

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
