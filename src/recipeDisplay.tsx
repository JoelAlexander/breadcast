import React from 'react';
import { IngredientData, RecipeData, getIngredientPages } from './model';
import { downloadBase64PngImage, pngDataUri } from './fileHelpers';
import { BreadcastFrameContext, FrameScreen } from './model';
import satori from 'satori';
import { join } from 'path';
import { readFileSync } from 'fs';
import sharp from 'sharp';

const BASE_DIR = process.cwd()
const FONTS_PATH = join(BASE_DIR, 'fonts')
const headingFontPath = join(FONTS_PATH, 'DMSerifDisplay-Regular.ttf')
const regularFontPath = join(FONTS_PATH, 'SplineSansMono-Light.ttf')
const smallFontPath = join(FONTS_PATH, 'SplineSansMono-Regular.ttf')

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

const convertTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    let timeString = '';
  
    if (hours > 0) {
      timeString += `${hours} hrs`;
    }
    if (minutes > 0) {
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

export const generateTitlePage = (recipeData: RecipeData, scale: number, backgroundImageBase64: string) => {
    const yieldsParsed = parseRecipeScale(recipeData.yields, scale);
    const descriptionParsed = parseRecipeScale(recipeData.description, scale);
    const scaleString = scale > 1 ? `Scale: x${scale}` : '';
    return (
        <div style={{
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
            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                padding: '2vh 2vw'
            }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontFamily: 'small' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', width: "80%" }}>
                        <span style={{ fontFamily: 'heading', fontSize: '3.2em', lineHeight: '1' }}>{recipeData.title}</span>
                        <span style={{ fontFamily: 'regular', fontSize: '1.8em', lineHeight: '1.2' }}>{convertTime(recipeData.activeTime)} active / {convertTime(recipeData.totalTime)} total</span>
                        <span style={{ fontFamily: 'regular', fontSize: '1.6em', lineHeight: '1.2' }}>{yieldsParsed}</span>
                    </div>
                    <p>{scaleString}</p>
                </div>
                <div style={{ display: 'flex', alignSelf: 'flex-end', flexDirection: 'row', width: "100%", height: "60%" }}>
                    <div style={{ display: 'flex', width: '60%' }}>
                        <p style={{ fontFamily: 'small', fontSize: '1em' }}>{descriptionParsed}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const generateIngredientsPage = (recipeData: RecipeData, scale: number, page: number) => {
    const pages = getIngredientPages(recipeData);
    const selectedIngredientsPage = pages[page - 1];
    const totalPages = pages.length;

    const scaleIngredient = (ingredient: IngredientData) => ({
        ...ingredient,
        quantity: ingredient.quantity * scale,
    });

    const ingredients = selectedIngredientsPage.map((ingredient, index) => {
        const scaledIngredient = scaleIngredient(ingredient);
        return (
            <div key={index} style={{ display: 'flex', flexDirection: 'row', fontFamily: 'regular', fontSize: '1.6em', padding: '2.5vh 0vw' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '38%', padding: '0vh 2vw' }}>
                    {scaledIngredient.quantity} {scaledIngredient.unit}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '62%', padding: '0vh 2vw'}}>
                    {scaledIngredient.name}
                </div>
            </div>
        );
    })

    const pageString = totalPages > 1 ? `Page ${page} of ${totalPages}` : ''
    const scaleString = scale > 1 ? `Scale: x${scale}` : ''

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '2vh 4vw' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontFamily: 'small' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.6em' }}>{recipeData.title}</span><br/><span style={{ fontSize: '1.4em' }}>Ingredients</span>
                </div>
                <p>{scaleString}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
                {ingredients}
            </div>
            <div style={{ display: 'flex', alignSelf: 'flex-end', fontFamily: 'small', fontSize: '1.4em' }}>
                <p>{pageString}</p>
            </div>
        </div>
    );
};

const parseIngredients = (text: string, ingredients: IngredientData[], scale: number) => {

    var parsed: JSX.Element[] = []
    var remainder = text

    while (remainder.length > 0) {
        var match = remainder.match(/@(\d+)/)
        const matchIndex = match != null ? remainder.indexOf(match[0]) : -1
        const matchLength = match != null ? match[0].length : 0

        if (match != null) {
            if (matchIndex > 0) {
                parsed.push(<span style={{ fontSize: '1.8em' }} key={`step-element-${parsed.length}`}>{remainder.slice(0, matchIndex)}</span>)
            }

            const ingredientIndex = parseInt(match[1]) - 1
            if (ingredientIndex >= 0 && ingredientIndex < ingredients.length) {
                const ingredient = ingredients[ingredientIndex];
                const scaledQuantity = ingredient.quantity * scale;
                parsed.push(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignContent: 'center', margin: '0.2em' }} key={`step-element-${parsed.length}`}>
                    <span style={{ alignSelf: 'center', fontSize: '1.8em' }}>{ingredient.name}</span>
                    <span style={{ alignSelf: 'center', fontFamily: 'small', fontSize: '1em' }}>{scaledQuantity}{ingredient.unit}</span>
                </div>)
            }

            remainder = remainder.slice(matchIndex + matchLength)
        } else {
            parsed.push(<span style={{ fontSize: '1.8em' }} key={`step-element-${parsed.length}`}>{remainder}</span>)
            remainder = ''
        }
    }

    return parsed
}

