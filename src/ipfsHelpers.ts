import { default as dotenv } from 'dotenv'
dotenv.config()
import axios from 'axios'
import { default as FormData } from 'form-data' 

const PINATA_JWT = process.env.PINATA_JWT
const IPFS_GATEWAY = process.env.IPFS_GATEWAY

interface PinListRow {
  id: string
  ipfs_pin_hash: string
}

interface PinListResponse {
  count: number
  rows: PinListRow[]
}

export const getIPFSUrl = (cid: string) => {
  return `http://${IPFS_GATEWAY}/ipfs/${cid}`
}

export const pinBufferToIPFS = async (buffer: Buffer, fileName: string): Promise<string> => {
  const formData = new FormData();
  
  formData.append('file', buffer, fileName)

  const pinataMetadata = fileName ? { name: fileName } : {}
  formData.append('pinataMetadata',  JSON.stringify(pinataMetadata));
  
  const pinataOptions = JSON.stringify({ cidVersion: 0 })
  formData.append('pinataOptions', pinataOptions);

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
      'Authorization': `Bearer ${PINATA_JWT}`
    }
  })
  return res.data.IpfsHash
}

const PinListPageSize = 500

export const pinListPage = async (pageOffset: number, pageSize: number = PinListPageSize, status: 'all' | 'pinned' | 'unpinned' = 'pinned'): Promise<PinListResponse> => {
  const res = await axios.get(`https://api.pinata.cloud/data/pinList?includeCount=true&pageLimit=${pageSize}&pageOffset=${pageOffset}&status=${status}`, {
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
  })
  return res.data
}

export const pinListCount = async (): Promise<number> => {
  const pageOfOne = await pinListPage(0, 1)
  return pageOfOne.count
}

export const pinListEntire = async (): Promise<PinListResponse> => {

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const pinListResponse: PinListResponse = { count: 0, rows: [] }
  pinListResponse.count = await pinListCount()
  for (var page = 0; page * PinListPageSize < pinListResponse.count; page++) {
    const pageData = await pinListPage(page * PinListPageSize, PinListPageSize)
    await delay(250)
    if (pageData.count !== pinListResponse.count) {
      console.warn(`Pinned files changed during this operation.  May have missing or extra results.`)
    }
    pinListResponse.rows = [ ...pinListResponse.rows, ...pageData.rows ]
  }
  return pinListResponse
}

export const unpin = async (cid: string) => {
  try {
    const res = await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: { 'Authorization': `Bearer ${PINATA_JWT}` }
    });
    console.log(`Successfully unpinned ${cid}`);
    return res.data;
  } catch (error) {
    console.error(`Failed to unpin ${cid}: ${error}`);
  }
};

export const downloadIPFSJson = async (cid: string): Promise<any> => {
  return (await axios.get(getIPFSUrl(cid))).data
}

export const downloadIPFSBuffer = async (cid: string): Promise<Buffer> => {
  return Buffer.from((await axios.get(getIPFSUrl(cid), { responseType: 'arraybuffer' })).data, 'binary')
}
