import * as Phaser from "phaser";

import Animations from "../systems/Animations.js";
import PlayerControllers from "../systems/PlayerControllers.js";
import PlayerStatsSystem from "../systems/PlayerStatsSystem.js";
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
  }

  // ================== PRELOAD ==================
  preload() {
    this.loadPlayerSprites();
    this.loadObjects();
    this.loadEntities();
    this.loadResources();
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
    this.load.spritesheet("stone", "src/assets/Gold_Stone_6_Highlight.png", {
      frameWidth: 128,
      frameHeight: 128,
    });
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

  // ================== CREATE ==================
  create() {
    this.initControls();
    this.initWorld();
    this.initPlayer();
    this.initSystems();
    this.initGroups();
    this.initEntities();
    this.initUI();
    this.initDebug(); // ¡Ahora es una línea!
    this.setupCollisions();
  }

  initWorld() {
    this.worldWidth = 2000;
    this.worldHeight = 2000;
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
    this.inventory = { wood: 0, stone: 0, meat: 0 };
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
    for (let i = 0; i < 50; i++) this.createTree();
    for (let i = 0; i < 30; i++) this.createStone();
  }

  createTree() {
    const x = Phaser.Math.Between(100, this.worldWidth - 100);
    const y = Phaser.Math.Between(100, this.worldHeight - 100);

    const tree = this.treesGroup.create(
      x,
      y,
      "tree",
      Phaser.Math.Between(0, 2)
    );
    tree.setData({ hp: 5, isCut: false, type: "wood" });
    tree.body.setSize(60, 35);
    tree.body.setOffset(65, 200);
    tree.setDepth(tree.y + 220);

    tree.interactZone = this.add.zone(x, y + 90, 100, 90).setOrigin(0.5);
    this.physics.add.existing(tree.interactZone);
    tree.interactZone.body.setAllowGravity(false).setImmovable(true);
    tree.interactZone.setData("parent", tree);
    this.treeZones.add(tree.interactZone);
  }

  createStone() {
    const x = Phaser.Math.Between(100, this.worldWidth - 100);
    const y = Phaser.Math.Between(100, this.worldHeight - 100);

    const stone = this.stonesGroup.create(
      x,
      y,
      "stone",
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

  initUI() {
    this.ui.updateInventory(
      this.inventory.wood,
      this.inventory.stone,
      this.inventory.meat
    );
    this.ui.updateTools(this.tools, 0);
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

    // Input
    this.handleInput();

    // HUD
    this.ui.updateInventory(
      this.inventory.wood,
      this.inventory.stone,
      this.inventory.meat
    );
    this.ui.updateToolDurability(this.currentTool);

    // Debug (¡ahora es una línea!)
    this.debug.update();
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
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      debug: Phaser.Input.Keyboard.KeyCodes.ZERO,
    });
  }

  handleInput() {
    this.handleDebugKey();
    this.handleInteractKey();
    this.handleInventoryKey();
    this.handleCraftKey();
    this.handleToolSlots();

    if (this.ui.craftOpen) {
      this.ui.updateCraftingInput(this.cursors);
    }
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

    if (this.ui.inventoryOpen) return;

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
      this.combat.attack(sheepTarget, this.player, this.currentTool);
      return;
    }

    this.resources.interact(this.player);
  }

  handleInventoryKey() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.inventory)) {
      this.ui.toggleInventory();
    }
  }

  handleCraftKey() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.craft)) {
      this.ui.toggleCraftMenu();
    }
  }

  handleToolSlots() {
    if (this.ui.craftOpen || this.ui.inventoryOpen) return;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.one)) {
      this.selectToolSlot(0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.two)) {
      this.selectToolSlot(1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.three)) {
      this.selectToolSlot(2);
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
    return (
      this.isCutting ||
      this.isMining ||
      this.ui.inventoryOpen ||
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

    const type = drop.getData("type");

    if (this.inventory.hasOwnProperty(type)) {
      this.inventory[type] += 1;
      this.showCollectEffect(drop, type);
      drop.destroy();
    }
  }

  showCollectEffect(drop, type) {
    const names = { meat: "🥩 Carne", wood: "🪵 Madera", stone: "🪨 Piedra" };

    const text = this.add.text(
      drop.x,
      drop.y - 30,
      `+1 ${names[type] || type}`,
      {
        fontSize: "20px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 4,
        backgroundColor: "#00000088",
        padding: { x: 4, y: 2 },
      }
    );
    text.setDepth(9999);

    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  // ================== MAPA (sin cambios) ==================
  initMap() {
    const tileSize = 64;
    this.mapWidth = 60;
    this.mapHeight = 60;

    const map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: this.mapWidth,
      height: this.mapHeight,
    });
    const tileset = map.addTilesetImage("terrain");
    this.groundLayer = map.createBlankLayer("ground", tileset);

    this.worldData = Array.from({ length: this.mapHeight }, () =>
      Array.from({ length: this.mapWidth }, () =>
        Math.random() < 0.75 ? "grass" : "dirt"
      )
    );

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const type = this.worldData[y][x];
        this.groundLayer.putTileAt(
          type === "grass" ? this.getGrassTile(x, y) : 27,
          x,
          y
        );
      }
    }

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  getType(x, y) {
    return x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight
      ? "dirt"
      : this.worldData[y][x];
  }

  getGrassTile(x, y) {
    const up = this.getType(x, y - 1) === "grass";
    const down = this.getType(x, y + 1) === "grass";
    const left = this.getType(x - 1, y) === "grass";
    const right = this.getType(x + 1, y) === "grass";

    if (up && down && left && right) return 10;
    if (!up && down && left && right) return 1;
    if (up && !down && left && right) return 19;
    if (up && down && !left && right) return 9;
    if (up && down && left && !right) return 11;
    if (!up && down && !left && right) return 0;
    if (!up && down && left && !right) return 2;
    if (up && !down && left && right) return 18;
    if (up && !down && left && !right) return 20;

    return 10;
  }
}
