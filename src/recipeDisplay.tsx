import React from 'react';
import { IngredientData, RecipeData, getIngredientPages } from './model';
import { getCachedBase64PngImage, pngDataUri } from './fileHelpers';
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

const PageIndicator = ({ currentPage, totalPages }: { currentPage: number, totalPages: number }) => {
  return (
      <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '4vh',
          width: '100%'
      }}>
          {Array.from({ length: totalPages }, (_, i) => (
              <div
                  key={i}
                  style={{
                      height: '10px',
                      width: '10px',
                      backgroundColor: i === currentPage - 1 ? '#7851A9' : 'grey',
                      borderRadius: '50%',
                      margin: '0 5px',
                  }}
              />
          ))}
      </div>
  );
};

const generatePageWithBackground = (body: JSX.Element | JSX.Element[], subtitle: JSX.Element | null, yieldElement: JSX.Element | null, backgroundImageBase64: string, title: string, scale: number, currentPage: number, totalPages: number) => {
  const getScaleText = (s: number) => {
    switch (s) {
      case 1: return "Single recipe";
      case 2: return "Double recipe";
      case 3: return "Triple recipe";
      case 4: return "Quadruple recipe";
      case 5: return "Quintuple recipe";
      case 6: return "Sextuple recipe";
      case 7: return "Septuple recipe";
      case 8: return "Octuple recipe";
      default: return "";
    }
  };

  const scaleIndicator = scale > 0 ? (
    <div style={{
      backgroundColor: '#7851A9',
      border: '2px solid #7851A9',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '1.4em',
      padding: '5px 10px',
      fontFamily: 'label',
      color: 'white'
    }}>
      {getScaleText(scale)}
    </div>
  ) : null;  
  
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
      <div style={{ padding: '0vh 2vw', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'center', alignItems: 'center' }}>
        <span style={{ margin: '0', padding: '0', fontFamily: 'heading', fontSize: '3.2em', width: "68%" }}>{title}</span>
        {scaleIndicator}
      </div>
      <div style={{ padding: '0vh 2vw', display: 'flex', flexDirection: 'column'}}>
        {subtitle}
        {yieldElement}
      </div>
      <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0vh 2vw',
          justifyContent: 'center',
          flexGrow: 1
      }}>
        {body}
      </div>
      {totalPages > 1 && <PageIndicator currentPage={currentPage} totalPages={totalPages} />}
  </div>
}

export const generateTitlePage = (recipeData: RecipeData, scale: number, backgroundImageBase64: string) => {
    const yieldsParsed = parseRecipeScale(recipeData.yields, scale);
    const descriptionParsed = parseRecipeScale(recipeData.description, scale);
    const totalTimeString = convertTime(recipeData.totalTimeMinutes)
    const justTotalTimeJsx = <span style={{ marginRight: '0.25rem' }}>
      {totalTimeString}
    </span>
    const activeTimeJsx = recipeData.activeTimeMinutes !== recipeData.totalTimeMinutes ?
      <span style={{ marginRight: '1rem' }}>
        <span style={{ marginRight: '0.25rem' }}>
          {convertTime(recipeData.activeTimeMinutes)}
        </span>
      <span>active</span>
    </span> : null;

    const totalTimeJsx = recipeData.activeTimeMinutes !== recipeData.totalTimeMinutes ?
      <span>{justTotalTimeJsx}<span>total</span></span> : justTotalTimeJsx;

    const timeElement = <p style={{ margin: '0', fontFamily: 'label', fontSize: '2.2em' }}>{activeTimeJsx}{totalTimeJsx}</p>
    const yieldElement = <p style={{ margin: '0', fontFamily: 'label', fontSize: '2.2em' }}>{yieldsParsed}</p>

    const body = <>
      <div style={{ display: 'flex', flexDirection: 'column', width: '68%' }}>
        <p style={{ margin: '0', fontFamily: 'text', fontSize: '2em' }}>{descriptionParsed}</p>
      </div>
    </>
    return generatePageWithBackground(body, timeElement, yieldElement, backgroundImageBase64, recipeData.title, scale, 0, 0);
};

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
    return <div key={index} style={{ display: 'flex', flexDirection: 'row', fontSize: '1.6em' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '38%', padding: '0vh 2vw' }}>
        <span style={{ fontFamily: 'quantity', marginRight: '.25rem' }}>{scaledIngredient.quantity}</span><span style={{ fontFamily: 'label' }}>{scaledIngredient.unit}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start', width: '62%', padding: '0vh 2vw'}}>
        {scaledIngredient.name}
      </div>
    </div>
  })

  return generatePageWithBackground(ingredients, null, null, backgroundImageBase64, recipeData.title, scale, page, totalPages)
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
    const pageJsx = <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', lineHeight: '2.6em' }}>
      {parsedStep}
    </div>
    return generatePageWithBackground(pageJsx, null, null, backgroundImageBase64, recipeData.title, scale, step, recipeData.steps.length)
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
    return generatePageWithBackground(pageJsx, null, null, backgroundImageBase64, '', 0, 0, 0)
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
  const backgroundImageBase64 = await getCachedBase64PngImage(frameContext.recipeData.imageCid)
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

const RERENDER_TIMEOUT_MILLIS = 60000

interface CachedDataUri {
  dataUri: string
  timestamp: number
}

const cachedFrameImageDataUris: {[key: string]: CachedDataUri} = {}
export const getCachedFrameImageDataUri = async (frameContext: BreadcastFrameContext): Promise<string> => {
  const cacheKey = getRecipeAssetKey(frameContext)
  const existingEntry = cachedFrameImageDataUris[cacheKey]
  if (!existingEntry || (Date.now() > existingEntry.timestamp + RERENDER_TIMEOUT_MILLIS)) {
    const dataUri = await generateFrameImageDataUri(frameContext)
    cachedFrameImageDataUris[cacheKey] = {
      dataUri: dataUri,
      timestamp: Date.now()
    }
  }
  return cachedFrameImageDataUris[cacheKey].dataUri
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
