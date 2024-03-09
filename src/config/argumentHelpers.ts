import { loadRecipeData } from "../helpers/fileHelpers"
import { FrameScreen } from "../model/recipe"
import { Context } from "hono"

function parseScreenFromString(value: string, fallback: FrameScreen = FrameScreen.TITLE): FrameScreen {
    const entries = Object.entries(FrameScreen);
    for (let [key, enumValue] of entries) {
      if (value === enumValue) {
        return FrameScreen[key as keyof typeof FrameScreen];
      }
    }
    return fallback;
}
  
export const parseFrameArgs = (c: Context) => {
    const recipeId = c.req.param('recipeId') ?? ""
    const recipeData = recipeId ? loadRecipeData(recipeId) : null
    if (recipeData == null) {
      return null
    }
  
    var screen = parseScreenFromString(c.req.param('screen'))
  
    var scale = parseInt(c.req.param('scale'))
    if (Number.isNaN(scale) || scale < 1) {
      scale = 1
    }
  
    var page = parseInt(c.req.param('page'))
    if (Number.isNaN(page) || page < 1) {
      page = 1
    }
  
    return {
      recipeId,
      recipeData,
      scale,
      screen,
      page
    }
}