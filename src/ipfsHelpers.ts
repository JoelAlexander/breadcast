import axios from 'axios'
import { default as FormData } from 'form-data' 

const PINATA_JWT = process.env.PINATA_JWT
const IPFS_GATEWAY = process.env.IPFS_GATEWAY

export const getIPFSUrl = (cid: string) => {
  return `${IPFS_GATEWAY}/ipfs/${cid}`
}

export const pinBufferToIPFS = async (fileName: string, buffer: Buffer): Promise<string | null> => {
  const formData = new FormData();
  
  formData.append('file', buffer, fileName)
  
  const pinataMetadata = JSON.stringify({
    name: fileName,
  })
  formData.append('pinataMetadata', pinataMetadata);
  
  const pinataOptions = JSON.stringify({
    cidVersion: 0
  })
  formData.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: undefined,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    })
    const cid = res.data.IpfsHash
    return cid
  } catch (error) {
    console.error(error);
    return null
  }
}

export const downloadIPFSJson = async (cid: string): Promise<any> => {
  return (await axios.get(getIPFSUrl(cid))).data
}

export const downloadIPFSBuffer = async (cid: string): Promise<Buffer> => {
  return Buffer.from((await axios.get(getIPFSUrl(cid), { responseType: 'arraybuffer' })).data, 'binary')
}
