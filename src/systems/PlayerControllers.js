// systems/PlayerControllers.js
export default class PlayerControllers {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.speed = 200;
  }

  update(cursors, blockedFn) {
    // Validar que blockedFn sea una función
    if (typeof blockedFn !== "function") {
      console.warn("PlayerControllers: blockedFn debe ser una función");
      return false;
    }

    // Si el jugador está bloqueado, detener movimiento
    if (blockedFn()) {
      this.player.setVelocity(0);
      return false;
    }

    // Validar cursors
    if (!cursors) {
      console.warn("PlayerControllers: cursors es undefined");
      return false;
    }

    let moving = false;
    this.player.setVelocity(0);

    if (cursors.left.isDown) {
      this.player.setVelocityX(-this.speed);
      this.player.flipX = true;
      moving = true;
    }

    if (cursors.right.isDown) {
      this.player.setVelocityX(this.speed);
      this.player.flipX = false;
      moving = true;
    }

    if (cursors.up.isDown) {
      this.player.setVelocityY(-this.speed);
      moving = true;
    }

    if (cursors.down.isDown) {
      this.player.setVelocityY(this.speed);
      moving = true;
    }

    return moving;
  }
}
