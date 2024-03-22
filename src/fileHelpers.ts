import fs from 'fs'
import { RecipeData } from './model';
import { RenderedRecipeSet } from './model';
import { downloadIPFSBuffer, getIPFSUrl } from './ipfsHelpers';
import { RENDERED_RECIPES_FILE } from './environment';

const RELOAD_INTERVAL = 10000

var loaded: RenderedRecipeSet = {}
var lastLoaded = Date.now()

export const loadRenderedRecipeSetFromDisk = (): RenderedRecipeSet => {
  try {
      return JSON.parse(fs.readFileSync(RENDERED_RECIPES_FILE, 'utf8'))
  } catch (e) {
    return {}
  }
}

export const getRenderedRecipeSet = (): RenderedRecipeSet => {
  if (Date.now() > lastLoaded + RELOAD_INTERVAL) {
    loaded = loadRenderedRecipeSetFromDisk()
  }
  return loaded
}

export const recipeDataExists = (recipeId: string): boolean => {
  const recipeSet = getRenderedRecipeSet()
  return Boolean(recipeSet[recipeId]?.recipeData)
}

export const getRecipeData = (recipeId: string): RecipeData => {
  const recipeSet = getRenderedRecipeSet()
  return recipeSet[recipeId]?.recipeData
}

export const getRecipeAssetCid = (recipeId: string, key: string): string => {
  const recipeData = getRenderedRecipeSet()
  return recipeData[recipeId].assetCids[key]
}

export const getRecipeAssetUrl = (recipeId: string, key: string): string => {
  return getIPFSUrl(getRecipeAssetCid(recipeId, key))
}

export const downloadBase64PngImage = async (cid: string): Promise<string> => {
  const buffer = await downloadIPFSBuffer(cid)
  return `data:image/png;base64,${buffer.toString('base64')}`
}
