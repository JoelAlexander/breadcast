import { FrameScreen } from "../model/recipe"
import { cachedIpfsImage } from "../middleware/ipfsCachedGeneratedImage"
import { generateTitlePage, generateIngredientsPage, generateStepPage, generateCompletedPage } from '../display/recipeDisplay';
import { RecipeData, getIngredientPages } from "../model/recipe"
import { html, raw } from 'hono/html'
import { generateImage } from "../helpers/imageGenerationHelpers";
import { convertImageToBase64 } from "../helpers/fileHelpers";

const MAX_SCALE = 8
const MIN_SCALE = 1

const getTitlePageUrl = (originUrl: URL, recipeId: string, scale: number) => {
    return `${originUrl.origin}/${recipeId}/${scale}/${FrameScreen.TITLE}`
}

const getIngredientsPageUrl = (originUrl: URL, recipeId: string, scale: number, page: number) => {
    return `${originUrl.origin}/${recipeId}/${scale}/${FrameScreen.INGREDIENTS}/${page}`
}

const getStepsPageUrl = (originUrl: URL, recipeId: string, scale: number, page: number) => {
    return `${originUrl.origin}/${recipeId}/${scale}/${FrameScreen.STEPS}/${page}`
}

const getCompletedPageUrl = (originUrl: URL, recipeId: string, scale: number) => {
    return `${originUrl.origin}/${recipeId}/${scale}/${FrameScreen.COMPLETED}`
}

const getTitleImageUrl = async (recipeId: string, recipeData: RecipeData, scale: number) => {
    return cachedIpfsImage(`${recipeId}-x${scale}-title.png`, async () => {
        const backgroundImage = await getBackgroundImageBase64()
        return generateImage(generateTitlePage(recipeData, scale, backgroundImage))
    })
}

const getIngredientsImageUrl = async (recipeId: string, recipeData: RecipeData, scale: number, page: number) => {
    return cachedIpfsImage(`${recipeId}-x${scale}-ingredients-${page}.png`, () => {
        return generateImage(generateIngredientsPage(recipeData, scale, page))
    })
}

const getStepImageUrl = async (recipeId: string, recipeData: RecipeData, scale: number, step: number) => {
    return cachedIpfsImage(`${recipeId}-x${scale}-step-${step}.png`, () => {
        return generateImage(generateStepPage(recipeData, scale, step))
    })
}

const getCompletedImageUrl = async (recipeId: string, recipeData: RecipeData, scale: number) => {
    return cachedIpfsImage(`${recipeId}-x${scale}-completed.png`, () => {
        return generateImage(generateCompletedPage())
    })
}

const getBackgroundImageBase64 = async () => {
    return convertImageToBase64("https://picsum.photos/id/237/200/300")
}

const createFrameButton = (buttonNumber: number, content: string, target: string = '') => {
    var button = `<meta property="fc:frame:button:${buttonNumber}" content="${content}" />`
    if (target != '') {
        button += `<meta property="fc:frame:button:${buttonNumber}:action" content="post" />`
        button += `<meta property="fc:frame:button:${buttonNumber}:target" content="${target}" />`
    }
    return button
}
  
const handleTitleScreen = async (requestUrl: string, recipeId: string, recipeData: RecipeData, scale: number) => {
    const url = new URL(requestUrl)
    console.log("Getting frame image")
    const frameImage = await getTitleImageUrl(recipeData.title, recipeData, scale)
    console.log(frameImage)
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
  
const handleIngredientsScreen = async (requestUrl: string, recipeId: string, recipeData: RecipeData, scale: number, page: number) => {
    const url = new URL(requestUrl)
    const frameImage = await getIngredientsImageUrl(recipeData.title, recipeData, scale, page)
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
  
const handleStepScreen = async (requestUrl: string, recipeId: string, recipeData: RecipeData, scale: number, step: number) => {
    const url = new URL(requestUrl)
    const frameImage = await getStepImageUrl(recipeData.title, recipeData, scale, step)
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
  
const handleCompletedScreen = async (requestUrl: string, recipeId: string, recipeData: RecipeData, scale: number) => {
    const url = new URL(requestUrl)
    const frameImage = await getCompletedImageUrl(recipeData.title, recipeData, scale)
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
            return await handleTitleScreen(postUrl, recipeId, recipeData, scale)
        case FrameScreen.INGREDIENTS:
            return await handleIngredientsScreen(postUrl, recipeId, recipeData, scale, page)
        case FrameScreen.STEPS:
            return await handleStepScreen(postUrl, recipeId, recipeData, scale, page)
        case FrameScreen.COMPLETED:
            return await handleCompletedScreen(postUrl, recipeId, recipeData, scale)
    }
}
