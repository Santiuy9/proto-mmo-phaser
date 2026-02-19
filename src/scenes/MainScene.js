import * as Phaser from "phaser";

import Animations from "../systems/Animations.js";
import PlayerControllers from "../systems/PlayerControllers.js";
import PlayerStatsSystem from "../systems/PlayerStatsSystem.js";
import InventorySystem from "../systems/InventorySystem.js";
import HotbarSystem from "../systems/HotbarSystem.js";
import Resources from "../systems/Resources.js";
import CombatSystem from "../systems/CombatSystem.js";
import UISystem from "../systems/UISystem.js";
import CraftingSystem from "../systems/CraftingSystem.js";
import DebugSystem from "../systems/DebugSystem.js"; // ¡Nuevo!
import Sheep from "../entities/Sheep.js";

const TOOL_STATS = {
  hand: { type: "hand", power: 1, maxDurability: Infinity },
  stoneAxe: { type: "axe", power: 2, maxDurability: 20 },
  stonePickaxe: { type: "pickaxe", power: 2, maxDurability: 20 },
  stoneSword: { type: "sword", power: 3, maxDurability: 30 },
};

const HAND_TOOL = {
  key: "hand",
  type: "hand",
  power: 1,
  durability: Infinity,
  maxDurability: Infinity,
};

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
    this.lastFullMessageTime = 0;
    this.lastDirection = { x: 1, y: 0 };
  }

  // ================== PRELOAD ==================
  preload() {
    this.loadPlayerSprites();
    this.loadObjects();
    this.loadEntities();
    this.loadResources();
    this.loadGround();
  }

  loadPlayerSprites() {
    const playerSheets = [
      "Pawn_Idle",
      "Pawn_Run",
      "Pawn_Idle_Axe",
      "Pawn_Run_Axe",
      "Pawn_Interact_Axe",
      "Pawn_Idle_Pickaxe",
      "Pawn_Run_Pickaxe",
      "Pawn_Interact_Pickaxe",
      "Pawn_Idle_Sword",
      "Pawn_Run_Sword",
      "Pawn_Interact_Sword",
    ];

    playerSheets.forEach((key) => {
      this.load.spritesheet(key, `src/assets/${key}.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
    });
  }

  loadObjects() {
    this.load.spritesheet("tree", "src/assets/Tree1.png", {
      frameWidth: 192,
      frameHeight: 256,
    });
    this.load.spritesheet(
      "stone_ore",
      "src/assets/Gold_Stone_6_Highlight.png",
      {
        frameWidth: 128,
        frameHeight: 128,
      }
    );
    this.load.image("terrain", "src/assets/Tilemap_color5.png");
    this.load.image("Tool_Axe", "src/assets/Tool_Axe.png");
    this.load.image("Tool_Pickaxe", "src/assets/Tool_Pickaxe.png");
    this.load.image("Tool_Sword", "src/assets/Tool_Sword.png");
    this.load.spritesheet("uiPanel", "src/assets/UI_Panel.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  loadEntities() {
    this.load.spritesheet("sheep_move", "src/assets/Sheep_Move.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("sheep_idle", "src/assets/Sheep_Idle.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet("sheep_grass", "src/assets/Sheep_Grass.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  loadResources() {
    this.load.image("wood", "src/assets/Resource_Wood.png");
    this.load.image("stone", "src/assets/Resource_Stone.png");
    this.load.image("Meat", "src/assets/Resource_Meat.png");
  }

  loadGround() {
    this.load.image("water", "src/assets/Water_Background_Color.png");
  }

  // ================== CREATE ==================
  create() {
    this.initControls();
    this.initWorld();
    this.initPlayer();
    this.initSystems();
    this.initGroups();
    this.initEntities();
    this.initUI();
    this.initDebug();
    this.setupCollisions();
  }

  initWorld() {
    const tileSize = 64;
    this.mapWidth = 60;
    this.mapHeight = 60;

    // 🔥 El tamaño del mundo debe ser tiles * tamaño de tile
    this.worldWidth = this.mapWidth * tileSize; // 60 * 64 = 3840
    this.worldHeight = this.mapHeight * tileSize; // 60 * 64 = 3840

    this.initMap();
  }

  initPlayer() {
    this.player = this.physics.add.sprite(400, 300, "Pawn_Idle");
    this.player.setCollideWorldBounds(true);
    this.player.setSize(40, 30);
    this.player.setOffset(76, 100);
    this.cameras.main.startFollow(this.player);

    this.tools = [null, null, null];
    this.currentTool = { ...HAND_TOOL };
    this.toolStats = TOOL_STATS;
    this.lastInteractTime = 0;
    this.isCutting = false;
    this.isMining = false;
  }

  initSystems() {
    this.crafting = new CraftingSystem(this);
    this.animationsSystem = new Animations(this);
    this.animationsSystem.create();
    this.resources = new Resources(this);
    this.combat = new CombatSystem(this);
    this.ui = new UISystem(this);
    this.ui.create();
    this.playerStats = new PlayerStatsSystem(this);
    this.playerControllers = new PlayerControllers(this, this.player);
  }

  initGroups() {
    this.treesGroup = this.physics.add.staticGroup();
    this.stonesGroup = this.physics.add.staticGroup();
    this.treeZones = this.physics.add.group();
    this.stoneZones = this.physics.add.group();
    this.dropsGroup = this.physics.add.group();
    this.sheepGroup = this.physics.add.group();
    this.sheepHitGroup = this.physics.add.group();

    this.populateResources();
  }

  populateResources() {
    // Recolectar todas las posiciones de pasto
    const grassTiles = [];

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.worldData[y][x] === "grass") {
          grassTiles.push({ x, y });
        }
      }
    }

    console.log(`🌱 Total tiles de pasto: ${grassTiles.length}`);

    if (grassTiles.length === 0) return;

    // Mezclar array para selección aleatoria
    Phaser.Utils.Array.Shuffle(grassTiles);

    // Colocar árboles (50)
    for (let i = 0; i < 50 && i < grassTiles.length; i++) {
      const tile = grassTiles[i];
      const worldX = tile.x * 64 + 32;
      const worldY = tile.y * 64 + 32;
      this.createTree(worldX, worldY);
    }

    // Mezclar de nuevo para piedras
    Phaser.Utils.Array.Shuffle(grassTiles);

    // Colocar piedras (30)
    for (let i = 0; i < 30 && i < grassTiles.length; i++) {
      const tile = grassTiles[i];
      const worldX = tile.x * 64 + 32;
      const worldY = tile.y * 64 + 32;
      this.createStone(worldX, worldY);
    }
  }

  createTree(x, y) {
    // x, y son coordenadas del tile (centro del tile)
    const tileSize = 64;

    // Calcular la posición base del árbol (centro del tile)
    const treeX = x;

    // 🔥 AJUSTE: Subir el árbol para que su base esté en el suelo
    // El árbol mide 256px, el tile 64px. La base debería estar en y + 32
    const treeY = y - 32; // Subir 32px para que la base toque el suelo

    const tree = this.treesGroup.create(
      treeX,
      treeY,
      "tree",
      Phaser.Math.Between(0, 2)
    );
    tree.setData({ hp: 5, isCut: false, type: "wood" });

    // Ajustar cuerpo de colisión
    tree.body.setSize(60, 35);
    tree.body.setOffset(65, 200);

    // Profundidad basada en la posición del suelo (y original)
    tree.setDepth(y + 220);

    // Zona de interacción (también ajustada)
    tree.interactZone = this.add.zone(x, y + 90, 100, 90).setOrigin(0.5);
    this.physics.add.existing(tree.interactZone);
    tree.interactZone.body.setAllowGravity(false).setImmovable(true);
    tree.interactZone.setData("parent", tree);
    this.treeZones.add(tree.interactZone);
  }

  createStone(x, y) {
    // Ya no generes X e Y aquí, usa los que vienen por parámetro
    const stone = this.stonesGroup.create(
      x,
      y,
      "stone_ore",
      Phaser.Math.Between(0, 2)
    );
    stone.setData({ hp: 3, isMined: false, type: "stone" });
    stone.body.setSize(60, 50);
    stone.body.setOffset(30, 40);
    stone.setDepth(stone.y + 90);

    stone.interactZone = this.add.zone(x, y, 120, 120).setOrigin(0.5);
    this.physics.add.existing(stone.interactZone);
    stone.interactZone.body.setAllowGravity(false).setImmovable(true);
    stone.interactZone.setData("parent", stone);
    this.stoneZones.add(stone.interactZone);
  }

  initEntities() {
    const sheep = new Sheep(this, 500, 500);
    this.sheepGroup.add(sheep);
    this.createItemDrop(600, 600, "meat");
  }

  // En MainScene.js, dentro de initUI():
  initUI() {
    this.inventorySystem = new InventorySystem(this);
    this.inventorySystem.createVisuals(); // ¡NUEVO!
    this.inventorySystem.addItem("backpack_tier2", 1);

    // Ahora sí, añadir items
    this.inventorySystem.addItem("wood", 12);
    this.inventorySystem.addItem("stone", 8);
    this.inventorySystem.addItem("meat", 3);
    this.inventorySystem.addItem("stoneAxe", 1);

    this.hotbar = new HotbarSystem(this);
    this.hotbar.rebuild();
  }

  // ================== DEBUG AHORA ES UNA LÍNEA ==================
  initDebug() {
    this.debug = new DebugSystem(this);
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.sheepGroup);
    this.physics.add.collider(this.player, this.treesGroup);
    this.physics.add.collider(this.player, this.stonesGroup);
    this.physics.add.collider(this.sheepGroup, this.treesGroup);
    this.physics.add.collider(this.sheepGroup, this.stonesGroup);

    this.physics.add.overlap(
      this.player,
      this.sheepHitGroup,
      (player, zone) => {
        const sheep = this.sheepGroup
          .getChildren()
          .find((s) => s.interactionZone === zone);
        if (sheep) this.currentSheepTarget = sheep;
      }
    );

    this.physics.add.overlap(
      this.player,
      this.dropsGroup,
      this.handleDropCollection,
      null,
      this
    );
  }

  // ================== UPDATE ==================
  update(time, delta) {
    // Movimiento y animaciones
    const isMoving = this.playerControllers.update(this.cursors, () =>
      this.isPlayerBlocked()
    );

    if (!this.isPlayerBlocked()) {
      this.animationsSystem.playMovementAnimation(isMoving);
    }

    // Actualizaciones
    this.player.setDepth(this.player.y + 140);
    this.playerStats.update(delta / 1000);
    this.ui.updateStats(this.playerStats);
    this.currentSheepTarget = null;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.inventory)) {
      if (this.inventorySystem) {
        this.inventorySystem.toggle();
      }
    }

    // Input
    this.handleInput();

    // HUD
    if (this.hotbar) {
      this.hotbar.update();
    }

    this.checkNearbyDrops();

    // 🔥 GUARDAR DIRECCIÓN SEGÚN TECLAS (NO SEGÚN FLIPX)

    // Inicializar con la dirección actual (para mantener si no hay movimiento)
    let newDirX = 1; // Por defecto derecha
    let newDirY = 0;

    // Si existe lastDirection, usar sus valores
    if (this.lastDirection) {
      newDirX = this.lastDirection.x;
      newDirY = this.lastDirection.y;
    }

    let moving = false;

    // Detectar teclas de movimiento
    if (this.cursors.left.isDown) {
      newDirX = -1;
      newDirY = 0;
      moving = true;
    } else if (this.cursors.right.isDown) {
      newDirX = 1;
      newDirY = 0;
      moving = true;
    }

    if (this.cursors.up.isDown) {
      newDirX = 0;
      newDirY = -1;
      moving = true;
    } else if (this.cursors.down.isDown) {
      newDirX = 0;
      newDirY = 1;
      moving = true;
    }

    // Diagonales (prioridad a la última tecla presionada)
    if (this.cursors.up.isDown && this.cursors.right.isDown) {
      newDirX = 0.707; // 1/√2 para diagonal perfecta
      newDirY = -0.707;
      moving = true;
    } else if (this.cursors.up.isDown && this.cursors.left.isDown) {
      newDirX = -0.707;
      newDirY = -0.707;
      moving = true;
    } else if (this.cursors.down.isDown && this.cursors.right.isDown) {
      newDirX = 0.707;
      newDirY = 0.707;
      moving = true;
    } else if (this.cursors.down.isDown && this.cursors.left.isDown) {
      newDirX = -0.707;
      newDirY = 0.707;
      moving = true;
    }

    // Solo actualizar la dirección si hay movimiento
    if (moving) {
      this.lastDirection = { x: newDirX, y: newDirY };

      // 🔥 DEBUG: Mostrar dirección actual (opcional)
      // console.log("Dirección:", this.lastDirection);
    }

    // Debug (¡ahora es una línea!)
    this.debug.update();

    if (Phaser.Input.Keyboard.JustDown(this.cursors.debug)) {
      const tileX = Math.floor(this.player.x / 64);
      const tileY = Math.floor(this.player.y / 64);
      console.log("Jugador en tile:", tileX, tileY);
      console.log("Tipo:", this.worldData[tileY][tileX]);
      this.debugTile(tileX, tileY);
    }
  }

  // ================== INPUT ==================
  initControls() {
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      craft: Phaser.Input.Keyboard.KeyCodes.C,
      inventory: Phaser.Input.Keyboard.KeyCodes.I,
      split: Phaser.Input.Keyboard.KeyCodes.X,
      drop: Phaser.Input.Keyboard.KeyCodes.Q,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      six: Phaser.Input.Keyboard.KeyCodes.SIX,
      seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
      nine: Phaser.Input.Keyboard.KeyCodes.NINE,
      debug: Phaser.Input.Keyboard.KeyCodes.ZERO,
    });
  }

  handleInput() {
    if (this.ui.messageActive) return;

    // 🔥 TECLA I: Inventario (exclusivo)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.inventory)) {
      if (this.inventorySystem && this.inventorySystem.isOpen) {
        // Si está abierto, SOLO cerrar inventario
        this.inventorySystem.toggle();
      } else {
        // Si no está abierto, cerrar crafteo y abrir inventario
        this.openMenu("inventory");
      }
      return;
    }

    // 🔥 TECLA C: Crafteo (exclusivo)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.craft)) {
      if (this.ui.craftOpen) {
        // Si está abierto, SOLO cerrar crafteo
        this.ui.toggleCraftMenu();
      } else {
        // Si no está abierto, cerrar inventario y abrir crafteo
        this.openMenu("craft");
      }
      return;
    }

    // Manejo de input según menú activo
    if (this.inventorySystem && this.inventorySystem.isOpen) {
      this.inventorySystem.handleInput(this.cursors);
      return;
    }

    if (this.ui.craftOpen) {
      this.ui.updateCraftingInput(this.cursors);
      return;
    }

    // Input normal del juego
    this.handleDebugKey();
    this.handleInteractKey();
    this.handleToolSlots();
  }

  handleDebugKey() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.debug)) {
      this.debug.toggle();
    }
  }

  handleInteractKey() {
    if (!Phaser.Input.Keyboard.JustDown(this.cursors.interact)) return;
    if (this.time.now - this.lastInteractTime < 300) return;

    this.lastInteractTime = this.time.now;

    if (this.ui.craftOpen) {
      this.ui.craftSelected();
      return;
    }

    if (this.inventorySystem && this.inventorySystem.isOpen) return;

    // Buscar oveja para interactuar
    this.findAndInteractWithSheep();
  }

  findAndInteractWithSheep() {
    let sheepTarget = null;

    this.physics.overlap(this.player, this.sheepHitGroup, (player, zone) => {
      const sheep = this.sheepGroup
        .getChildren()
        .find((s) => s.interactionZone === zone);
      if (sheep) sheepTarget = sheep;
    });

    if (sheepTarget) {
      console.log("🐑 Atacando oveja con herramienta:", this.currentTool);
      this.combat.attack(sheepTarget, this.player, this.currentTool);
      return;
    }

    // Si no hay oveja, interactuar con recursos
    this.resources.interact(this.player);
  }

  handleCraftKey() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.craft)) {
      // Si el inventario está abierto, lo cerramos primero
      if (this.inventorySystem && this.inventorySystem.isOpen) {
        this.inventorySystem.toggle();
      }

      // Toggle del menú de crafteo
      this.ui.toggleCraftMenu();
    }
  }

  handleToolSlots() {
    const inventoryOpen = this.inventorySystem
      ? this.inventorySystem.isOpen
      : false;
    const craftOpen = this.ui ? this.ui.craftOpen : false;
    const messageActive = this.ui ? this.ui.messageActive : false;

    if (inventoryOpen || craftOpen || messageActive || !this.hotbar) return;

    // 🔥 Obtener el tamaño actual de la hotbar
    const hotbarSize = this.inventorySystem
      ? this.inventorySystem.hotbarSize
      : 9;

    // Array de teclas (solo hasta el tamaño de la hotbar)
    const keys = [
      { key: this.cursors.one, num: 1 },
      { key: this.cursors.two, num: 2 },
      { key: this.cursors.three, num: 3 },
      { key: this.cursors.four, num: 4 },
      { key: this.cursors.five, num: 5 },
      { key: this.cursors.six, num: 6 },
      { key: this.cursors.seven, num: 7 },
      { key: this.cursors.eight, num: 8 },
      { key: this.cursors.nine, num: 9 },
    ];

    for (let i = 0; i < hotbarSize; i++) {
      const item = keys[i];
      if (item && item.key && Phaser.Input.Keyboard.JustDown(item.key)) {
        this.hotbar.handleNumberKey(item.num);
        break;
      }
    }
  }

  selectToolSlot(index) {
    const tool = this.tools[index];

    if (!tool) {
      this.currentTool = { ...HAND_TOOL };
      this.player.anims.play("Pawn_Idle", true);
    } else {
      this.currentTool = tool;
      const animKey = this.getToolAnimKey(tool.type);
      this.player.anims.play(animKey, true);
    }

    this.ui.updateTools(this.tools, index);
    this.ui.updateToolDurability(this.currentTool);
  }

  getToolAnimKey(toolType) {
    const animMap = {
      axe: "Pawn_Idle_Axe",
      pickaxe: "Pawn_Idle_Pickaxe",
      sword: "Pawn_Idle_Sword",
    };
    return animMap[toolType] || "Pawn_Idle";
  }

  // ================== UTILIDADES ==================
  isPlayerBlocked() {
    if (!this.ui) return false;

    // 🔥 AÑADIR: Verificar si el inventario está abierto
    const inventoryOpen = this.inventorySystem && this.inventorySystem.isOpen;

    return (
      this.isCutting ||
      this.isMining ||
      inventoryOpen || // 🔥 NUEVO: Inventario moderno
      this.ui.craftOpen
    );
  }

  createItemDrop(x, y, type) {
    const textures = { meat: "Meat", wood: "wood", stone: "stone" };
    const texture = textures[type];
    if (!texture) return;

    const drop = this.physics.add.sprite(
      x + Phaser.Math.Between(-15, 15),
      y + Phaser.Math.Between(-15, 15),
      texture
    );

    drop.setDepth(drop.y);
    if (drop.body) {
      drop.body.setAllowGravity(false);
      drop.body.setImmovable(true);
      drop.body.setSize(32, 32);
    }
    drop.setData("type", type);

    this.dropsGroup.add(drop);

    drop.setScale(0);
    this.tweens.add({
      targets: drop,
      scale: 1,
      duration: 300,
      ease: "BackOut",
    });
  }

  handleDropCollection(player, drop) {
    if (!drop || !drop.active) return;

    // 🔥 NO RECOGER SI ACABA DE SER SOLTADO
    if (drop.getData("justDropped")) {
      return;
    }

    const type = drop.getData("type");
    const dropCount = drop.getData("count") || 1;

    const added = this.inventorySystem.addItem(type, dropCount);

    if (added > 0) {
      this.showCollectEffect(drop, type, added);

      if (added < dropCount) {
        const remaining = dropCount - added;
        drop.setData("count", remaining);
        if (drop.countText) drop.countText.setText(remaining.toString());
      } else {
        if (drop.countText) drop.countText.destroy();
        drop.destroy();
      }
    }
  }

  showCollectEffect(drop, type, count) {
    const names = {
      wood: "🪵 Madera",
      stone: "🪨 Piedra",
      meat: "🥩 Carne",
      backpack_tier2: "🎒 Mochila Pequeña",
      backpack_tier3: "🎒 Mochila Mediana",
      backpack_tier4: "🎒 Mochila Grande",
      backpack_tier5: "🎒 Mochila Épica",
    };

    const itemName = names[type] || type;
    const text = this.add.text(drop.x, drop.y - 30, `+${count} ${itemName}`, {
      fontSize: "20px",
      color: "#ffff00",
      stroke: "#000000",
      strokeThickness: 4,
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    });
    text.setDepth(9999);

    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  showInventoryFullMessage(drop, message) {
    if (drop.fullMessage) return;

    // 🔥 Añadir un tinte rojo al drop
    const originalTint = drop.tintTopLeft;
    drop.setTint(0xff6666);

    // Texto
    const msg = this.add.text(drop.x, drop.y - 40, message, {
      fontSize: "16px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 3,
      backgroundColor: "#000000aa",
      padding: { x: 8, y: 4 },
      fontStyle: "bold",
    });
    msg.setDepth(drop.depth + 1);

    // Pequeño icono de "❌"
    const icon = this.add.text(drop.x - 30, drop.y - 40, "❌", {
      fontSize: "20px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 3,
    });
    icon.setDepth(drop.depth + 1);

    drop.fullMessage = { text: msg, icon: icon };

    // Animación
    this.tweens.add({
      targets: [msg, icon],
      y: "-=30",
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => {
        msg.destroy();
        icon.destroy();
        drop.clearTint(); // Restaurar color original
        drop.fullMessage = null;
      },
    });
  }

  checkNearbyDrops() {
    if (!this.dropsGroup || !this.player) return;

    const playerX = this.player.x;
    const playerY = this.player.y;
    const DISTANCIA_MAX = 80;

    this.dropsGroup.getChildren().forEach((drop) => {
      if (!drop || !drop.active) return;

      const dist = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        drop.x,
        drop.y
      );
      const isNear = dist < DISTANCIA_MAX;

      if (isNear) {
        // Verificar si se puede recolectar este drop específico
        let canCollect = false;
        const type = drop.getData("type");
        const dropCount = drop.getData("count") || 1;

        if (this.inventorySystem) {
          for (let i = 0; i < this.inventorySystem.items.length; i++) {
            const item = this.inventorySystem.items[i];

            if (item.isEmpty()) {
              canCollect = true;
              break;
            }

            if (item.type === type && item.count < item.maxStack) {
              canCollect = true;
              break;
            }
          }
        }

        // Si NO se puede recolectar y no tiene mensaje, crear mensaje simple
        if (!canCollect && !drop.simpleMessage) {
          this.createSimpleDropMessage(drop);
        }

        // Si SÍ se puede recolectar y tiene mensaje, eliminarlo
        if (canCollect && drop.simpleMessage) {
          drop.simpleMessage.destroy();
          drop.simpleMessage = null;
        }
      }
      // Si no está cerca y tiene mensaje, eliminarlo
      else if (drop.simpleMessage) {
        drop.simpleMessage.destroy();
        drop.simpleMessage = null;
      }

      // Actualizar posición del mensaje si existe
      if (drop.simpleMessage) {
        drop.simpleMessage.x = drop.x;
        drop.simpleMessage.y = drop.y - 50;
      }
    });
  }

  // 🔥 NUEVO: Crear mensaje simple (sin marco rojo)
  createSimpleDropMessage(drop) {
    // Si ya tiene mensaje, no crear otro
    if (drop.simpleMessage) return;

    // Crear texto simple
    const msg = this.add.text(drop.x, drop.y - 50, "❌ Inventario lleno", {
      fontSize: "14px",
      color: "#ff8888",
      stroke: "#000000",
      strokeThickness: 3,
      backgroundColor: "#000000aa",
      padding: { x: 8, y: 4 },
    });
    msg.setDepth(drop.depth + 1);

    // Guardar referencia
    drop.simpleMessage = msg;
  }

  createDropMessage(drop) {
    const type = drop.getData("type");
    const dropCount = drop.getData("count") || 1;

    // 🔥 Verificar si ESTE objeto específico se puede recolectar
    let canCollect = false;

    if (this.inventorySystem) {
      // Probar si hay espacio para este tipo específico
      for (let i = 0; i < this.inventorySystem.items.length; i++) {
        const item = this.inventorySystem.items[i];

        // Caso 1: Slot vacío
        if (item.isEmpty()) {
          canCollect = true;
          break;
        }

        // Caso 2: Mismo tipo con espacio
        if (item.type === type && item.count < item.maxStack) {
          const space = item.maxStack - item.count;
          if (space >= dropCount) {
            canCollect = true;
            break;
          }
        }
      }
    }

    // 🔥 Si SÍ se puede recolectar, NO mostrar mensaje
    if (canCollect) return;

    // Si ya tiene mensaje, no crear otro
    if (drop.fullMessage) return;

    // Crear mensaje
    const msg = this.add.text(drop.x, drop.y - 50, "❌ Inventario lleno", {
      fontSize: "14px",
      color: "#ff8888",
      stroke: "#000000",
      strokeThickness: 3,
      backgroundColor: "#000000aa",
      padding: { x: 8, y: 4 },
    });
    msg.setDepth(drop.depth + 1);
    drop.fullMessage = msg;
  }

  openMenu(menuType) {
    // menuType puede ser: 'inventory', 'craft', 'none'

    // Si ya hay un mensaje modal activo, no abrir nada
    if (this.ui.messageActive) return;

    // Cerrar todos los menús primero
    if (this.inventorySystem && this.inventorySystem.isOpen) {
      this.inventorySystem.toggle(); // Cerrar inventario
    }

    if (this.ui.craftOpen) {
      this.ui.toggleCraftMenu(); // Cerrar crafteo
    }

    // Abrir el menú solicitado
    switch (menuType) {
      case "inventory":
        if (this.inventorySystem) {
          this.inventorySystem.toggle(); // Abrir inventario
        }
        break;
      case "craft":
        this.ui.toggleCraftMenu(); // Abrir crafteo
        break;
      case "none":
      default:
        // Ya están todos cerrados
        break;
    }
  }

  onMenuOpen(menuType) {
    // Este método se llama cuando un menú se abre
    // Nos aseguramos de que el otro menú esté cerrado

    if (menuType === "inventory" && this.ui.craftOpen) {
      this.ui.toggleCraftMenu(); // Cerrar crafteo si estaba abierto
    }

    if (
      menuType === "craft" &&
      this.inventorySystem &&
      this.inventorySystem.isOpen
    ) {
      this.inventorySystem.toggle(); // Cerrar inventario si estaba abierto
    }
  }

  // ================== MAPA (sin cambios) ==================
  // ================== GENERACIÓN DE TERRENO MEJORADA ==================

  // Versión mejorada de initMap
  // Si prefieres usar tiles para el agua (más eficiente)
  initMap() {
    const tileSize = 64;
    const map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: this.mapWidth,
      height: this.mapHeight,
    });

    // Capa de agua (fondo)
    const waterTileset = map.addTilesetImage("water", null, 64, 64, 0, 0);
    this.waterLayer = map.createBlankLayer("water", waterTileset);
    this.waterLayer.setDepth(0);

    // Capa de pasto (encima)
    const tileset = map.addTilesetImage("terrain");
    this.groundLayer = map.createBlankLayer("ground", tileset);
    this.groundLayer.setDepth(5);

    // 🔥 GENERAR LAGO (agua rodeada de tierra)
    this.worldData = this.generateLakeTerrain(); // o generateNaturalLake()

    // Primero: agua en TODAS partes (fondo)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        this.waterLayer.putTileAt(0, x, y);
      }
    }

    // Segundo: pasto SOLO donde no hay agua
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.worldData[y][x] === "grass") {
          const tileIndex = this.getGrassTile(x, y);
          this.groundLayer.putTileAt(tileIndex, x, y);
        }
        // Si es agua, NO ponemos pasto, se ve el agua de abajo
      }
    }

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  // Generador simple (TODO pasto por ahora, para probar)
  generateSimpleTerrain() {
    const terrain = [];

    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Ruido múltiple para crear islas orgánicas
        const nx = x / this.mapWidth - 0.5;
        const ny = y / this.mapHeight - 0.5;

        // Distancia desde el centro (para que haya más tierra en el centro)
        const distFromCenter = Math.sqrt(nx * nx + ny * ny) * 2.5;

        // Ruido fractal
        const noise1 = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
        const noise2 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.3;

        let value = 0.5 - distFromCenter + noise1 + noise2;

        if (value > 0.2) {
          // Ajusta este valor para más/menos tierra
          row.push("grass");
        } else {
          row.push("water");
        }
      }
      terrain.push(row);
    }
    return terrain;
  }

  // AUTOTILING ESPECÍFICO PARA TU TILESET
  getGrassTile(x, y) {
    // Obtener vecinos
    const up = this.isGrass(x, y - 1);
    const down = this.isGrass(x, y + 1);
    const left = this.isGrass(x - 1, y);
    const right = this.isGrass(x + 1, y);

    // Calcular máscara
    let mask = 0;
    if (up) mask += 1; // 1
    if (right) mask += 2; // 2
    if (down) mask += 4; // 4
    if (left) mask += 8; // 8

    // MAPEO CORREGIDO (basado en tu ejemplo)
    const tileMap = {
      // máscara: tile_que_debe_usar (en base 0)
      0: 30, // Aislado
      1: 21, // Solo arriba
      2: 27, // Solo derecha
      3: 18, // Arriba + derecha
      4: 3, // Solo abajo
      5: 12, // Arriba + abajo
      6: 0, // Derecha + abajo
      7: 9, // Arriba + derecha + abajo
      8: 29, // Solo izquierda
      9: 20, // 🔥 CAMBIADO: Arriba + izquierda → antes 0, ahora 20
      10: 28, // Derecha + izquierda
      11: 19, // Arriba + derecha + izquierda
      12: 2, // Abajo + izquierda
      13: 11, // Arriba + abajo + izquierda
      14: 1, // Derecha + abajo + izquierda
      15: 10, // Rodeado
    };

    const tileIndex = tileMap[mask] !== undefined ? tileMap[mask] : 10;

    console.log(`Tile [${x},${y}] máscara:${mask} → tile:${tileIndex}`);

    return tileIndex;
  }

  // También asegurar que isGrass funciona correctamente:
  isGrass(x, y) {
    // Fuera del mapa = NO pasto
    if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      return false;
    }

    // Asegurar que worldData existe
    if (!this.worldData || !this.worldData[y]) return false;

    // Comparar con "grass" exactamente
    return this.worldData[y][x] === "grass";
  }

  generateLakeTerrain() {
    const terrain = [];
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;
    const lakeRadius = 10; // Tamaño del lago

    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Distancia al centro
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Si está cerca del centro = AGUA, sino = TIERRA
        if (dist < lakeRadius) {
          row.push("water");
        } else {
          row.push("grass");
        }
      }
      terrain.push(row);
    }
    return terrain;
  }

  hasNeighbor(x, y, targetType) {
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y + 1],
    ];

    for (let [nx, ny] of neighbors) {
      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
        if (this.worldData[ny][nx] === targetType) return true;
      }
    }
    return false;
  }

  generateTerrainWithHills() {
    const terrain = [];

    // Capa base de ruido
    const heightMap = [];
    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Ruido múltiple para crear colinas
        const h1 = Math.sin(x * 0.03) * Math.cos(y * 0.03) * 2;
        const h2 = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;
        const h3 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.3;

        let height = h1 + h2 + h3;

        // Normalizar a 0-1
        height = (height + 2) / 4;
        row.push(height);
      }
      heightMap.push(row);
    }

    // Convertir altura a tipo de terreno
    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        const h = heightMap[y][x];

        if (h < 0.3) {
          row.push("water");
        } else if (h < 0.4) {
          row.push("sand"); // Playa
        } else if (h < 0.6) {
          row.push("grass"); // Pasto
        } else if (h < 0.8) {
          row.push("grass2"); // Pasto más alto (tus tiles de elevación)
        } else {
          row.push("mountain"); // Montaña
        }
      }
      terrain.push(row);
    }
    return terrain;
  }

  // Generador con un círculo de pasto (para probar bordes)
  generateTestTerrain() {
    const terrain = [];
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;
    const radius = 15;

    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Distancia al centro
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Dentro del círculo = pasto, fuera = vacío
        if (dist < radius) {
          row.push("grass");
        } else {
          row.push("empty");
        }
      }
      terrain.push(row);
    }
    return terrain;
  }

  // Generar terreno con ruido simple
  generateImprovedTerrain() {
    const terrain = [];

    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Ruido simple para crear parches
        const noise =
          Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.05) * 0.5;
        const random = Math.random();

        if (noise > 0.4) {
          row.push("grass");
        } else if (noise < -0.4) {
          row.push("water");
        } else {
          row.push(random < 0.8 ? "grass" : "dirt");
        }
      }
      terrain.push(row);
    }
    return terrain;
  }

  // Autotiling mejorado (8 direcciones)
  getImprovedGrassTile(x, y) {
    // Comprobar vecinos
    const up = this.getType(x, y - 1) === "grass";
    const down = this.getType(x, y + 1) === "grass";
    const left = this.getType(x - 1, y) === "grass";
    const right = this.getType(x + 1, y) === "grass";

    // Calcular máscara de 4 bits
    let mask = 0;
    if (up) mask |= 1; // 0001
    if (right) mask |= 2; // 0010
    if (down) mask |= 4; // 0100
    if (left) mask |= 8; // 1000

    // Mapa de máscaras a tiles (ajusta según tu tileset)
    const tileMap = {
      0: 10, // Solitario
      1: 19, // Solo arriba
      2: 9, // Solo derecha
      3: 18, // Arriba + derecha
      4: 11, // Solo abajo
      5: 20, // Arriba + abajo
      6: 12, // Derecha + abajo
      7: 21, // Arriba + derecha + abajo
      8: 1, // Solo izquierda
      9: 17, // Arriba + izquierda
      10: 2, // Derecha + izquierda
      11: 22, // Arriba + derecha + izquierda
      12: 3, // Abajo + izquierda
      13: 23, // Arriba + abajo + izquierda
      14: 4, // Derecha + abajo + izquierda
      15: 10, // Todos (interior)
    };

    return tileMap[mask] || 10;
  }

  // Añadir detalles decorativos (flores, piedras)
  addDetails() {
    // Crear capa de decoración si no existe
    if (!this.decorationLayer) {
      const map = this.groundLayer.tilemap;
      const tileset = map.tilesets[0];
      this.decorationLayer = map.createBlankLayer("decor", tileset);
      this.decorationLayer.setDepth(10); // Sobre el suelo
    }

    // Añadir decoración aleatoria
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, this.mapWidth - 1);
      const y = Phaser.Math.Between(0, this.mapHeight - 1);

      // Solo poner decoración sobre grass y que no haya un árbol/piedra
      if (this.worldData[y][x] === "grass" && Math.random() < 0.1) {
        // Verificar que no hay un recurso en esta posición
        let hasResource = false;

        if (this.treesGroup) {
          this.treesGroup.getChildren().forEach((tree) => {
            const treeTileX = Math.floor(tree.x / 64);
            const treeTileY = Math.floor(tree.y / 64);
            if (treeTileX === x && treeTileY === y) hasResource = true;
          });
        }

        if (!hasResource) {
          const decorTile = Phaser.Math.Between(32, 35); // Tiles de flores
          this.decorationLayer.putTileAt(decorTile, x, y);
        }
      }
    }
  }

  // Mantener el getType original para compatibilidad
  getType(x, y) {
    if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight)
      return "dirt";
    return this.worldData[y] ? this.worldData[y][x] : "dirt";
  }

  // En initMap(), después de poner los tiles
  debugTiles() {
    // Mostrar los primeros tiles para verificar
    const testPositions = [
      [10, 10],
      [11, 10],
      [12, 10],
      [10, 11],
      [11, 11],
      [12, 11],
      [10, 12],
      [11, 12],
      [12, 12],
    ];

    testPositions.forEach(([x, y]) => {
      const tile = this.groundLayer.getTileAt(x, y);
      if (tile) {
        console.log(`Tile en (${x},${y}): índice ${tile.index}`);
      }
    });
  }
}
