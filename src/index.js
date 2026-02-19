import * as Phaser from "phaser";
import MainScene from "./scenes/MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#1d1d1d",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [MainScene], // 👈 aquí se conectan las escenas
};

new Phaser.Game(config);
