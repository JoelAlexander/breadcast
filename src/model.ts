export const MAX_SCALE = 4
export const MIN_SCALE = 1

export enum FrameScreen {
  TITLE = 'title',
  INGREDIENTS = 'ingredients',
  STEPS = 'steps',
  COMPLETED = 'complete'
}

export interface BreadcastFrameArguments {
  recipeCid: string
  screen: FrameScreen
  scale: number
  page: number
}

export interface BreadcastFrameContext {
  url: URL
  args: BreadcastFrameArguments
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
  totalTime: number
  activeTime: number
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
  return `${originUrl.origin}/${recipeCid}?scale=${scale}&screen=${FrameScreen.TITLE}`
}

export const getIngredientsPageUrl = (originUrl: URL, recipeCid: string, scale: number, page: number) => {
  return `${originUrl.origin}/${recipeCid}?scale=${scale}&screen=${FrameScreen.INGREDIENTS}&page=${page}`
}

export const getStepsPageUrl = (originUrl: URL, recipeCid: string, scale: number, page: number) => {
  return `${originUrl.origin}/${recipeCid}?scale=${scale}&screen=${FrameScreen.STEPS}&page=${page}`
}

export const getCompletedPageUrl = (originUrl: URL, recipeCid: string, scale: number) => {
  return `${originUrl.origin}/${recipeCid}?scale=${scale}&screen=${FrameScreen.COMPLETED}`
}

export const getTitleImageKey = (scale: number) => {
  return `title-${scale}`
}

export const getIngredientsImageKey = (scale: number, page: number) => {
  return `ingredients-${scale}-${page}`
}

export const getStepImageKey = (scale: number, step: number) => {
  return `step-${scale}-${step}`
}

export const getCompletedImageKey = () => {
  return `completed`
}
