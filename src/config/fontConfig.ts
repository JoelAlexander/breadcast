import { join } from 'path'

const basePath = process.cwd()
const fontsPath = join(basePath, 'fonts')

export const headingFontPath = join(fontsPath, 'DMSerifDisplay-Regular.ttf')
export const regularFontPath = join(fontsPath, 'SplineSansMono-Light.ttf')
export const smallFontPath = join(fontsPath, 'SplineSansMono-Regular.ttf')