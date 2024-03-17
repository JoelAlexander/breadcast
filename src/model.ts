export const MAX_SCALE = 8
export const MIN_SCALE = 1

export enum FrameScreen {
  TITLE = 'title',
  INGREDIENTS = 'ingredients',
  STEPS = 'steps',
  COMPLETED = 'complete'
}

export interface RecipeSetEntry {
  jsonCid: string
  imageCid: string
}

export interface RecipeSet {
  [key: string]: RecipeSetEntry
}

export interface IngredientData {
  name: string
  quantity: number
  unit: string
}
  
export interface RecipeData {
  title: string
  description: string
  totalTime: number
  activeTime: number
  yields: string
  ingredients: IngredientData[]
  steps: string[]
}

export interface RenderedRecipe {
  recipeData: RecipeData
  assetCids: {[key: string]: string}
}

export interface RenderedRecipeSet {
  [key: string]: RenderedRecipe
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

export const getTitlePageUrl = (originUrl: URL, recipeId: string, scale: number) => {
  return `${originUrl.origin}/${recipeId}?scale=${scale}&screen=${FrameScreen.TITLE}`
}

export const getIngredientsPageUrl = (originUrl: URL, recipeId: string, scale: number, page: number) => {
  return `${originUrl.origin}/${recipeId}?scale=${scale}&screen=${FrameScreen.INGREDIENTS}&page=${page}`
}

export const getStepsPageUrl = (originUrl: URL, recipeId: string, scale: number, page: number) => {
  return `${originUrl.origin}/${recipeId}?scale=${scale}&screen=${FrameScreen.STEPS}&page=${page}`
}

export const getCompletedPageUrl = (originUrl: URL, recipeId: string, scale: number) => {
  return `${originUrl.origin}/${recipeId}?scale=${scale}&screen=${FrameScreen.COMPLETED}`
}

export const getTitleImageKey = (scale: number) => {
  return `${scale}-title`
}

export const getIngredientsImageKey = (scale: number, page: number) => {
  return `${scale}-ingredients-${page}`
}

export const getStepImageKey = (scale: number, step: number) => {
  return `${scale}-step-${step}`
}

export const getCompletedImageKey = () => {
  return `completed`
}
