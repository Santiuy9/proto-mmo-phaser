import * as Phaser from "phaser";

export default class Sheep extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "sheep_idle");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(50, 35);
    this.setOffset(40, 45);

    // Zona de interacción
    this.interactionZone = scene.add.zone(this.x, this.y, 80, 80);
    scene.physics.add.existing(this.interactionZone);

    this.interactionZone.body.setAllowGravity(false);
    this.interactionZone.body.moves = false;

    scene.sheepHitGroup.add(this.interactionZone);

    this.maxHealth = 30;
    this.health = 30;

    // 🔥 Guardar timers activos
    this.timers = [];

    this.setCollideWorldBounds(true);

    this.state = "idle";
    this.play("sheep_idle_anim");

    this.setImmovable(true);
    this.setPushable(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    this.updateBehavior();
    this.setDepth(this.y + 50);

    if (this.interactionZone) {
      this.interactionZone.setPosition(this.x, this.y);
    }
  }

  updateBehavior() {
    if (!this.nextActionTime || this.scene.time.now > this.nextActionTime) {
      this.nextActionTime =
        this.scene.time.now + Phaser.Math.Between(2000, 5000);

      const action = Phaser.Math.Between(0, 2);

      if (action === 0) {
        this.idle();
      } else if (action === 1) {
        this.walkRandom();
      } else {
        this.eatGrass();
      }
    }
  }

  idle() {
    this.setVelocity(0, 0);
    this.play("sheep_idle_anim", true);
  }

  walkRandom() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = 30;

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.play("sheep_move_anim", true);

    if (this.body.velocity.x < 0) {
      this.setFlipX(true);
    } else if (this.body.velocity.x > 0) {
      this.setFlipX(false);
    }
  }

  eatGrass() {
    this.setVelocity(0, 0);
    this.play("sheep_grass_anim", true);
  }

  takeDamage(amount) {
    if (!this.active) return;

    this.health -= amount;

    // Flash rojo
    this.setTint(0xff0000);

    const flashTimer = this.scene.time.delayedCall(100, () => {
      if (!this.active) return;
      this.clearTint();
    });

    this.timers.push(flashTimer);

    // Huir del jugador
    const dx = this.x - this.scene.player.x;
    const dy = this.y - this.scene.player.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      const speed = 100;
      this.setVelocity((dx / length) * speed, (dy / length) * speed);

      const fleeTimer = this.scene.time.delayedCall(500, () => {
        if (!this.active || !this.body) return;
        this.setVelocity(0, 0);
      });

      this.timers.push(fleeTimer);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    // Crear carne en el suelo
    const meat = this.scene.physics.add.sprite(this.x, this.y, "Meat");
    meat.setDepth(meat.y);

    // ⚡ Muy importante: asignar tipo y agregar al grupo
    meat.setData("type", "meat");
    this.scene.dropsGroup.add(meat);

    // Destruir hitbox
    if (this.interactionZone) {
      this.interactionZone.destroy();
    }

    // Destruir oveja
    this.destroy();
  }
}
