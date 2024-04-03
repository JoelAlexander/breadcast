export const MAX_SCALE = 4
export const MIN_SCALE = 1

export enum RecipeScreen {
  TITLE = 'title',
  INGREDIENTS = 'ingredients',
  STEPS = 'steps',
  COMPLETED = 'complete'
}

export interface RecipeFrameArguments {
  recipeCid: string
  screen: RecipeScreen
  scale: number
  page: number
}

export interface RecipeFrameContext {
  url: URL
  args: RecipeFrameArguments
  recipeData: RecipeData
}

export interface RecipeSet {
  [key: string]: string
}

export interface IngredientData {
  name: string
  quantity: number
  unit: string
}

export interface RecipeData {
  title: string
  description: string
  totalTimeMinutes: number
  activeTimeMinutes: number
  yields: string
  ingredients: IngredientData[]
  steps: string[]
  imageCid: string
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

export const getTitlePageUrl = (originUrl: URL, recipeCid: string, scale: number) => {
  return `https://${originUrl.hostname}/${recipeCid}?scale=${scale}&screen=${RecipeScreen.TITLE}`
}

export const getIngredientsPageUrl = (originUrl: URL, recipeCid: string, scale: number, page: number) => {
  return `https://${originUrl.hostname}/${recipeCid}?scale=${scale}&screen=${RecipeScreen.INGREDIENTS}&page=${page}`
}

export const getStepsPageUrl = (originUrl: URL, recipeCid: string, scale: number, page: number) => {
  return `https://${originUrl.hostname}/${recipeCid}?scale=${scale}&screen=${RecipeScreen.STEPS}&page=${page}`
}

export const getCompletedPageUrl = (originUrl: URL, recipeCid: string, scale: number) => {
  return `https://${originUrl.hostname}/${recipeCid}?scale=${scale}&screen=${RecipeScreen.COMPLETED}`
}

export const getTitleImageKey = (recipeCid: string, scale: number) => {
  return `${recipeCid}-title-${scale}`
}

export const getIngredientsImageKey = (recipeCid: string, scale: number, page: number) => {
  return `${recipeCid}-ingredients-${scale}-${page}`
}

export const getStepImageKey = (recipeCid: string, scale: number, step: number) => {
  return `${recipeCid}-step-${scale}-${step}`
}

export const getCompletedImageKey = (recipeCid: string) => {
  return `${recipeCid}-completed`
}
