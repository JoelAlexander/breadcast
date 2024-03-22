import { BreadcastFrameContext, MAX_SCALE, MIN_SCALE, RecipeData, getCompletedImageKey, getCompletedPageUrl, getIngredientPages, getIngredientsImageKey, getIngredientsPageUrl, getStepImageKey, getStepsPageUrl, getTitleImageKey, getTitlePageUrl } from "./model"
import { html, raw } from 'hono/html'
import { FrameScreen } from './model';
import { getRecipeAssetCid, getRecipeAssetUrl } from "./fileHelpers";
import { generateErrorPage, generateErrorImage } from "./recipeDisplay";

const createFrameButton = (buttonNumber: number, content: string, target: string = '') => {
    var button = `<meta property="fc:frame:button:${buttonNumber}" content="${content}" />`
    if (target != '') {
        button += `<meta property="fc:frame:button:${buttonNumber}:action" content="post" />`
        button += `<meta property="fc:frame:button:${buttonNumber}:target" content="${target}" />`
    }
    return button
}
  
const handleTitleScreen = async (frameImage: string, frameContext: BreadcastFrameContext) => {
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }

    addButton("Ingredients",
      getIngredientsPageUrl(
        frameContext.url,
        frameContext.args.recipeCid,
        frameContext.args.scale,
        1))

    addButton("Steps",
      getStepsPageUrl(
        frameContext.url, 
        frameContext.args.recipeCid,
        frameContext.args.scale,
        1))
  
    if (frameContext.args.scale > MIN_SCALE) {
        addButton("Scale -", getTitlePageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.min(MAX_SCALE, frameContext.args.scale - 1)))
    }

    if (frameContext.args.scale < MAX_SCALE) {
        addButton("Scale +", getTitlePageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.max(MIN_SCALE, frameContext.args.scale + 1)))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${frameContext.url}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
            <body />
        </html>`

    return frameHeadTemplate
}
  
const handleIngredientsScreen = async (frameImage: string, frameContext: BreadcastFrameContext) => {
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    const getPageUrl = (pageNum: number) => {
        return getIngredientsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          frameContext.args.scale,
          pageNum)
    }
  
    const pages = getIngredientPages(frameContext.recipeData)
    const selectedPageNumber = Math.max(1, Math.min(pages.length, frameContext.args.page))
    
    if (selectedPageNumber > 1) {
        addButton("<", getPageUrl(selectedPageNumber - 1))
    } else {
        addButton("Back", getTitlePageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          frameContext.args.scale))
    }
  
    if (pages.length > selectedPageNumber) {
        addButton(">", getPageUrl(selectedPageNumber + 1))
    } else {
        addButton("Begin", getStepsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          frameContext.args.scale, 1))
    }

    if (frameContext.args.scale > MIN_SCALE) {
        addButton("Scale -", getIngredientsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.min(MAX_SCALE, frameContext.args.scale - 1),
          frameContext.args.page))
    }

    if (frameContext.args.scale < MAX_SCALE) {
        addButton("Scale +", getIngredientsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.max(MIN_SCALE, frameContext.args.scale + 1),
          frameContext.args.page))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${frameContext.url}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
          <body />
        </html>`
  
    return frameHeadTemplate
}
  
const handleStepScreen = async (frameImage: string, frameContext: BreadcastFrameContext) => {
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    const getStepUrl = (stepNum: number) => {
        return getStepsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          frameContext.args.scale, stepNum)
    }
  
    const selectedStepNumber = Math.max(1, Math.min(frameContext.recipeData.steps.length, frameContext.args.page))
    if (selectedStepNumber > 1) {
        addButton("<", getStepUrl(selectedStepNumber - 1))
    } else {
        addButton("Back",
          getTitlePageUrl(
            frameContext.url,
            frameContext.args.recipeCid,
            frameContext.args.scale))
    }
  
    if (frameContext.recipeData.steps.length > selectedStepNumber) {
        addButton(">", getStepUrl(selectedStepNumber + 1))
    } else {
        addButton("Finished 🎉",
          getCompletedPageUrl(
            frameContext.url,
            frameContext.args.recipeCid,
            frameContext.args.scale))
    }

    if (frameContext.args.scale > MIN_SCALE) {
        addButton("Scale -", getStepsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.min(MAX_SCALE, frameContext.args.scale - 1),
          frameContext.args.page))
    }

    if (frameContext.args.scale < MAX_SCALE) {
        addButton("Scale +", getStepsPageUrl(
          frameContext.url,
          frameContext.args.recipeCid,
          Math.max(MIN_SCALE, frameContext.args.scale + 1),
          frameContext.args.page))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
          <head>
            <meta property="og:image" content="${frameImage}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${frameContext.url}" />
            <meta property="fc:frame:image" content="${frameImage}" />
            ${raw(buttons)}
          </head>
          <body />
        </html>`
  
    return frameHeadTemplate
}
  
const handleCompletedScreen = async (frameImage: string, frameContext: BreadcastFrameContext) => {
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }

    addButton("Return to Start", getTitlePageUrl(frameContext.url, frameContext.args.recipeCid, frameContext.args.scale))
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${frameContext.url}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
            <body />
        </html>`
  
    return frameHeadTemplate
}

export const handleErrorScreen = async (frameImage: string) => {

  const frameHeadTemplate = html`
      <html lang="en">
          <head>
              <meta property="og:image" content="${frameImage}" />
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${frameImage}" />
          </head>
          <body />
      </html>`

  return frameHeadTemplate
}

export const getRecipeAssetKey = (frameContext: BreadcastFrameContext) => {
  switch (frameContext.args.screen) {
      default:
      case FrameScreen.TITLE:
          return getTitleImageKey(frameContext.args.scale)
      case FrameScreen.INGREDIENTS:
          return getIngredientsImageKey(frameContext.args.scale, frameContext.args.page)
      case FrameScreen.STEPS:
          return getStepImageKey(frameContext.args.scale, frameContext.args.page)
      case FrameScreen.COMPLETED:
          return getCompletedImageKey()
  }
}

export const getFrameResponse = (frameImage: string, frameContext: BreadcastFrameContext) => {
  switch (frameContext.args.screen) {
      default:
      case FrameScreen.TITLE:
          return handleTitleScreen(frameImage, frameContext)
      case FrameScreen.INGREDIENTS:
          return handleIngredientsScreen(frameImage, frameContext)
      case FrameScreen.STEPS:
          return handleStepScreen(frameImage, frameContext)
      case FrameScreen.COMPLETED:
          return handleCompletedScreen(frameImage, frameContext)
  }
}
