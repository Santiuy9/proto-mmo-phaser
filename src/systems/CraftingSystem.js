// systems/CraftingSystem.js - VERSIÓN CORREGIDA
export default class CraftingSystem {
  constructor(scene) {
    this.scene = scene;
    this.recipes = [
      {
        name: "Hacha de piedra",
        key: "stoneAxe",
        materials: { wood: 1, stone: 2 },
        type: "axe",
        power: 2,
        maxDurability: 20,
      },
      {
        name: "Pico de piedra",
        key: "stonePickaxe",
        materials: { wood: 1, stone: 2 },
        type: "pickaxe",
        power: 2,
        maxDurability: 20,
      },
      {
        name: "Espada de piedra",
        key: "stoneSword",
        materials: { wood: 2, stone: 1 },
        type: "sword",
        power: 3,
        maxDurability: 30,
      },
      {
        name: "Mochila Pequeña",
        key: "backpack_tier2",
        materials: { leather: 5, thread: 3 }, // Materiales que deberías tener
        type: "backpack",
        tier: 2,
      },
      {
        name: "Mochila Mediana",
        key: "backpack_tier3",
        materials: { leather: 10, iron: 2 },
        type: "backpack",
        tier: 3,
      },
    ];
  }

  // 🔥 NUEVO: Obtener cantidad de un material del inventario real
  countMaterial(type) {
    if (!this.scene.inventorySystem) return 0;

    let total = 0;
    const items = this.scene.inventorySystem.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i] && items[i].type === type) {
        total += items[i].count;
      }
    }

    return total;
  }

  // Verificar si se puede craftear
  canCraft(recipe) {
    const materials = recipe.materials;

    for (let material in materials) {
      const needed = materials[material];
      const have = this.countMaterial(material);
      if (have < needed) return false;
    }

    return true;
  }

  // Consumir materiales del inventario
  consumeMaterials(materials) {
    const inv = this.scene.inventorySystem;
    if (!inv) return;

    for (let material in materials) {
      let needed = materials[material];

      for (let i = 0; i < inv.items.length; i++) {
        if (needed <= 0) break;

        if (inv.items[i] && inv.items[i].type === material) {
          const available = inv.items[i].count;
          const remove = Math.min(available, needed);

          inv.items[i].count -= remove;
          needed -= remove;

          if (inv.items[i].count <= 0) {
            inv.items[i] = { type: null, count: 0, maxStack: 64 };
          }
        }
      }
    }

    // Actualizar visual
    inv.update();
  }

  // Buscar slot vacío
  findEmptySlot() {
    const inv = this.scene.inventorySystem;
    for (let i = 0; i < inv.items.length; i++) {
      if (!inv.items[i] || !inv.items[i].type || inv.items[i].count === 0) {
        return i;
      }
    }
    return -1;
  }

  // Ejecutar crafteo
  craft(recipeIndex) {
    const recipe = this.recipes[recipeIndex];
    if (!recipe) return false;

    if (!this.canCraft(recipe)) {
      this.scene.ui.showMessage("❌ Faltan materiales");
      return false;
    }

    // Consumir materiales
    this.consumeMaterials(recipe.materials);

    // Añadir herramienta al inventario
    this.scene.inventorySystem.addItem(recipe.key, 1);

    this.scene.ui.showMessage(`✅ ${recipe.name} creada!`);
    return true;
  }
}
