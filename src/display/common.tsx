import React from 'react';
import { pngDataUri } from '../fileHelpers';
import satori from 'satori';
import { join } from 'path';
import { readFileSync } from 'fs';
import sharp from 'sharp';
import { getIPFSUrl, pinBufferToIPFS } from '../ipfsHelpers';

const BASE_DIR = process.cwd()
const FONTS_PATH = join(BASE_DIR, 'fonts')
const headingFontPath = join(FONTS_PATH, 'DMSerifDisplay-Regular.ttf')
const textFontPath = join(FONTS_PATH, 'Quattrocento-Regular.ttf')
const textEmphasisFontPath = join(FONTS_PATH, 'Quattrocento-Bold.ttf')
const labelFontPath = join(FONTS_PATH, 'Dosis-Regular.ttf')
const quantityFontPath = join(FONTS_PATH, 'SplineSansMono-Regular.ttf')

export const fonts = {
  heading: readFileSync(headingFontPath),
  text: readFileSync(textFontPath),
  textEmphasis: readFileSync(textEmphasisFontPath),
  label: readFileSync(labelFontPath),
  quantity: readFileSync(quantityFontPath)
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

export const generatePageWithBackground = (body: JSX.Element | JSX.Element[], subtitle: JSX.Element | null, yieldElement: JSX.Element | null, backgroundImageBase64: string, title: string, scale: number, currentPage: number, totalPages: number) => {
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
      margin: '0.5em 0',
      fontFamily: 'label',
      alignSelf: 'flex-start',
      color: 'white'
    }}>
      {getScaleText(scale)}
    </div>
  ) : null;  
  
  const subtitleSection = (subtitle || yieldElement) ? 
    <div style={{ padding: '0vh 2vw', display: 'flex', flexDirection: 'column'}}>
      {subtitle}
      {yieldElement}
    </div> : null

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
          background: 'linear-gradient(150deg, rgba(252, 251, 244, 1), rgba(252, 251, 244,0.95) 45%, rgba(252, 251, 244,0.9) 55%, rgba(252, 251, 244,0.65) 73%, rgba(252, 251, 244,0))',
      }} />
      <div style={{ padding: '0vh 2vw', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'center' }}>
        <span style={{ margin: '0', padding: '0', fontFamily: 'heading', fontSize: '3.2em', width: "72%" }}>{title}</span>
        {scaleIndicator}
      </div>
      {subtitleSection}
      <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0vh 2vw 4vh',
          justifyContent: 'center',
          flexGrow: 1
      }}>
        {body}
      </div>
      {totalPages > 1 && <PageIndicator currentPage={currentPage} totalPages={totalPages} />}
  </div>
}

export const generateMessagePage = (heading: string, message: string): JSX.Element => {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', padding: '4vh 2vw' }}>
          <p style={{ fontFamily: 'heading', fontSize: '1.6em', textAlign: 'center', margin: '2vh 0' }}>
              {heading}
          </p>
          <p style={{ fontFamily: 'text', fontSize: '1.4em', textAlign: 'center' }}>
              {message}
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
        data: fonts.heading,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'label',
        data: fonts.label,
        weight: 400,
        style: 'normal'
      },
      {
        name: 'text',
        data: fonts.text,
        weight: 200,
        style: 'normal'
      },
      {
        name: 'text-emphasis',
        data: fonts.textEmphasis,
        weight: 400,
        style: 'normal'
      },
      {
        name: 'quantity',
        data: fonts.quantity,
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

const RERENDER_TIMEOUT_MILLIS = 60000

interface CachedDataUri {
  dataUri: string
  timestamp: number
}

const cachedRecipeFrameImages: {[key: string]: CachedDataUri} = {}

export const getCachedDataUri = async (key: string, create: () => Promise<string>): Promise<string> => {
  const existingEntry = cachedRecipeFrameImages[key]
  if (!existingEntry || (Date.now() > existingEntry.timestamp + RERENDER_TIMEOUT_MILLIS)) {
    const dataUri = await create()
    cachedRecipeFrameImages[key] = {
      dataUri: dataUri,
      timestamp: Date.now()
    }
  }
  return cachedRecipeFrameImages[key].dataUri
}

const pinned: {[key: string]: string} = {}
export const getPinnedCid = async (key: string, create: () => Promise<Buffer>): Promise<string> => {
  if (!pinned[key]) {
    const buffer = await create()
    pinned[key] = await pinBufferToIPFS(buffer, `${key}`)
  }
  return getIPFSUrl(pinned[key])
}

export const generateMessageImage = async (message: string): Promise<string> => {
  return renderJSXToPngDataUri(generateMessagePage("Result", message))
}
