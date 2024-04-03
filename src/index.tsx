import { default as dotenv } from 'dotenv'
dotenv.config()
import { serve } from '@hono/node-server'
import { Hono, Context } from 'hono'
import { RecipeScreen, MIN_SCALE, MAX_SCALE, RecipeData } from './model'
import { getRecipeData, getRecipeAssetUrl, getRecipeSet, getCachedRecipeData } from './fileHelpers'
import { cid } from 'is-ipfs'
import { BREADCAST_ENV } from './environment'
import { downloadIPFSJson } from './ipfsHelpers'
import { HtmlEscapedString } from 'hono/utils/html'
import { RecipeFrameContext, RecipeFrameArguments } from './model'
import { getRecipeAssetKey, getRecipeFrameResponse } from './response/recipe'
import { getPinnedRecipeFrameImage, getCachedRecipeFrameImage } from './display/recipe'
import { url } from 'inspector'
import { handle } from './response/generate'
import { FrameSignaturePacket } from './types'
import { validateMessageBytes } from './farcaster'

interface RecipeFrameSupplier {
  getRecipeData: (recipeCid: string) => Promise<RecipeData | undefined>
  getFrameImage: (frameContext: RecipeFrameContext) => Promise<string>
  getFrameResponse: (frameImage: string, frameContext: RecipeFrameContext) => Promise<HtmlEscapedString>
}

const PrerenderedRecipeSupplier: RecipeFrameSupplier = {
  getRecipeData: async (recipeCid: string) => {
    return getRecipeData(recipeCid)
  },
  getFrameImage: async (frameContext: RecipeFrameContext): Promise<string> => {
    return getRecipeAssetUrl(frameContext.args.recipeCid, getRecipeAssetKey(frameContext))
  },
  getFrameResponse: async (frameImage: string, frameContext: RecipeFrameContext) => {
    return getRecipeFrameResponse(frameImage, frameContext)
  }
}

const LazyPinnedRecipeSupplier: RecipeFrameSupplier = {
  getRecipeData: async (cid) => {
    const recipeSet = await getRecipeSet()
    const recipeCidSet = new Set(Object.values(recipeSet))
    if (!recipeCidSet.has(cid)) return undefined
    return getCachedRecipeData(cid)
  },
  getFrameImage: async (frameContext: RecipeFrameContext): Promise<string> => {
    return getPinnedRecipeFrameImage(frameContext)
  },
  getFrameResponse: async (frameImage: string, frameContext: RecipeFrameContext) => {
    return getRecipeFrameResponse(frameImage, frameContext)
  }
}

const LiveRenderedRecipeSupplier: RecipeFrameSupplier = {
  getRecipeData: async (cid) => {
    const recipeSet = await getRecipeSet()
    const recipeCidSet = new Set(Object.values(recipeSet))
    if (!recipeCidSet.has(cid)) return undefined
    return getCachedRecipeData(cid)
  },
  getFrameImage: async (frameContext: RecipeFrameContext): Promise<string> => {
    return getCachedRecipeFrameImage(frameContext)
  },
  getFrameResponse: async (frameImage: string, frameContext: RecipeFrameContext) => {
    return getRecipeFrameResponse(frameImage, frameContext)
  }
}

function parseScreenFromString(value: string | undefined): RecipeScreen {
  const entries = Object.entries(RecipeScreen);
  for (let [key, enumValue] of entries) {
    if (value === enumValue) {
      return RecipeScreen[key as keyof typeof RecipeScreen];
    }
  }
  return RecipeScreen.TITLE
}

const parseFrameArguments = (c: Context): RecipeFrameArguments => {
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

  const frameContext: RecipeFrameContext = {
    url: new URL(c.req.url),
    args: parsed,
    recipeData: recipeData
  }

  const frameImage = await supplier.getFrameImage(frameContext)
  const htmlString = await supplier.getFrameResponse(frameImage, frameContext)
  return c.html(htmlString)
}

const handleGenerateHtml = async (c: Context): Promise<Response> => {
  return c.html(await handle("Potluck meal, main.", "I have some corn and beans at least"))
}

const handlePostGenerateHtml = async (c: Context): Promise<Response> => {
  const framePostData = await c.req.json<FrameSignaturePacket>()
  const unvalidatedSignedMessage = framePostData.trustedData?.messageBytes
  const validatedMessage = await validateMessageBytes(unvalidatedSignedMessage)
  console.log(`${JSON.stringify(validatedMessage)}`)
  return c.html(await handle("Potluck meal, main.", "I have some corn and beans at least"))
}

const framePort = 3000

console.log(`Server is running on port ${framePort}`)

frameApp
  .get('/generate', handleGenerateHtml)
  .post('/generate', handlePostGenerateHtml)

frameApp.get('/:recipeCid', handleRecipeHtml)
frameApp.post('/:recipeCid', handleRecipeHtml)


serve({
  fetch: frameApp.fetch,
  port: framePort,
})
