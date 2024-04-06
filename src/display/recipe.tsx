import React from 'react';
import { IngredientData, RecipeData, getIngredientPages } from '../model';
import { getCachedBase64PngImage } from '../fileHelpers';
import { RecipeFrameContext, RecipeScreen } from '../model';
import { getRecipeAssetKey } from '../response/recipe';
import { generatePageWithBackground, getCachedDataUri, getPinnedCid, renderJSXToPngBuffer, renderJSXToPngDataUri } from './common';

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

export const generateTitlePage = (recipeData: RecipeData, scale: number, backgroundImageBase64: string) => {
    const yieldsParsed = parseRecipeScale(recipeData.yields, scale);
    const descriptionParsed = parseRecipeScale(recipeData.description, scale);
    const totalTimeString = convertTime(recipeData.totalTimeMinutes)
    const justTotalTimeJsx = <span style={{ marginRight: '0.25rem' }}>
      {totalTimeString}
    </span>

    const showBothTimes = recipeData.activeTimeMinutes && recipeData.activeTimeMinutes !== recipeData.totalTimeMinutes

    const activeTimeJsx = showBothTimes ?
      <span style={{ marginRight: '1rem' }}>
        <span style={{ fontSize: '2.1em', marginRight: '0.22rem' }}>
          {convertTime(recipeData.activeTimeMinutes)}
        </span>
      <span>active</span>
    </span> : null;

    const totalTimeJsx = showBothTimes ?
      <span style={{ fontSize: '2.1em', marginRight: '0.22rem' }}>{justTotalTimeJsx}<span>total</span></span> : justTotalTimeJsx;

    const timeElement = <p style={{ margin: '0', fontFamily: 'label', fontSize: '1.9em' }}>{activeTimeJsx}{totalTimeJsx}</p>
    const yieldElement = <p style={{ margin: '0', fontFamily: 'label', fontSize: '1.9em' }}>{yieldsParsed}</p>

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
    return <div key={index} style={{ display: 'flex', flexDirection: 'row', fontSize: '1.8em' }}>
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

const parseStepText = (text: string, ingredients: IngredientData[], scale: number): JSX.Element[] => {

    var parsed: JSX.Element[] = []
    var remainder = text

    const pushParsedWord = (word: string) => {
      parsed.push(<span style={{ fontFamily: 'text', fontSize: '2.0em', marginRight: '0.25rem' }} key={`step-element-${parsed.length}`}>{word}</span>)
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
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            minWidth: '4em'
          }} 
          key={`step-element-${parsed.length}`}
        >
          <span style={{ fontFamily: 'text-emphasis', fontSize: '2em' }}>
            {ingredient.name}
          </span>
          <span 
            style={{
              fontSize: '1.4em', 
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
    const parsedStep = parseStepText(selectedStepUnparsed, recipeData.ingredients, scale);
    const pageJsx = <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', lineHeight: '2.5em' }}>
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

export const generateRecipeFrameJsx = async (frameContext: RecipeFrameContext): Promise<JSX.Element> => {
  const backgroundImageBase64 = await getCachedBase64PngImage(frameContext.recipeData.imageCid)
  switch (frameContext.args.screen) {
    default:
    case RecipeScreen.TITLE:
      return generateTitlePage(frameContext.recipeData, frameContext.args.scale, backgroundImageBase64)
    case RecipeScreen.INGREDIENTS:
      return generateIngredientsPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page, backgroundImageBase64)
    case RecipeScreen.STEPS:
      return generateStepPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page, backgroundImageBase64)
    case RecipeScreen.COMPLETED:
      return generateCompletedPage(backgroundImageBase64)
  }
}

export const generateRecipeFrameImageDataUri = async (frameContext: RecipeFrameContext): Promise<string> => {
  return renderJSXToPngDataUri(await generateRecipeFrameJsx(frameContext))
}

export const getCachedRecipeFrameImage = async (frameContext: RecipeFrameContext): Promise<string> => {
  return getCachedDataUri(
    getRecipeAssetKey(frameContext),
    () => { return generateRecipeFrameImageDataUri(frameContext) })
}

export const getPinnedRecipeFrameImage = async (frameContext: RecipeFrameContext): Promise<string> => {
  return getPinnedCid(
    getRecipeAssetKey(frameContext),
    async () => {
      const jsx = await generateRecipeFrameJsx(frameContext)
      return renderJSXToPngBuffer(jsx)
    })
}
