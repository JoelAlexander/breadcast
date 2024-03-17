import { default as dotenv } from 'dotenv'
dotenv.config()
import { serve } from '@hono/node-server'
import { Hono, Context } from 'hono'
import { handleRecipeFrame } from './handlers'
import { FrameScreen, MIN_SCALE, MAX_SCALE } from './model'
import { getRecipeData } from './fileHelpers'
import { cid } from 'is-ipfs'

function parseScreenFromString(value: string | undefined): FrameScreen {
  const entries = Object.entries(FrameScreen);
  for (let [key, enumValue] of entries) {
    if (value === enumValue) {
      return FrameScreen[key as keyof typeof FrameScreen];
    }
  }
  return FrameScreen.TITLE
}

export const parseFrameArgs = (c: Context) => {
  const recipeId = c.req.param('recipeId')
  if (!recipeId || !cid(recipeId)) {
    console.log(`Invalid recipe cid ${recipeId}`)
    return null
  }

  const recipeData = getRecipeData(recipeId)
  if (!recipeData) {
    console.log(`Recipe not found on file`)
    return null
  }

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
    recipeId,
    recipeData,
    scale,
    screen,
    page
  }
}

const frameApp = new Hono()

const handleRecipeHtml = async (c: Context) => {
  const parsed = parseFrameArgs(c)
  if (parsed == null) {
    c.status(404)
    return c.text(`Recipe not found`)
  }
  const { recipeId, recipeData, scale, screen, page } = parsed;
  const htmlString = await handleRecipeFrame(c.req.url, recipeId, recipeData, scale, screen, page)
  return c.html(htmlString)
}

const framePort = 3000

console.log(`Server is running on port ${framePort}`)

frameApp.get('/:recipeId', handleRecipeHtml)
frameApp.post('/:recipeId', handleRecipeHtml)

serve({
  fetch: frameApp.fetch,
  port: framePort,
})
