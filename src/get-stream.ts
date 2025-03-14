import { api } from './api.js'
import z from 'zod'
import fs from 'fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
type StreamOption = {
  video?: boolean
  audio?: boolean
}

const dashItemSchema = z.object({
  start_with_sap: z.number(),
  bandwidth: z.number(),
  sar: z.string(),
  codecs: z.string(),
  mime_type: z.string(),
  mimeType: z.string(),
  backup_url: z.string().array(),
  backupUrl: z.string().array(),
  base_url: z.string(),
  baseUrl: z.string(),
  size: z.number(),
  id: z.number()
})
const dashSchema = z.object({
  video: z.array(dashItemSchema),
  audio: z.array(dashItemSchema),
  duration: z.number(),
  minBufferTime: z.number(),
  min_buffer_time: z.number()
})
const streamSchema = z.object({
  dash: dashSchema
})

const saveStreamTo = async (url: string, destination: string) => {
  const res = await fetch(url)
  const fileStream = fs.createWriteStream(destination, { flags: 'wx' })
  await finished(Readable.fromWeb(res.body!).pipe(fileStream))
}

const getExtByMimeType = (mime: string) => {
  let ext = 'mp3'
  switch (mime) {
    case 'audio/mp4':
      ext = 'audio.mp4'
      break
    case 'video/mp4':
      ext = 'video.mp4'
      break
  }
  return ext
}

export const getAndDownloadStream = async (cid: number, opt: StreamOption) => {
  const streamDetail = await api.getStreamByCid({ cid, ...opt })
  const stream = streamSchema.parse(streamDetail)
  if (opt.audio) {
    const url = stream.dash.audio[0].baseUrl
    const mimeType = stream.dash.audio[0].mimeType
    const ext = getExtByMimeType(mimeType)
    await saveStreamTo(url, `output.${ext}`)
  }
  if (opt.video) {
    const url = stream.dash.video[0].baseUrl
    const mimeType = stream.dash.video[0].mimeType
    const ext = getExtByMimeType(mimeType)
    await saveStreamTo(url, `output.${ext}`)
  }
}
