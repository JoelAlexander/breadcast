import React from 'react';
import { IngredientData, RecipeData, getIngredientPages } from './model';
import { getBase64PngImage, pngDataUri } from './fileHelpers';
import { BreadcastFrameContext, FrameScreen } from './model';
import satori from 'satori';
import { join } from 'path';
import { readFileSync } from 'fs';
import sharp from 'sharp';
import { getIPFSUrl, pinBufferToIPFS } from './ipfsHelpers';
import { getRecipeAssetKey } from './handlers';

const BASE_DIR = process.cwd()
const FONTS_PATH = join(BASE_DIR, 'fonts')
const headingFontPath = join(FONTS_PATH, 'DMSerifDisplay-Regular.ttf')
const textFontPath = join(FONTS_PATH, 'Quattrocento-Regular.ttf')
const textEmphasisFontPath = join(FONTS_PATH, 'Quattrocento-Bold.ttf')
const labelFontPath = join(FONTS_PATH, 'Dosis-Regular.ttf')
const quantityFontPath = join(FONTS_PATH, 'SplineSansMono-Regular.ttf')

export const CircularHoursIndicator = ({ hours } : { hours: number }) => {
    const degrees = (hours / 24) * 360
    const sizePixels = 100;

    const blueArc = (start: number, duration: number) => {
        const radius = sizePixels / 2;
        const startDx = Math.sin(start) * radius
        const startDy = Math.cos(start) * radius
        const end = start - duration;
        const endDx = Math.sin(end) * radius
        const endDy = Math.cos(end) * radius
        return (
        <div style={{
            display: 'flex',
            position: 'absolute',
            width: '100%',
            height: '100%',
            clipPath: `path("M ${radius} ${radius} L ${radius + startDx} ${radius - startDy} A ${radius} ${radius} 0 0 0 ${radius + endDx} ${radius - endDy} L ${radius} ${radius} z")`,
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'blue' }} />
        </div>
        )
    }

    return (
        <div style={{
        display: 'flex',
        width: `${sizePixels}px`,
        height: `${sizePixels}px`,
        overflow: 'hidden'
        }}>
        <div style={{
            display: 'flex',
            position: 'absolute',
            width: '100%',
            height: '100%',
            clipPath: 'circle(50%)',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'white' }} />
        </div>
        {blueArc(Math.PI/2 + 1, Math.PI / 2)}
        {blueArc(Math.PI/2 + 3, Math.PI / 5)}
        {blueArc(Math.PI/2 + 5, Math.PI / 4)}
        <div style={{
            display: 'flex',
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '80%',
            height: '80%',
            clipPath: 'circle(50%)',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'white' }} />
        </div>
        </div>
    )
}

const convertTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60
    let timeString = '';
  
    if (hours > 0) {
      timeString += `${hours} hrs`;
    }
    if (remainingMinutes > 0) {
      if (timeString.length > 0) {
        timeString += ', ';
      }
      timeString += `${minutes} mins`;
    }
  
    return timeString;
};

const parseRecipeScale = (text: string, scale: number) => {
    return text.replaceAll(/@X(\d+)/g, (match: string, n: string) => {
        const parsed = parseInt(n)
        const scaled = parsed * scale
        return scaled.toString();
    });
}

const generatePageWithBackground = (jsx: JSX.Element, backgroundImageBase64: string) => {
  return <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
  }}>
      <img src={backgroundImageBase64} style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
      }} />
      <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(150deg, rgba(252, 251, 244, 1), rgba(252, 251, 244,0.95) 49%, rgba(252, 251, 244,0.9) 59%, rgba(252, 251, 244,0.65) 77%, rgba(252, 251, 244,0))',
      }} />
        {jsx}
  </div>
}

export const generateTitlePage = (recipeData: RecipeData, scale: number, backgroundImageBase64: string) => {
    const yieldsParsed = parseRecipeScale(recipeData.yields, scale);
    const descriptionParsed = parseRecipeScale(recipeData.description, scale);
    const scaleString = scale > 1 ? `Scale: x${scale}` : '';
    const pageJsx = <>
    <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          padding: '0vh 2vw'
      }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'center' }}>
            <p style={{ fontFamily: 'heading', fontSize: '3.2em', width: "82%" }}>{recipeData.title}</p>
            <p style={{ fontFamily: 'label', fontSize: '1.4em' }}>{scaleString}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: '68%' }}>
          <p style={{ fontFamily: 'text', fontSize: '1.6em' }}>{descriptionParsed}</p>
          <p style={{ fontFamily: 'label', fontSize: '1.6em' }}>
            <span style={{ marginRight: '0.25rem' }}>{convertTime(recipeData.activeTimeMinutes)}</span>active / {convertTime(recipeData.totalTimeMinutes)} total</p>
          <p style={{ fontFamily: 'label', fontSize: '1.6em' }}>{yieldsParsed}</p>
        </div>
      </div>
    </>
    return generatePageWithBackground(pageJsx, backgroundImageBase64);
};

