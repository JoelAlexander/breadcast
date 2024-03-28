import { default as dotenv } from 'dotenv'
dotenv.config()
import inquirer, { Answers } from "inquirer"
import { readFileSync, writeFileSync, lstatSync, readdirSync } from 'fs';
import { MAX_SCALE, MIN_SCALE, RecipeData, getCompletedImageKey, getIngredientPages, getIngredientsImageKey, getStepImageKey, getTitleImageKey } from './model';
import { cid } from 'is-ipfs';
import { downloadIPFSJson, pinBufferToIPFS, pinListEntire, unpin } from './ipfsHelpers';
import { getCachedBase64PngImage, loadRenderedRecipeSetFromDisk } from './fileHelpers';
import { RenderedRecipe } from './model';
import { generateCompletedPage, generateIngredientsPage, generateStepPage, generateTitlePage, getPinnedFrameImage, renderJSXToPngBuffer } from './recipeDisplay';
import path from 'path';
import { loadRecipeSetFromDisk, loadRecipeFromDisk } from './fileHelpers';
import { BREADCAST_BASE_DIR, RECIPES_FILE,  } from './environment';

import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt'

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

const getCidActiveSet = () => {
  const set: Set<string> = new Set()
  const recipeSet = loadRecipeSetFromDisk()
  const renderedRecipeSet = loadRenderedRecipeSetFromDisk()
  Object.values(recipeSet).forEach(async (recipeDataCid) => {
    set.add(recipeDataCid)
    const recipeData: RecipeData = await downloadIPFSJson(recipeDataCid)
    set.add(recipeData.imageCid)
  })
  Object.entries(renderedRecipeSet).forEach(([recipeDataCid, recipeData]) => {
    set.add(recipeDataCid)
    Object.values(recipeData.assetCids).forEach((cid) => {
      set.add(cid)
    })
  })
  return set
}

const addRecipeToRecipeSet = (recipeName: string, recipeDataCid: string) => {
  const recipeSet = loadRecipeSetFromDisk()
  recipeSet[recipeName] = recipeDataCid
  writeFileSync(RECIPES_FILE, JSON.stringify(recipeSet, null, 2))
}

const removeRecipeFromRecipeSet = (recipeName: string) => {
  const recipeSet = loadRecipeSetFromDisk()
  delete recipeSet[recipeName]
  writeFileSync(RECIPES_FILE, JSON.stringify({...recipeSet}, null, 2))
}

const validateCid = (value: string) => {
  if (!cid(value)) {
    return `\'${value}\' is not a valid CID`
  }
  return true
}

const validateNewRecipeName = (value: string) => {
  const recipeSet = loadRecipeSetFromDisk()
  if (recipeSet[value]) {
    return `\'${value}\' already exists in the recipe set`
  } else if (value === '') {
    return 'Recipe name cannot be empty'
  }
  return true
}

const validateChosenPinFile = (value: string, exts: string[]) => {
  const stats = lstatSync(value)
  const ext = value.split('.').pop()
  if (stats.isDirectory()) {
    return false
  } else if (!exts.map(e => e === ext).reduce((a, b) => a || b, false)) {
    return false
  }
  return true;
}

const handleAddRecipe = () => {
  inquirer.prompt([
    {
      name: 'recipeName',
      message: 'Enter a name to call this recipe',
      type: 'input',
      validate: validateNewRecipeName
    },
    {
      name: 'recipeCid',
      message: 'Enter IPFS CID for the recipe data',
      type: 'input',
      validate: validateCid
    }
  ]).then((answers: Answers) => {
    addRecipeToRecipeSet(answers.recipeName, answers.recipeCid)
  })
}

const dataDirHasChoices = (exts: string[]): boolean => {
  const extMatches = readdirSync(BREADCAST_BASE_DIR).filter((file) => {
    const ext = file.split('.').pop()
    exts.map(e => e === ext).reduce((a, b) => a || b, false)
    return ext === 'png' || ext === 'json'
  })
  return extMatches.length > 0
}

