// import * as Phaser from "phaser";
// systems/DebugSystem.js
export default class DebugSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;

    // Crear gráficos de debug
    this.graphics = scene.add.graphics().setDepth(9999);
    this.text = null;

    this.tileTexts = [];

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.update = this.update.bind(this);
    this.drawHitboxes = this.drawHitboxes.bind(this);
    this.drawInfo = this.drawInfo.bind(this);
  }

  toggle() {
    this.enabled = !this.enabled;
    this.graphics.clear();

    // Ocultar textos de tiles
    this.tileTexts.forEach((text) => text.setVisible(this.enabled));

    if (this.text) {
      this.text.setVisible(this.enabled);
    }

    console.log("🐑 Debug mode:", this.enabled ? "ON" : "OFF");
    return this.enabled;
  }

  update() {
    if (!this.enabled) return;

    this.graphics.clear();
    this.drawHitboxes();
    // this.drawTileGrid(); // ← AÑADIR
    // this.drawTileInfo(); // ← AÑADIR
    this.drawInfo();
  }

  drawHitboxes() {
    // Dibujar hitbox del jugador
    this.drawEntityHitbox(this.scene.player, 0x00ff00, 3);

    // Dibujar drops
    this.drawGroupHitboxes(this.scene.dropsGroup, 0xff00ff, 2);

    // Dibujar ovejas y sus zonas
    this.drawSheepHitboxes();

    // Dibujar árboles y piedras
    this.drawGroupHitboxes(this.scene.treesGroup, 0x8b4513, 1);
    this.drawGroupHitboxes(this.scene.stonesGroup, 0x00bfff, 1);

    // Zonas de interacción
    this.drawGroupHitboxes(this.scene.treeZones, 0xffaa00, 1);
    this.drawGroupHitboxes(this.scene.stoneZones, 0xff66ff, 1);
  }

  drawEntityHitbox(entity, color, lineWidth) {
    if (entity && entity.body) {
      this.graphics.lineStyle(lineWidth, color, 0.8);
      this.graphics.strokeRect(
        entity.body.x,
        entity.body.y,
        entity.body.width,
        entity.body.height
      );
      this.graphics.fillStyle(color, 1);
      this.graphics.fillPoint(entity.x, entity.y, 3);
    }
  }

  drawGroupHitboxes(group, color, lineWidth) {
    if (!group) return;

    this.graphics.lineStyle(lineWidth, color, 0.8);
    var children = group.getChildren();

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child && child.body) {
        this.graphics.strokeRect(
          child.body.x,
          child.body.y,
          child.body.width,
          child.body.height
        );
        this.graphics.fillStyle(color, 1);
        this.graphics.fillPoint(child.x, child.y, 2);
      }
    }
  }

  drawSheepHitboxes() {
    if (!this.scene.sheepGroup) return;

    var sheeps = this.scene.sheepGroup.getChildren();

    for (var i = 0; i < sheeps.length; i++) {
      var sheep = sheeps[i];

      if (sheep && sheep.body) {
        // Cuerpo de la oveja
        this.graphics.lineStyle(2, 0xffff00, 0.8);
        this.graphics.strokeRect(
          sheep.body.x,
          sheep.body.y,
          sheep.body.width,
          sheep.body.height
        );

        // Zona de interacción
        if (sheep.interactionZone && sheep.interactionZone.body) {
          this.graphics.lineStyle(2, 0xff0000, 0.8);
          this.graphics.strokeRect(
            sheep.interactionZone.body.x,
            sheep.interactionZone.body.y,
            sheep.interactionZone.body.width,
            sheep.interactionZone.body.height
          );
        }

        this.graphics.fillStyle(0xffff00, 1);
        this.graphics.fillPoint(sheep.x, sheep.y, 3);

        // 🔥 NUEVO: Mostrar HP de la oveja
        if (sheep.hp !== undefined) {
          this.graphics.fillStyle(0xffffff, 1);
          this.graphics.fillText(
            "❤️ " + sheep.hp + "/" + sheep.maxHp,
            sheep.x - 20,
            sheep.y - 40
          );
        }
      }
    }
  }

  drawInfo() {
    if (!this.text) {
      this.text = this.scene.add.text(10, 10, "", {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
        fontStyle: "bold",
      });
      this.text.setScrollFactor(0);
      this.text.setDepth(10000);
    }

    // Recopilar información
    var dropCount = 0;
    if (this.scene.dropsGroup) {
      dropCount = this.scene.dropsGroup.getLength();
    }

    var toolName = "ninguna";
    var durability = "0";

    if (this.scene.currentTool) {
      toolName = this.scene.currentTool.type || "ninguna";
      if (this.scene.currentTool.durability === Infinity) {
        durability = "∞";
      } else {
        durability = String(this.scene.currentTool.durability || 0);
      }
    }

    var playerPos = "0,0";
    var inventory = { wood: 0, stone: 0, meat: 0 };

    if (this.scene.player) {
      playerPos =
        Math.round(this.scene.player.x) + "," + Math.round(this.scene.player.y);
    }

    if (this.scene.inventory) {
      inventory = this.scene.inventory;
    }

    // 🔥 NUEVO: Obtener estadísticas del jugador
    var health = "?";
    var maxHealth = "?";
    var hunger = "?";
    var maxHunger = "?";

    if (this.scene.playerStats) {
      health = Math.round(this.scene.playerStats.health);
      maxHealth = Math.round(this.scene.playerStats.maxHealth);
      hunger = Math.round(this.scene.playerStats.hunger);
      maxHunger = Math.round(this.scene.playerStats.maxHunger);
    }

    // 🔥 NUEVO: Contar ovejas
    var sheepCount = 0;
    if (this.scene.sheepGroup) {
      sheepCount = this.scene.sheepGroup.getLength();
    }

    // Obtener FPS
    var fps = Math.round(this.scene.game.loop.actualFps);

    // Actualizar texto con TODO
    this.text.setText(
      "🐑 MODO DEBUG (FPS: " +
        fps +
        ")\n" +
        "══════════════════\n" +
        "📍 POSICIÓN\n" +
        "  Jugador: " +
        playerPos +
        "\n" +
        "  Ovejas: " +
        sheepCount +
        "\n" +
        "  Drops: " +
        dropCount +
        "\n" +
        "══════════════════\n" +
        "❤️ VIDA\n" +
        "  " +
        health +
        "/" +
        maxHealth +
        "\n" +
        "══════════════════\n" +
        "🍖 HAMBRE\n" +
        "  " +
        hunger +
        "/" +
        maxHunger +
        "\n" +
        "══════════════════\n" +
        "🎒 INVENTARIO\n" +
        "  🪵 Madera: " +
        inventory.wood +
        "\n" +
        "  🪨 Piedra: " +
        inventory.stone +
        "\n" +
        "  🥩 Carne: " +
        inventory.meat +
        "\n" +
        "══════════════════\n" +
        "🔧 HERRAMIENTA\n" +
        "  " +
        toolName +
        " (" +
        durability +
        ")"
    );
  }

  drawTileGrid() {
    if (!this.scene.groundLayer) return;

    const tileSize = 64;
    const mapWidth = this.scene.mapWidth;
    const mapHeight = this.scene.mapHeight;

    // Dibujar líneas de la cuadrícula
    this.graphics.lineStyle(1, 0xffffff, 0.3);

    // Líneas verticales
    for (let x = 0; x <= mapWidth; x++) {
      const worldX = x * tileSize;
      this.graphics.moveTo(worldX, 0);
      this.graphics.lineTo(worldX, mapHeight * tileSize);
    }

    // Líneas horizontales
    for (let y = 0; y <= mapHeight; y++) {
      const worldY = y * tileSize;
      this.graphics.moveTo(0, worldY);
      this.graphics.lineTo(mapWidth * tileSize, worldY);
    }

    this.graphics.strokePath();
  }

  drawTileInfo() {
    if (!this.scene.groundLayer || !this.scene.worldData || !this.scene.player)
      return;

    const tileSize = 64;
    const mapWidth = this.scene.mapWidth;
    const mapHeight = this.scene.mapHeight;

    // Tile donde está el jugador
    const playerTileX = Math.floor(this.scene.player.x / tileSize);
    const playerTileY = Math.floor(this.scene.player.y / tileSize);

    // Eliminar textos anteriores
    this.tileTexts.forEach((text) => text.destroy());
    this.tileTexts = [];

    // Mostrar solo tiles cerca del jugador
    for (let y = playerTileY - 3; y <= playerTileY + 3; y++) {
      for (let x = playerTileX - 3; x <= playerTileX + 3; x++) {
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;

        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        // Obtener información
        const type = this.scene.worldData[y] ? this.scene.worldData[y][x] : "?";
        const tile = this.scene.groundLayer.getTileAt(x, y);
        const tileIndex = tile ? tile.index : -1;

        // Calcular vecinos
        const isGrass = this.scene.isGrass
          ? this.scene.isGrass.bind(this.scene)
          : () => false;
        const up = isGrass(x, y - 1) ? "Y" : "N";
        const down = isGrass(x, y + 1) ? "Y" : "N";
        const left = isGrass(x - 1, y) ? "Y" : "N";
        const right = isGrass(x + 1, y) ? "Y" : "N";

        // Crear texto con fondo
        const text = this.scene.add.text(
          worldX - 40,
          worldY - 20,
          `${type} [${x},${y}]\nidx:${tileIndex}\n↑${up} ↓${down} ←${left} →${right}`,
          {
            fontSize: "10px",
            color: "#ffffff",
            backgroundColor: "#000000aa",
            padding: { x: 3, y: 3 },
            align: "left",
          }
        );
        text.setDepth(10001);
        this.tileTexts.push(text);
      }
    }
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.text) this.text.destroy();
    if (this.tileInfoText) this.tileInfoText.destroy();
    if (this.tileTexts) {
      this.tileTexts.forEach((text) => text.destroy());
    }
  }
}
