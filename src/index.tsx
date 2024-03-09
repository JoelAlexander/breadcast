require('dotenv').config()
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { periodicallySaveIpfsCachedImagesMiddleware } from './middleware/ipfsCachedGeneratedImage'
import { handleRecipeFrame } from './frames/handlers'
import { parseFrameArgs } from './config/argumentHelpers'

import type { FrameSignaturePacket } from './types'
import { pinBufferToIPFS } from './helpers/ipfsHelpers'
import { RecipeData } from './model/recipe'


const frameApp = new Hono()

frameApp.use('*', periodicallySaveIpfsCachedImagesMiddleware)

frameApp.get('/:recipeId', async (c) => {
  const parsed = parseFrameArgs(c)
  if (parsed == null) {
    c.status(404)
    return c.body(`Recipe not found`)
  }
  const { recipeId, recipeData, scale, screen, page } = parsed;
  const htmlString = await handleRecipeFrame(c.req.url, recipeId, recipeData, scale, screen, page)
  return c.html(htmlString)
})

frameApp.post('/:recipeId/:scale?/:screen?/:page?', async (c) => {
  const parsed = parseFrameArgs(c)
  if (parsed == null) {
    c.status(404)
    return c.text(`Recipe not found`)
  }
  const { recipeId, recipeData, scale, screen, page } = parsed;
  const htmlString = await handleRecipeFrame(c.req.url, recipeId, recipeData, scale, screen, page)
  return c.html(htmlString)
})

const framePort = 3000

console.log(`Server is running on port ${framePort}`)

serve({
  fetch: frameApp.fetch,
  port: framePort,
})

const ingestApp = new Hono()

ingestApp.post(async (c) => {
  const cid = await pinBufferToIPFS("dakjdnfakjsdfkanj", Buffer.from(await c.req.arrayBuffer()))
  console.log(`Received recipe: ${cid}`)
  return c.text('Uploaded recipe blob: ')
})

const ingestPort = 3001

console.log(`Ingest endpoint is running on port ${ingestPort}`)

serve({
  fetch: ingestApp.fetch,
  port: ingestPort
})