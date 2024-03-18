import { default as dotenv } from 'dotenv'
dotenv.config()
import inquirer, { Answers } from "inquirer"
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { RecipeSet } from './model';
import { cid } from 'is-ipfs';
import { pinBufferToIPFS, pinListEntire, pinListPage, unpin } from './ipfsHelpers';
import { loadRenderedRecipeSetFromDisk } from './fileHelpers';
const BASE_DIR = process.cwd()
const RECIPES_FILE = join(BASE_DIR, 'recipes.json')

const loadRecipeSetFromDisk = (): RecipeSet => {
  try {
    if (!existsSync(RECIPES_FILE)) return {}
    return JSON.parse(readFileSync(RECIPES_FILE, 'utf8'))
  } catch (e) {
    console.log(`Could not load ${RECIPES_FILE}`)
    return {}
  }
}

const getCidActiveSet = () => {
  const set: Set<string> = new Set()
  const recipeSet = loadRecipeSetFromDisk()
  const renderedRecipeSet = loadRenderedRecipeSetFromDisk()
  Object.values(recipeSet).forEach(({ jsonCid, imageCid }) => {
    set.add(jsonCid)
    set.add(imageCid)
  })
  Object.entries(renderedRecipeSet).forEach(([jsonCid, recipeData]) => {
    set.add(jsonCid)
    Object.values(recipeData.assetCids).forEach((cid) => {
      set.add(cid)
    })
  })
  return set
}

const addRecipeToRecipeSet = (recipeName: string, recipeDataCid: string, recipeBackgroundCid: string) => {
  const recipeSet = loadRecipeSetFromDisk()
  recipeSet[recipeName] = { jsonCid: recipeDataCid, imageCid: recipeBackgroundCid }
  writeFileSync(RECIPES_FILE, JSON.stringify(recipeSet, null, 2))
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
  }
  return true
}

const validateFileExists = (value: string) => {
  if (!existsSync(value)) {
    return `\'${value}\' does not exist`;
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
    },
    {
      name: 'backgroundCid',
      message: 'Enter IPFS CID for the recipe\'s background image',
      type: 'input',
      validate: validateCid
    }
  ]).then((answers: Answers) => {
    addRecipeToRecipeSet(answers.recipeName, answers.recipeCid, answers.backgroundCid)
  })
}

const handlePinFile = () => {
  inquirer.prompt([
    {
      name: 'filePath',
      message: 'Enter the file path to pin',
      type: 'input',
      validate: validateFileExists
    }
  ]).then(async (answers) => {
    const { filePath } = answers;
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

  console.log(`You currenty have ${pinnedCidSet.size} pinned files`)

  if (countOverpinned > 0) {
    console.log(`Which is ${countOverpinned} too many files pinned compared to the limit ${PINNED_FILES_LIMIT}`)
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

const handleAction = async (answers: Answers) => {
  switch (answers.action) {
    case 'add-recipe':
      handleAddRecipe()
      break;
    case 'pin-file':
      handlePinFile()
      break;
    case 'view-working-set':
      await handleViewWorkingSet()
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
        name: 'Pin file',
        value: 'pin-file'
      },
      {
        name: 'View content working set',
        value: 'view-working-set'
      }
    ],
    loop: false
}]).then(handleAction)