export enum FrameScreen {
    TITLE = 'title',
    INGREDIENTS = 'ingredients',
    STEPS = 'steps',
    COMPLETED = 'complete'
}

export interface IngredientData {
    name: string,
    quantity: number,
    unit: string
}
  
export interface RecipeData {
    title: string;
    description: string,
    totalTime: number;
    activeTime: number;
    yields: string;
    ingredients: IngredientData[];
    steps: string[];
}

export const getIngredientPages = (recipeData: RecipeData) => {
    const PAGE_SIZE = 5
    const totalPages =  Math.ceil(recipeData.ingredients.length / PAGE_SIZE)
    const pages = []
    for (let page = 0; page < totalPages; page++) {
      const pageIngredients = recipeData.ingredients.slice(page * PAGE_SIZE, ((page + 1) * PAGE_SIZE))
      pages.push(pageIngredients)
    }
    return pages
}