const handlePinFile = () => {
  const hasApplicableFiles = dataDirHasChoices(['png', 'json'])
  inquirer.prompt([
    {
      name: 'filePath',
      message: 'Choose the file to pin',
      type: 'file-tree-selection',
      root: BREADCAST_BASE_DIR,
      onlyShowValid: true,
      hideRoot: true,
      when: () => hasApplicableFiles,
      validate: (choice) => validateChosenPinFile(choice, ['png', 'json'])
    }
  ]).then(async (answers) => {
    const { filePath } = answers;
    if (!filePath) {
      console.log('No files to pin matching .png or .json')
      return
    }
    try {
      const fileBuffer = readFileSync(filePath);
      const cid = await pinBufferToIPFS(fileBuffer, filePath);
      if (cid) {
        console.log(`File pinned successfully. CID: ${cid}`);
      } else {
        console.log('Failed to pin file.');
      }
    } catch (error) {
      console.log(`Error pinning file: ${error}`);
    }
  });
};

const PINNED_FILES_LIMIT = 500

const handleViewWorkingSet = async () => {
  const activeCidSet = getCidActiveSet()
  const pinListResponse = await pinListEntire()
  const pinnedCidSet = new Set(pinListResponse.rows.map(it => it.ipfs_pin_hash))
  const countOverpinned = Math.max(0, pinnedCidSet.size - PINNED_FILES_LIMIT)

  console.log(`You currenty have ${pinnedCidSet.size} total pinned files`)

  if (countOverpinned > 0) {
    console.log(`Which is ${countOverpinned} too many files pinned compared to the limit ${PINNED_FILES_LIMIT}`)
  }

  const pinnedAndActive = new Set([...activeCidSet].filter(a => pinnedCidSet.has(a)))
  if (pinnedAndActive.size > 0) {
    const activePinnedPercentage = ((pinnedAndActive.size / pinnedCidSet.size) * 100).toFixed(2)
    console.log(`${pinnedAndActive.size} / ${pinnedCidSet.size} (${activePinnedPercentage}%) are referenced in your recipe sets.`)
  }

  const pinnedNotActive = new Set([...pinnedCidSet].filter(a => !activeCidSet.has(a)))
  if (pinnedNotActive.size > 0) {
    console.log(`You currently have ${pinnedNotActive.size} pinned files which are not in your working set. `)
  }

  const unpinnedActive = new Set([...activeCidSet].filter(a => !pinnedCidSet.has(a)))
  if (unpinnedActive.size > 0) {
    console.log(`You also currently have ${unpinnedActive.size} unpinned files in your working set: `)
    unpinnedActive.forEach(console.log)
  }

  if (pinnedNotActive.size > 0) {
    const { wantsToUnpin } = await inquirer.prompt([
      {
        name: 'wantsToUnpin',
        type: 'confirm',
        message: 'You have files that can be unpinned to free up resources. Would you like to unpin files now?',
      },
    ]);

    if (wantsToUnpin) {
      await manageUnpinningProcess(pinnedNotActive);
    }
  }
}

const unpinFilesIndividually = async (pinnedNotActive: Set<string>) => {
  for (let cid of pinnedNotActive) {
    const { confirmUnpin } = await inquirer.prompt([
      {
        name: 'confirmUnpin',
        type: 'confirm',
        message: `Do you want to unpin ${cid}?`,
      },
    ]);

    if (confirmUnpin) {
      await unpin(cid);
      console.log(`${cid} has been unpinned.`);
    }
  }
}

const manageUnpinningProcess = async (pinnedNotActive: Set<string>) => {
  let continueUnpinning = true;

  while (continueUnpinning && pinnedNotActive.size > 0) {
    await promptUnpinFiles(pinnedNotActive);

    const { continueUnpin } = await inquirer.prompt([
      {
        name: 'continueUnpin',
        type: 'confirm',
        message: 'Would you like to continue unpinning files?',
      },
    ]);

    continueUnpinning = continueUnpin;
  }

  console.log('Unpinning process complete.');
}

