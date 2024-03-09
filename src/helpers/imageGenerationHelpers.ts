import satori from "satori"
import { headingFontPath, regularFontPath, smallFontPath } from '../config/fontConfig'
import fs from 'fs'
import puppeteer from 'puppeteer';

async function convertSvgToPng(svgContent: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; }
        svg { display: block; }
      </style>
    </head>
    <body>${svgContent}</body>
    </html>
  `);

  await page.setViewport({
    width: 764,
    height: 400,
  });

  // Take a screenshot of the page which contains only the SVG and save as PNG
  const screenshotBuffer = await page.screenshot({
    type: 'png'
  }).finally(() => browser.close());

  return screenshotBuffer;
}

export const generateImage = async (h: JSX.Element) => {
    const svg = await satori(h, {
      width: 764,
      height: 400,
      fonts: [
        {
          name: 'heading',
          data: fs.readFileSync(headingFontPath),
          weight: 200,
          style: 'normal',
        },
        {
          name: 'regular',
          data: fs.readFileSync(regularFontPath),
          weight: 200,
          style: 'normal',
        },
        {
          name: 'small',
          data: fs.readFileSync(smallFontPath),
          weight: 200,
          style: 'normal',
        },
      ],
    })
    return await convertSvgToPng(svg)
}