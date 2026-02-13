export default class Animations {
  constructor(scene) {
    this.scene = scene;

    // Mapa de animaciones por herramienta
    this.animMap = {
      hand: { idle: "Pawn_Idle", run: "Pawn_Run", interact: null },
      axe: {
        idle: "Pawn_Idle_Axe",
        run: "Pawn_Run_Axe",
        interact: "Pawn_Interact_Axe",
      },
      pickaxe: {
        idle: "Pawn_Idle_Pickaxe",
        run: "Pawn_Run_Pickaxe",
        interact: "Pawn_Interact_Pickaxe",
      },
      sword: {
        idle: "Pawn_Idle_Sword",
        run: "Pawn_Run_Sword",
        interact: "Pawn_Interact_Sword",
      },
    };
  }

  create() {
    var anims = this.scene.anims;

    for (var key in this.animMap) {
      var tool = this.animMap[key];

      if (tool.idle) {
        anims.create({
          key: tool.idle,
          frames: anims.generateFrameNumbers(tool.idle, { start: 0, end: 7 }),
          frameRate: 6,
          repeat: -1,
        });
      }

      if (tool.run) {
        anims.create({
          key: tool.run,
          frames: anims.generateFrameNumbers(tool.run, { start: 0, end: 7 }),
          frameRate: 10,
          repeat: -1,
        });
      }

      if (tool.interact) {
        var endFrame = tool.interact.indexOf("Sword") !== -1 ? 3 : 5;
        var frameRate = tool.interact.indexOf("Sword") !== -1 ? 14 : 10;

        anims.create({
          key: tool.interact,
          frames: anims.generateFrameNumbers(tool.interact, {
            start: 0,
            end: endFrame,
          }),
          frameRate: frameRate,
          repeat: 0,
        });
      }
    }

    // Idle
    this.scene.anims.create({
      key: "sheep_idle_anim",
      frames: this.scene.anims.generateFrameNumbers("sheep_idle", {
        start: 0,
        end: 5,
      }),
      frameRate: 4,
      repeat: -1,
    });

    // Move
    this.scene.anims.create({
      key: "sheep_move_anim",
      frames: this.scene.anims.generateFrameNumbers("sheep_move", {
        start: 0,
        end: 3,
      }),
      frameRate: 6,
      repeat: -1,
    });

    // Eating grass
    this.scene.anims.create({
      key: "sheep_grass_anim",
      frames: this.scene.anims.generateFrameNumbers("sheep_grass", {
        start: 0,
        end: 11,
      }),
      frameRate: 8,
      repeat: 0, // Solo una vez
    });
  }

  playMovementAnimation(isMoving) {
    var player = this.scene.player;
    var toolType = "hand";

    if (this.scene.currentTool && this.scene.currentTool.type) {
      toolType = this.scene.currentTool.type;
    }

    var animKeys = this.animMap[toolType] || this.animMap.hand;
    var animKey = isMoving ? animKeys.run : animKeys.idle;

    if (!player.anims.currentAnim || player.anims.currentAnim.key !== animKey) {
      player.play(animKey, true);
    }
  }

  playToolAnimation(toolType) {
    var player = this.scene.player;

    var toolAnim = this.animMap[toolType];
    if (!toolAnim || !toolAnim.interact) return 0;

    var animKey = toolAnim.interact;

    var anim = this.scene.anims.get(animKey);
    if (!anim) return 0;

    player.play(animKey, true);

    var callback = function () {
      if (!player.body.velocity.length()) {
        this.playMovementAnimation(false);
      }
      player.off("animationcomplete", callback);
    }.bind(this);

    player.on("animationcomplete", callback);

    return anim.duration;
  }
}