const promptUnpinFiles = async (pinnedNotActive: Set<string>) => {
  const choices = [
    { name: "Unpin files individually", value: "individual" },
    { name: "Bulk unpin", value: "bulk" },
  ];

  const { unpinMethod } = await inquirer.prompt([
    {
      name: 'unpinMethod',
      message: 'How would you like to unpin files?',
      type: 'list',
      choices: choices,
      loop: false,
    },
  ]);

  if (unpinMethod === "individual") {
    await unpinFilesIndividually(pinnedNotActive);
  } else if (unpinMethod === "bulk") {
    await promptBulkUnpin(pinnedNotActive);
  }
}

const promptBulkUnpin = async (pinnedNotActive: Set<string>) => {
  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const { confirmBulkUnpin } = await inquirer.prompt([
    {
      name: 'confirmBulkUnpin',
      type: 'confirm',
      message: `Are you sure you want to bulk unpin ${pinnedNotActive.size} files? This action cannot be undone.`,
    },
  ]);

  if (confirmBulkUnpin) {
    for (let cid of pinnedNotActive) {
      await delay(333)
      await unpin(cid);
    }
    console.log(`${pinnedNotActive.size} files have been unpinned.`);
  }
}

const renderAndPinJsxWithName = async (jsx: JSX.Element, name: string): Promise<string> => {
  console.log(`Rendering ${name}`)
  const pngBuffer = await renderJSXToPngBuffer(jsx);
  console.log(`Pinning ${name}`)
  return pinBufferToIPFS(pngBuffer, name)
}

const renderAndPinFrame = async (recipeDataCid: string): Promise<RenderedRecipe> => {
  console.log(`Rendering environment set up.`)

  const recipeData = await downloadIPFSJson(recipeDataCid) as RecipeData
  const ingredientPageCount = getIngredientPages(recipeData).length
  const backgroundImageBase64 = await getCachedBase64PngImage(recipeData.imageCid)
  const renderedRecipe: RenderedRecipe = { recipeData: recipeData, assetCids: {} }

  for (var scale = MIN_SCALE; scale <= MAX_SCALE; scale++) {
    
    const titleKey = getTitleImageKey(recipeDataCid, scale)
    const titlePageJsx = generateTitlePage(recipeData, scale, backgroundImageBase64)
    renderedRecipe.assetCids[titleKey] = await renderAndPinJsxWithName(titlePageJsx, titleKey)

    for (var ingredientPage = 1; ingredientPage <= ingredientPageCount; ingredientPage++) {
      const pageKey = getIngredientsImageKey(recipeDataCid, scale, ingredientPage)
      const ingredientsPageJsx = generateIngredientsPage(recipeData, scale, ingredientPage, backgroundImageBase64)
      renderedRecipe.assetCids[pageKey] = await renderAndPinJsxWithName(ingredientsPageJsx, pageKey)
    }

    for (var step = 1; step <= recipeData.steps.length; step++) {
      const pageKey = getStepImageKey(recipeDataCid, scale, step)
      const stepPageJsx = generateStepPage(recipeData, scale, step, backgroundImageBase64)
      renderedRecipe.assetCids[pageKey] = await renderAndPinJsxWithName(stepPageJsx, pageKey)
    }
  }

  renderAndPinJsxWithName(generateCompletedPage(backgroundImageBase64), getCompletedImageKey(recipeDataCid))

  return renderedRecipe
}

