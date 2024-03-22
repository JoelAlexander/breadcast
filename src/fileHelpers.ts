import { readFileSync, existsSync } from 'fs';
import { RecipeData } from './model';
import { RenderedRecipeSet, RecipeSet } from './model';
import { downloadIPFSBuffer, getIPFSUrl } from './ipfsHelpers';
import { RENDERED_RECIPES_FILE, RECIPES_FILE } from './environment';
import sharp from 'sharp';

const RELOAD_INTERVAL = 10000

var renderedRecipeSet: RenderedRecipeSet | undefined
var lastLoadedRenderedRecipeSet = Date.now()

var recipeSet: RecipeSet | undefined
var lastLoadedRecipeSet = Date.now()

const loadJson = (file: string): any => {
  return JSON.parse(readFileSync(file, 'utf8'))
}

export const loadRenderedRecipeSetFromDisk = (): RenderedRecipeSet => {
  try {
      return loadJson(RENDERED_RECIPES_FILE)
  } catch (e) {
    return {}
  }
}

export const loadRecipeSetFromDisk = (): RecipeSet => {
  try {
    return loadJson(RECIPES_FILE)
  } catch (e) {
    return {}
  }
}

export const getRenderedRecipeSet = (): RenderedRecipeSet => {
  if (renderedRecipeSet === undefined ||
    Date.now() > lastLoadedRenderedRecipeSet + RELOAD_INTERVAL) {
    console.log(`Reloading ${RENDERED_RECIPES_FILE} from disk`)
    renderedRecipeSet = loadRenderedRecipeSetFromDisk()
    lastLoadedRenderedRecipeSet = Date.now()
  }
  return renderedRecipeSet
}

export const getRecipeSet = (): RecipeSet => {
  if (recipeSet === undefined ||
    Date.now() > lastLoadedRecipeSet + RELOAD_INTERVAL) {
    console.log(`Reloading ${RECIPES_FILE} from disk`)
    recipeSet = loadRecipeSetFromDisk()
    lastLoadedRecipeSet = Date.now()
  }
  return recipeSet
}

export const loadRecipeFromDisk = (filePath: string): RecipeData => {
  return loadJson(filePath)
}

export const recipeDataExists = (recipeCid: string): boolean => {
  const recipeSet = getRenderedRecipeSet()
  return Boolean(recipeSet[recipeCid]?.recipeData)
}

export const getRecipeData = (recipeCid: string): RecipeData => {
  const recipeSet = getRenderedRecipeSet()
  return recipeSet[recipeCid]?.recipeData
}

export const getRecipeAssetCid = (recipeCid: string, key: string): string => {
  const recipeData = getRenderedRecipeSet()
  return recipeData[recipeCid].assetCids[key]
}

export const getRecipeAssetUrl = (recipeCid: string, key: string): string => {
  return getIPFSUrl(getRecipeAssetCid(recipeCid, key))
}

export const pngDataUri = (buffer: Buffer) => {
  return `data:image/png;base64,${buffer.toString('base64')}`
}

export const downloadBase64PngImage = async (cid: string): Promise<string> => {
  const pngBuffer = await downloadIPFSBuffer(cid)
  return pngDataUri(pngBuffer)
}
