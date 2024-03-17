import { MAX_SCALE, MIN_SCALE, RecipeData, getCompletedImageKey, getCompletedPageUrl, getIngredientPages, getIngredientsImageKey, getIngredientsPageUrl, getStepImageKey, getStepsPageUrl, getTitleImageKey, getTitlePageUrl } from "./model"
import { html, raw } from 'hono/html'
import { FrameScreen } from './model';
import { getRecipeAssetCid, getRecipeAssetUrl } from "./fileHelpers";

const createFrameButton = (buttonNumber: number, content: string, target: string = '') => {
    var button = `<meta property="fc:frame:button:${buttonNumber}" content="${content}" />`
    if (target != '') {
        button += `<meta property="fc:frame:button:${buttonNumber}:action" content="post" />`
        button += `<meta property="fc:frame:button:${buttonNumber}:target" content="${target}" />`
    }
    return button
}
  
const handleTitleScreen = async (recipeId: string, requestUrl: string, scale: number) => {
    const url = new URL(requestUrl)
    console.log("Getting frame image")
    const frameImage = getRecipeAssetUrl(recipeId, getTitleImageKey(scale))
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    addButton("Ingredients", getIngredientsPageUrl(url, recipeId, scale, 1))
    addButton("Steps", getStepsPageUrl(url, recipeId, scale, 1))
  
    if (scale > MIN_SCALE) {
        addButton("Scale -", getTitlePageUrl(url, recipeId, Math.min(MAX_SCALE, scale - 1)))
    }

    if (scale < MAX_SCALE) {
        addButton("Scale +", getTitlePageUrl(url, recipeId, Math.max(MIN_SCALE, scale + 1)))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${requestUrl}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
            <body />
        </html>`

    return frameHeadTemplate
}
  
const handleIngredientsScreen = async (recipeId: string,  recipeData: RecipeData, requestUrl: string, scale: number, page: number) => {
    const url = new URL(requestUrl)
    const frameImage = getRecipeAssetUrl(recipeId, getIngredientsImageKey(scale, page))
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    const getPageUrl = (pageNum: number) => {
        return getIngredientsPageUrl(url, recipeId, scale, pageNum)
    }
  
    const pages = getIngredientPages(recipeData)
    const selectedPageNumber = Math.max(1, Math.min(pages.length, page))
    
    if (selectedPageNumber > 1) {
        addButton("<", getPageUrl(selectedPageNumber - 1))
    } else {
        addButton("Back", getTitlePageUrl(url, recipeId, scale))
    }
  
    if (pages.length > selectedPageNumber) {
        addButton(">", getPageUrl(selectedPageNumber + 1))
    } else {
        addButton("Begin", getStepsPageUrl(url, recipeId, scale, 1))
    }

    if (scale > MIN_SCALE) {
        addButton("Scale -", getIngredientsPageUrl(url, recipeId, Math.min(MAX_SCALE, scale - 1), page))
    }

    if (scale < MAX_SCALE) {
        addButton("Scale +", getIngredientsPageUrl(url, recipeId, Math.max(MIN_SCALE, scale + 1), page))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${url}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
          <body />
        </html>`
  
    return frameHeadTemplate
}
  
const handleStepScreen = async (recipeId: string, recipeData: RecipeData, requestUrl: string, scale: number, step: number) => {
    const url = new URL(requestUrl)
    const frameImage = getRecipeAssetUrl(recipeId, getStepImageKey(scale, step))
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    const getStepUrl = (stepNum: number) => {
        return getStepsPageUrl(url, recipeId, scale, stepNum)
    }
  
    const selectedStepNumber = Math.max(1, Math.min(recipeData.steps.length, step))
    if (selectedStepNumber > 1) {
        addButton("<", getStepUrl(selectedStepNumber - 1))
    } else {
        addButton("Back", getTitlePageUrl(url, recipeId, scale))
    }
  
    if (recipeData.steps.length > selectedStepNumber) {
        addButton(">", getStepUrl(selectedStepNumber + 1))
    } else {
        addButton("Finished 🎉", getCompletedPageUrl(url, recipeId, scale))
    }

    if (scale > MIN_SCALE) {
        addButton("Scale -", getStepsPageUrl(url, recipeId, Math.min(MAX_SCALE, scale - 1), step))
    }

    if (scale < MAX_SCALE) {
        addButton("Scale +", getStepsPageUrl(url, recipeId, Math.max(MIN_SCALE, scale + 1), step))
    }
  
    const frameHeadTemplate = html`
        <html lang="en">
          <head>
            <meta property="og:image" content="${frameImage}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${url}" />
            <meta property="fc:frame:image" content="${frameImage}" />
            ${raw(buttons)}
          </head>
          <body />
        </html>`
  
    return frameHeadTemplate
}
  
const handleCompletedScreen = async (recipeId: string, requestUrl: string, scale: number) => {
    const url = new URL(requestUrl)
    const frameImage = getCompletedImageKey()
    var buttonsCount = 0
    var buttons = ''
  
    const addButton = (content: string, target: string) => {
        buttonsCount++;
        buttons += createFrameButton(buttonsCount, content, target)
    }
  
    addButton("Return to Start", getTitlePageUrl(url, recipeId, scale))
  
    const frameHeadTemplate = html`
        <html lang="en">
            <head>
                <meta property="og:image" content="${frameImage}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:post_url" content="${url}" />
                <meta property="fc:frame:image" content="${frameImage}" />
                ${raw(buttons)}
            </head>
            <body />
        </html>`
  
    return frameHeadTemplate
}

export const handleRecipeFrame = async (postUrl: string, recipeId: string, recipeData: RecipeData, scale: number, screen: FrameScreen, page: number) => {
    switch (screen) {
        case FrameScreen.TITLE:
            return await handleTitleScreen(recipeId, postUrl, scale)
        case FrameScreen.INGREDIENTS:
            return await handleIngredientsScreen(recipeId, recipeData, postUrl, scale, page)
        case FrameScreen.STEPS:
            return await handleStepScreen(recipeId, recipeData, postUrl,  scale, page)
        case FrameScreen.COMPLETED:
            return await handleCompletedScreen(recipeId, postUrl, scale)
    }
}