const handleRenderAndPinFrame = () => {
  const recipeSet = loadRecipeSetFromDisk()
  const choices = Object.keys(recipeSet).map(key => {
    return { name: key, value: key }
  })

  inquirer.prompt([{
    type: 'list',
    message: 'Choose a recipe to render and pin: ',
    name: 'recipeKey',
    choices: choices,
    when: () => choices.length > 0
  }]).then(async (answers: Answers) => {
    if (answers.recipeKey) {
      await renderAndPinFrame(recipeSet[answers.recipeKey])
    } else {
      console.log('No recipe to render')
    }
  })
}

const handleDownloadFrame = () => {
  // TODO
}

const handleRemoveRecipe = async () => {
  const recipeSet = loadRecipeSetFromDisk()
  const choices = Object.keys(recipeSet).map(key => {
    return { name: key, value: key }
  })

  inquirer.prompt([{
    type: 'list',
    message: 'Choose a recipe to remove: ',
    name: 'recipeKey',
    choices: choices,
    when: () => choices.length > 0
  }]).then(async (answers: Answers) => {
    if (answers.recipeKey) {
      removeRecipeFromRecipeSet(answers.recipeKey)
      console.log(`Removed ${answers.recipeKey} from the recipe set`)
    } else {
      console.log('No recipe to remove')
    }
  })
}

const handleCreateAndPinRecipe = async () => {
  const hasApplicableFiles = dataDirHasChoices(['json'])
  inquirer.prompt([
    {
      name: 'imageCid',
      message: 'Enter IPFS CID for the png image background for this recipe',
      type: 'input',
      when: () => hasApplicableFiles,
      validate: validateCid
    },
    {
      name: 'filePath',
      message: 'Choose the base recipe file to pin',
      type: 'file-tree-selection',
      root: BREADCAST_BASE_DIR,
      onlyShowValid: true,
      hideRoot: true,
      when: () => hasApplicableFiles,
      validate: (choice) => validateChosenPinFile(choice, ['json'])
    }
  ]).then(async (answers: Answers) => {
    if (!answers.imageCid) {
      console.log('No image to apply to recipe')
      return
    } else if (!answers.filePath) {
      console.log('No recipe file to use')
      return
    }

    const recipeData = loadRecipeFromDisk(answers.filePath)
    recipeData.imageCid = answers.imageCid
    const pinnedBuffer = Buffer.from(JSON.stringify(recipeData))
    const cid = await pinBufferToIPFS(pinnedBuffer, path.basename(answers.filePath))

    console.log(`Pinned recipe to ${cid}`)

    const localCopyPath = path.join(path.dirname(answers.filePath), `${cid}${path.extname(answers.filePath)}`);
    writeFileSync(localCopyPath, pinnedBuffer)
  })
}

const handleAction = async (answers: Answers) => {
  switch (answers.action) {
    case 'add-recipe':
      handleAddRecipe()
      break;
    case 'remove-recipe':
      handleRemoveRecipe()
      break;
    case 'create-and-pin-recipe':
      handleCreateAndPinRecipe()
      break;
    case 'pre-render-and-pin-recipe':
      // TODO
      break;
    case 'pin-file':
      handlePinFile()
      break;
    case 'view-working-set':
      handleViewWorkingSet()
      break;
    case 'render-and-pin-frame':
      handleRenderAndPinFrame()
      break;
    case 'download-frame':
      handleDownloadFrame()
      break;
  }
}

inquirer.prompt([{
    name: 'action',
    message: 'Select an action',
    type: 'list',
    choices: [
      {
        name: 'Add recipe',
        value: 'add-recipe' 
      },
      {
        name: 'Remove recipe',
        value: 'remove-recipe'
      },
      {
        name: 'Create and pin recipe',
        value: 'create-and-pin-recipe'
      },
      {
        name: 'Pin file',
        value: 'pin-file'
      },
      {
        name: 'View content working set',
        value: 'view-working-set'
      },
      {
        name: 'Render and pin recipe frame',
        value: 'render-and-pin-frame'
      },
      {
        name: 'Download rendered frame',
        value: 'download-frame'
      }
    ],
    loop: false
}]).then(handleAction)