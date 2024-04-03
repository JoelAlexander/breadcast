import { default as dotenv } from 'dotenv'
dotenv.config()
import axios from "axios";
import { getInsecureHubRpcClient, Message, hexStringToBytes } from "@farcaster/hub-nodejs"

const HUBBLE_ENDPOINT: string = process.env.HUBBLE_ENDPOINT ?? ''

export const validateMessageBytes = async (messageBytes: string): Promise<Message | undefined> => {
  try {
    const message = hexStringToBytes(messageBytes).match((result) => {
      return result
    }, (e) => {
      return undefined;
    })

    if (!message) return undefined

    const client = getInsecureHubRpcClient(HUBBLE_ENDPOINT)
    const validateMessageResponse = await client.validateMessage(Message.decode(message))
    return validateMessageResponse.match(
      (response) => {
        return response.valid ? response.message : undefined
      },
      (error) => {
        console.log(error.message)
        return undefined
      }
    )
  } catch (e) {
    console.log(e)
    return undefined
  }
}
