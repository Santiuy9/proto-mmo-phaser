export default class PlayerStatsSystem {
  constructor(scene) {
    this.scene = scene;

    this.maxHealth = 100;
    this.health = 100;

    this.maxHunger = 100;
    this.hunger = 100;

    this.hungerDrainRate = 1; // cada tick
    this.regenRate = 1;
  }

  update(delta) {
    if (!delta) return;

    this.updateHunger(delta);
    this.updateHealth(delta);
  }

  updateHunger(delta) {
    this.hunger -= this.hungerDrainRate * delta;

    if (this.hunger < 0) this.hunger = 0;
  }

  updateHealth(delta) {
    if (this.hunger === 0) {
      this.health -= 2 * delta;
    }

    if (this.hunger > 70 && this.health < this.maxHealth) {
      this.health += this.regenRate * delta;
    }

    if (this.health > this.maxHealth) this.health = this.maxHealth;
    if (this.health < 0) this.health = 0;
  }

  eat(amount) {
    this.hunger += amount;
    if (this.hunger > this.maxHunger) this.hunger = this.maxHunger;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
  }
}