const generateRecipePage = (jsx: JSX.Element | JSX.Element[], title: string, headerDetail: string, footerDetail: string) => {
  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '2vh 4vw 0vh 4vw' }}>
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'center' }}>
      <p style={{ fontFamily: 'heading', fontSize: '2.2em' }}>{title}</p>
      <p style={{ fontFamily: 'label', fontSize: '1.4em' }}>{headerDetail}</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
      {jsx}
    </div>
    <div style={{ display: 'flex', alignSelf: 'flex-start', fontFamily: 'label', fontSize: '1.4em' }}>
      <p>{footerDetail}</p>
    </div>
  </div>
}

export const generateIngredientsPage = (recipeData: RecipeData, scale: number, page: number, backgroundImageBase64: string) => {
  const pages = getIngredientPages(recipeData);
  const selectedIngredientsPage = pages[page - 1];
  const totalPages = pages.length;

  const scaleIngredient = (ingredient: IngredientData) => ({
    ...ingredient,
    quantity: ingredient.quantity * scale,
  });

  const ingredients = selectedIngredientsPage.map((ingredient, index) => {
    const scaledIngredient = scaleIngredient(ingredient);
    return <div key={index} style={{ display: 'flex', flexDirection: 'row', fontSize: '1.6em', padding: '1.4vh 0vw' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '38%', padding: '0vh 2vw' }}>
        <span style={{ fontFamily: 'quantity', marginRight: '.25rem' }}>{scaledIngredient.quantity}</span><span style={{ fontFamily: 'label' }}>{scaledIngredient.unit}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start', width: '62%', padding: '0vh 2vw'}}>
        {scaledIngredient.name}
      </div>
    </div>
  })

  const pageString = totalPages > 1 ? `Page ${page} / ${totalPages}` : ''
  const scaleString = scale > 1 ? `Scale: x${scale}` : ''
  const pageJsx = generateRecipePage(ingredients, recipeData.title, scaleString, pageString)
  return generatePageWithBackground(pageJsx, backgroundImageBase64)
};

const parseIngredients = (text: string, ingredients: IngredientData[], scale: number) => {

    var parsed: JSX.Element[] = []
    var remainder = text

    const pushParsedWord = (word: string) => {
      parsed.push(<span style={{ fontFamily: 'text', fontSize: '1.4em', marginRight: '0.25rem' }} key={`step-element-${parsed.length}`}>{word}</span>)
    }

    const splitAndPushParsedWords = (span: string) => {
      span.split(" ").forEach(pushParsedWord)
    }

    const pushIngredient = (ingredient: IngredientData) => {
      const scaledQuantity = ingredient.quantity * scale;
      parsed.push(
        <div 
          style={{
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'flex-start', 
            position: 'relative'
          }} 
          key={`step-element-${parsed.length}`}
        >
          <span style={{ fontFamily: 'text-emphasis', alignSelf: 'flex-start', fontSize: '1.4em' }}>
            {ingredient.name}
          </span>
          <span 
            style={{
              alignSelf: 'center', 
              fontSize: '1em', 
              position: 'absolute',
              top: '50%'
            }}
          >
            <span style={{ fontFamily: 'quantity', marginRight: '0.25rem' }}>{scaledQuantity}</span>
            <span style={{ fontFamily: 'label' }}>{ingredient.unit}</span>
          </span>
        </div>
      );
    }

    while (remainder.length > 0) {
      var match = remainder.match(/@(\d+)/)
      const matchIndex = match != null ? remainder.indexOf(match[0]) : -1
      const matchLength = match != null ? match[0].length : 0

      if (match != null) {
        if (matchIndex > 0) {
          splitAndPushParsedWords(remainder.slice(0, matchIndex))
        }

        const ingredientIndex = parseInt(match[1]) - 1
        if (ingredientIndex >= 0 && ingredientIndex < ingredients.length) {
          pushIngredient(ingredients[ingredientIndex]);
        }

        remainder = remainder.slice(matchIndex + matchLength)
      } else {
        splitAndPushParsedWords(remainder)
        remainder = ''
      }
    }

    return parsed
}

