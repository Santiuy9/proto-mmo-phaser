export default class CraftingSystem {
  constructor(scene) {
    this.scene = scene;

    this.recipes = {
      stoneAxe: {
        name: "Hacha de piedra",
        materials: { wood: 1, stone: 2 },
        toolKey: "stoneAxe",
        unlocked: true,
      },
      stonePickaxe: {
        name: "Pico de piedra",
        materials: { wood: 1, stone: 2 },
        toolKey: "stonePickaxe",
        unlocked: true,
      },
      stoneSword: {
        name: "Espada de piedra",
        materials: { wood: 2, stone: 1 },
        toolKey: "stoneSword",
        unlocked: true,
      },
    };

    this.recipeKeys = Object.keys(this.recipes);
    this.selectedIndex = 0;
  }

  canCraft(recipeKey) {
    const recipe = this.recipes[recipeKey];
    const inv = this.scene.inventory;

    for (let mat in recipe.materials) {
      if (inv[mat] < recipe.materials[mat]) return false;
    }
    return true;
  }

  craft(recipeKey) {
    const scene = this.scene;
    const inv = scene.inventory;
    const recipe = this.recipes[recipeKey];

    if (!recipe || !recipe.unlocked) return false;
    if (!this.canCraft(recipeKey)) return false;

    const emptyIndex = scene.tools.findIndex((t) => t === null);
    if (emptyIndex === -1) {
      scene.ui.showMessage("🎒 Inventario lleno");
      return false;
    }

    // Descontar materiales
    for (let mat in recipe.materials) {
      inv[mat] -= recipe.materials[mat];
    }

    const stats = scene.toolStats[recipe.toolKey];

    const newTool = {
      key: recipe.toolKey,
      type: stats.type,
      power: stats.power,
      durability: stats.maxDurability,
      maxDurability: stats.maxDurability,
    };

    scene.tools[emptyIndex] = newTool;
    scene.currentTool = newTool;

    // Actualizar UI correctamente
    scene.ui.updateInventory(inv.wood, inv.stone);
    scene.ui.updateTools(scene.tools, emptyIndex);
    scene.ui.updateToolDurability(newTool);
    scene.ui.refreshInventoryText();
    scene.ui.refreshCraftMenu();

    scene.ui.showMessage("🛠 Herramienta creada!");

    return true;
  }

  moveSelection(dir) {
    const max = this.recipeKeys.length;
    this.selectedIndex = (this.selectedIndex + dir + max) % max;

    if (this.scene.ui.craftOpen) {
      this.scene.ui.selectedRecipeIndex = this.selectedIndex;
      this.scene.ui.refreshCraftMenu();
    }
  }
}
