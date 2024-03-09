const FormData = require('form-data')
const axios = require('axios')

const PINATA_JWT = process.env.PINATA_JWT

export const pinBufferToIPFS = async (fileName: string, buffer: Buffer) => {
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
        maxBodyLength: "Infinity",
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
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