export const generateStepPage = (recipeData: RecipeData, scale: number, step: number, backgroundImageBase64: string): JSX.Element => {
    const selectedStepUnparsed = recipeData.steps[step - 1];
    const parsedStep = parseIngredients(selectedStepUnparsed, recipeData.ingredients, scale);
    const scaleString = scale > 1 ? `Scale: x${scale}` : '';
    const stepString = `Step ${step} of ${recipeData.steps.length}`

    const pageJsx = generateRecipePage(
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', lineHeight: '2.6em' }}>
        {parsedStep}
      </div>,
      recipeData.title,
      scaleString,
      stepString)
    return generatePageWithBackground(pageJsx, backgroundImageBase64)
}

export const generateCompletedPage = (backgroundImageBase64: string): JSX.Element => {
    const pageJsx = <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '4vh 2vw' }}>
      <h1 style={{ fontFamily: 'heading', fontSize: '2.4em', textAlign: 'center' }}>Thank You for Using Breadcast</h1>
      <p style={{ fontFamily: 'text', fontSize: '1.6em', textAlign: 'center', margin: '2vh 0' }}>
          Feedback & suggestions greatly appeciated.
      </p>
      <p style={{ fontFamily: 'label', fontSize: '1.4em', textAlign: 'center' }}>
          &lt;3   @jla
      </p>
    </div>
    return generatePageWithBackground(pageJsx, backgroundImageBase64)
}

export const generateErrorPage = (): JSX.Element => {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '4vh 2vw' }}>
          <p style={{ fontFamily: 'heading', fontSize: '1.6em', textAlign: 'center', margin: '2vh 0' }}>
              For some reason we cannot display the requested content.
          </p>
          <p style={{ fontFamily: 'text', fontSize: '1.4em', textAlign: 'center' }}>
              Please leave feedback and/or try again later.
          </p>
      </div>
  );
};

export const renderJSXToPngBuffer = async (jsx: JSX.Element): Promise<Buffer> => {

  const svg = await satori(jsx, {
    width: 764,
    height: 400,
    fonts: [
      {
        name: 'heading',
        data: readFileSync(headingFontPath),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'label',
        data: readFileSync(labelFontPath),
        weight: 400,
        style: 'normal'
      },
      {
        name: 'text',
        data: readFileSync(textFontPath),
        weight: 200,
        style: 'normal'
      },
      {
        name: 'text-emphasis',
        data: readFileSync(textEmphasisFontPath),
        weight: 400,
        style: 'normal'
      },
      {
        name: 'quantity',
        data: readFileSync(quantityFontPath),
        weight: 700,
        style: 'normal'
      }
    ],
  })

  return await sharp(Buffer.from(svg)).resize(764, 400).png({ quality: 100, compressionLevel: 6 }).toBuffer()
}

export const renderJSXToPngDataUri = async (jsx: JSX.Element): Promise<string> => {
  return pngDataUri(await renderJSXToPngBuffer(jsx))
}

export const generateFrameJsx = async (frameContext: BreadcastFrameContext): Promise<JSX.Element> => {
  const backgroundImageBase64 = await getBase64PngImage(frameContext.recipeData.imageCid)
  switch (frameContext.args.screen) {
    default:
    case FrameScreen.TITLE:
      return generateTitlePage(frameContext.recipeData, frameContext.args.scale, backgroundImageBase64)
    case FrameScreen.INGREDIENTS:
      return generateIngredientsPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page, backgroundImageBase64)
    case FrameScreen.STEPS:
      return generateStepPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page, backgroundImageBase64)
    case FrameScreen.COMPLETED:
      return generateCompletedPage(backgroundImageBase64)
  }
}

export const generateFrameImageDataUri = async (frameContext: BreadcastFrameContext): Promise<string> => {
  const jsx = await generateFrameJsx(frameContext)
  return renderJSXToPngDataUri(jsx)
}

const pinnedImages: {[key: string]: string} = {}
export const getPinnedFrameImage = async (frameContext: BreadcastFrameContext): Promise<string> => {
  const key = getRecipeAssetKey(frameContext)
  if (!pinnedImages[key]) {
    const jsx = await generateFrameJsx(frameContext)
    const pngBuffer = await renderJSXToPngBuffer(jsx)
    pinnedImages[key] = await pinBufferToIPFS(pngBuffer, `${key}.png`)
  }

  return getIPFSUrl(pinnedImages[key])
}

export const generateErrorImage = async (): Promise<string> => {
  return renderJSXToPngDataUri(generateErrorPage())
}
