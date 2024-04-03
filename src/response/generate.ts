import { default as dotenv } from 'dotenv';
import { generateMessageImage } from "../display/common";
import { html } from 'hono/html';
import OpenAI from 'openai';
import { join } from 'path';
import { readFileSync } from 'fs';
import { RecipeData } from '../model';

dotenv.config();

const BASE_DIR = process.cwd();
const PROMPTS_PATH = join(BASE_DIR, 'prompts');
const templateText = readFileSync(join(PROMPTS_PATH, 'generate-recipe.txt'), { encoding: 'utf8' });

const openai = new OpenAI({});

export const handle = async (recipeContext: string, userPrompt: string) => {
  const promptText = templateText.replace('{{RECIPE_CONTEXT}}', recipeContext)
                                   .replace('{{USER_PROMPT}}', userPrompt);

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    response_format: { "type": "json_object" },
    messages: [
      { role: 'system', content: promptText },
      { role: 'system', content: "1. Recipe Context" + "\n\n" + recipeContext + "\n\n" },
      { role: 'user', content: "2. User prompt" + "\n\n" + recipeContext}
    ],
  });

  let recipeTitle = 'Recipe Title';
  try {
    console.log(chatCompletion.usage?.prompt_tokens)
    console.log(chatCompletion.usage?.completion_tokens)
    console.log(chatCompletion.usage?.total_tokens)
    const recipeData: RecipeData = JSON.parse(chatCompletion.choices[0]?.message?.content ?? '{}');
    recipeTitle = recipeData.title;
  } catch (error) {
    console.error('Error parsing recipe data:', error);
  }

  const frameImage = await generateMessageImage(recipeTitle);

  return html`
    <html lang="en">
      <head>
        <meta property="og:image" content="${frameImage}" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${frameImage}" />
        <meta property="fc:frame:input:text" content="${recipeTitle}" />
        <meta property="fc:frame:button:1" content="Generate Recipe" />
      </head>
      <body />
    </html>`;
}