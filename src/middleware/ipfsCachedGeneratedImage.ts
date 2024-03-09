import fs  from 'fs'
import { pinBufferToIPFS } from '../helpers/ipfsHelpers'

const IPFS_GATEWAY = process.env.IPFS_GATEWAY

interface CreateImage {
    (): Promise<Buffer>;
  }

let lastSaveTime = 0;
var cidMap: any
const cidDataPath = "./cid-data.json"
try {
  if (fs.existsSync(cidDataPath)) {
    const rawData = fs.readFileSync(cidDataPath, 'utf8');
    cidMap = JSON.parse(rawData);
  } else {
    cidMap = {}
  }
} catch (err) {
  console.error('Error reading the file:', err);
  cidMap = {}
}

export const periodicallySaveIpfsCachedImagesMiddleware = async (c: any, next: Function) => {
  const now = Date.now();
  if (now - lastSaveTime > 300000) { // 300000 milliseconds = 5 minutes
    fs.writeFileSync(cidDataPath, JSON.stringify(cidMap), 'utf8');
    lastSaveTime = now; // Update last save time
    console.log('Map saved to disk.');
  }
  await next()
}

export const cachedIpfsImage = async (key: string, create: CreateImage) => {
  if (cidMap[key]) {
      const cid = cidMap[key]
      return `${IPFS_GATEWAY}/ipfs/${cid}`
   } else {
      const imageBuffer = await create()
      const cid = await pinBufferToIPFS(key, imageBuffer)
      cidMap[key] = cid
      return `${IPFS_GATEWAY}/ipfs/${cid}`
  }
}
