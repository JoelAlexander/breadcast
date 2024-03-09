import fs from 'fs'
const axios = require('axios')

export const loadRecipeData = (recipeName: string) => {
    var recipeData = null;
    try {
        recipeData = JSON.parse(fs.readFileSync(`./recipes/${recipeName}.json`, 'utf8'))
    } catch (e) {
    }
    return recipeData;
}

export async function convertImageToBase64(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  return `data:image/png;base64,${base64}`
}
