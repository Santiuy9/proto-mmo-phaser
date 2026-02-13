// entities/Entity.js
export default class Entity extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config = {}) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Propiedades básicas
    this.hp = config.hp || 10;
    this.maxHp = config.maxHp || this.hp;
    this.type = config.type || "entity";
    this.data = config.data || {};

    // Configuración física
    this.setSize(config.width || 50, config.height || 50);
    this.setOffset(config.offsetX || 0, config.offsetY || 0);
    this.setCollideWorldBounds(config.collideWorldBounds || true);
  }

  takeDamage(amount, source) {
    this.hp -= amount;

    // Efecto visual común
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => this.clearTint());

    if (this.hp <= 0) {
      this.die(source);
    }

    return this.hp;
  }

  die(source) {
    // Sobrescribir en cada entidad
    this.destroy();
  }

  update(time, delta) {
    // Para sobrescribir
    this.setDepth(this.y + (this.depthOffset || 80));
  }
}