export const generateStepPage = (recipeData: RecipeData, scale: number, step: number): JSX.Element => {
    const selectedStepUnparsed = recipeData.steps[step - 1];
    const parsedStep = parseIngredients(selectedStepUnparsed, recipeData.ingredients, scale);
    const scaleString = scale > 1 ? `Scale: x${scale}` : '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '2vh 4vw' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontFamily: 'small', fontSize: '1.4em' }}>
                <p>{recipeData.title}</p>
                <p>{scaleString}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: '1', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                    {parsedStep}
                </div>
            </div>
            <div style={{ display: 'flex', alignSelf: 'flex-end', fontFamily: 'small', fontSize: '1.4em' }}>
                <p>Step {step} of {recipeData.steps.length}</p>
            </div>
        </div>
    );
};

export const generateCompletedPage = (): JSX.Element => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '4vh 2vw' }}>
            <h1 style={{ fontFamily: 'heading', fontSize: '2.4em', textAlign: 'center' }}>Thank You for Using Breadcast!</h1>
            <p style={{ fontFamily: 'regular', fontSize: '1.6em', textAlign: 'center', margin: '2vh 0' }}>
                We hope you enjoyed creating with us.
            </p>
            <p style={{ fontFamily: 'regular', fontSize: '1.4em', textAlign: 'center' }}>
                Your feedback and creations make Breadcast better for everyone. Please share your comments and photos of your culinary masterpieces in responses to this post.
            </p>
        </div>
    );
};

export const generateErrorPage = (): JSX.Element => {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '4vh 2vw' }}>
          <p style={{ fontFamily: 'regular', fontSize: '1.6em', textAlign: 'center', margin: '2vh 0' }}>
              For some reason we cannot display the requested content.
          </p>
          <p style={{ fontFamily: 'regular', fontSize: '1.4em', textAlign: 'center' }}>
              Please leave feedback and/or try again later.
          </p>
      </div>
  );
};

export const renderJSXToBuffer = async (jsx: JSX.Element): Promise<Buffer> => {

  const svg = await satori(jsx, {
    width: 764,
    height: 400,
    fonts: [
      {
        name: 'heading',
        data: readFileSync(headingFontPath),
        weight: 200,
        style: 'normal',
      },
      {
        name: 'regular',
        data: readFileSync(regularFontPath),
        weight: 200,
        style: 'normal',
      },
      {
        name: 'small',
        data: readFileSync(smallFontPath),
        weight: 200,
        style: 'normal',
      },
    ],
  })

  return await sharp(Buffer.from(svg)).resize(764, 400).png({ quality: 100, compressionLevel: 6 }).toBuffer()
}

export const renderJSXToPng = async (jsx: JSX.Element): Promise<string> => {
  return pngDataUri(await renderJSXToBuffer(jsx))
}

export const generateFrameJsx = async (frameContext: BreadcastFrameContext): Promise<JSX.Element> => {
  switch (frameContext.args.screen) {
      default:
      case FrameScreen.TITLE:
          const backgroundImageBase64 = await downloadBase64PngImage(frameContext.recipeData.imageCid)
          return generateTitlePage(frameContext.recipeData, frameContext.args.scale, backgroundImageBase64)
      case FrameScreen.INGREDIENTS:
          return generateIngredientsPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page)
      case FrameScreen.STEPS:
          return generateStepPage(frameContext.recipeData, frameContext.args.scale, frameContext.args.page)
      case FrameScreen.COMPLETED:
          return generateCompletedPage()
  }
}

export const generateFrameImage = async (frameContext: BreadcastFrameContext): Promise<string> => {
  const jsx = await generateFrameJsx(frameContext)
  return renderJSXToPng(jsx)
}

export const generateErrorImage = async (): Promise<string> => {
  return renderJSXToPng(generateErrorPage())
}
