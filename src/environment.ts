import { default as dotenv } from 'dotenv'
dotenv.config()
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const RECIPE_LIST_FILE_NAME = 'recipes.json'
const RENDERED_RECIPES_FILE_NAME = 'rendered-recipes.json'

const BASE_DIR = process.cwd()
export const BREADCAST_BASE_DIR = process.env.BREADCAST_BASE_DIR ?? BASE_DIR
export const BREADCAST_ENV = process.env.BREADCAST_ENV ?? ""
export const BREADCAST_ENV_DIR = join(BREADCAST_BASE_DIR, BREADCAST_ENV)
export const RECIPES_FILE = join(BREADCAST_ENV_DIR, RECIPE_LIST_FILE_NAME)
export const RENDERED_RECIPES_FILE = join(BREADCAST_ENV_DIR, RENDERED_RECIPES_FILE_NAME)

if (!existsSync(BREADCAST_ENV_DIR)) {
  mkdirSync(BREADCAST_ENV_DIR)
}
