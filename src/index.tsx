import { default as dotenv } from 'dotenv'
dotenv.config()
import { serve } from '@hono/node-server'
import { Hono, Context } from 'hono'
import { FrameScreen, MIN_SCALE, MAX_SCALE, RecipeData } from './model'
import { getRecipeData, getRecipeAssetUrl, getRecipeSet } from './fileHelpers'
import { cid } from 'is-ipfs'
import { BREADCAST_ENV } from './environment'
import { downloadIPFSJson } from './ipfsHelpers'
import { HtmlEscapedString } from 'hono/utils/html'
import { BreadcastFrameContext, BreadcastFrameArguments } from './model'
import { getRecipeAssetKey, getFrameResponse } from './handlers'
import { getPinnedFrameImage, generateFrameImageDataUri } from './recipeDisplay'
import { url } from 'inspector'

interface BreadcastFrameSupplier {
  getRecipeData: (recipeCid: string) => Promise<RecipeData | undefined>
  getFrameImage: (frameContext: BreadcastFrameContext) => Promise<string>
  getFrameResponse: (frameImage: string, frameContext: BreadcastFrameContext) => Promise<HtmlEscapedString>
}

const PrerenderedRecipeSupplier: BreadcastFrameSupplier = {
  getRecipeData: async (recipeCid: string) => {
    return getRecipeData(recipeCid)
  },
  getFrameImage: async (frameContext: BreadcastFrameContext): Promise<string> => {
    return getRecipeAssetUrl(frameContext.args.recipeCid, getRecipeAssetKey(frameContext))
  },
  getFrameResponse: async (frameImage: string, frameContext: BreadcastFrameContext) => {
    return getFrameResponse(frameImage, frameContext)
  }
}

const LiveRenderedRecipeSupplier: BreadcastFrameSupplier = {
  getRecipeData: async (cid) => {
    const recipeSet = await getRecipeSet()
    const recipeCidSet = new Set(Object.values(recipeSet))
    if (!recipeCidSet.has(cid)) return undefined
    return downloadIPFSJson(cid)
  },
  getFrameImage: async (frameContext: BreadcastFrameContext): Promise<string> => {
    return getPinnedFrameImage(frameContext)
  },
  getFrameResponse: async (frameImage: string, frameContext: BreadcastFrameContext) => {
    return getFrameResponse(frameImage, frameContext)
  }
}

function parseScreenFromString(value: string | undefined): FrameScreen {
  const entries = Object.entries(FrameScreen);
  for (let [key, enumValue] of entries) {
    if (value === enumValue) {
      return FrameScreen[key as keyof typeof FrameScreen];
    }
  }
  return FrameScreen.TITLE
}

const parseFrameArguments = (c: Context): BreadcastFrameArguments => {
  var screen = parseScreenFromString(c.req.query('screen'))
  var scale = parseInt(c.req.query('scale') ?? '1')
  if (Number.isNaN(scale) || scale < MIN_SCALE) {
    scale = MIN_SCALE
  } else if (scale > MAX_SCALE) {
    scale = MAX_SCALE
  }

  var page = parseInt(c.req.query('page') ?? '1')
  if (Number.isNaN(page) || page < 1) {
    page = 1
  }

  return {
    recipeCid: c.req.param('recipeCid'),
    scale,
    screen,
    page
  }
}

const supplier = BREADCAST_ENV === 'dev' ? LiveRenderedRecipeSupplier : PrerenderedRecipeSupplier

const frameApp = new Hono()

const handleRecipeHtml = async (c: Context): Promise<Response> => {

  const recipeCid = c.req.param('recipeCid')
  if (!recipeCid || !cid(recipeCid)) {
    console.log(`Invalid recipe cid ${recipeCid}`)
    return c.text(`Recipe not found`)
  }

  const recipeData = await supplier.getRecipeData(recipeCid)
  if (!recipeData) {
    console.log(`Recipe not found on file`)
    return c.text(`Recipe not found`)
  }

  const parsed = parseFrameArguments(c)
  if (parsed == null) {
    c.status(404)
    return c.text(`Recipe not found`)
  }

  const frameContext: BreadcastFrameContext = {
    url: new URL(c.req.url),
    args: parsed,
    recipeData: recipeData
  }

  const frameImage = await supplier.getFrameImage(frameContext)
  const htmlString = await supplier.getFrameResponse(frameImage, frameContext)
  return c.html(htmlString)
}

const framePort = 3000

console.log(`Server is running on port ${framePort}`)

frameApp.get('/:recipeCid', handleRecipeHtml)
frameApp.post('/:recipeCid', handleRecipeHtml)

serve({
  fetch: frameApp.fetch,
  port: framePort,
})
