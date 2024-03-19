import fs from 'fs'
import { RecipeData } from './model';
import { join } from 'path';
import { RenderedRecipeSet } from './model';
import { downloadIPFSBuffer, getIPFSUrl } from './ipfsHelpers';

const RELOAD_INTERVAL = 10000

const BASE_DIR = process.cwd()
const BREADCAST_BASE_DIR = process.env.BREADCAST_ENV ?? BASE_DIR
const BREADCAST_ENV = process.env.ACTIVE_ENV ?? ""
const RENDERED_RECIPES_FILE = join(BREADCAST_BASE_DIR, BREADCAST_ENV, 'rendered-recipes.json')

var loaded: RenderedRecipeSet = {}
var lastLoaded = Date.now()

export const loadRenderedRecipeSetFromDisk = (): RenderedRecipeSet => {
  try {
      return JSON.parse(fs.readFileSync(RENDERED_RECIPES_FILE, 'utf8'))
  } catch (e) {
    console.log(`Could not load ${RENDERED_RECIPES_FILE}`)
    return {}
  }
}

export const getRenderedRecipeSet = (): RenderedRecipeSet => {
  if (Date.now() > lastLoaded + RELOAD_INTERVAL) {
    loaded = loadRenderedRecipeSetFromDisk()
  }
  return loaded
}

export const getRecipeData = (recipeId: string): RecipeData | undefined => {
  const recipeSet = getRenderedRecipeSet()
  if (recipeSet[recipeId]) {
    return recipeSet[recipeId].recipeData
  } else {
    return undefined
  }
}

export const getRecipeAssetCid = (recipeId: string, key: string): string | undefined => {
  const recipeData = getRenderedRecipeSet()
  if (recipeData[recipeId]) {
    return recipeData[recipeId].assetCids[key]
  } else {
    return undefined
  }
}

export const getRecipeAssetUrl = (recipeId: string, key: string): string | undefined => {
  const cid = getRecipeAssetCid(recipeId, key)
  return cid ? getIPFSUrl(cid) : undefined
}

export const downloadBase64Image = async (cid: string): Promise<string> => {
  const buffer = await downloadIPFSBuffer(cid)
  return buffer.toString('base64')
}
