import { api } from './api.js'
import z from 'zod'
import * as core from '@actions/core'
import fs from 'fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { VideoDetail } from './bili-meta.js'
import format from 'python-format-js'
import path from 'node:path'
type StreamPathOpt = {
  audioFileTemplate?: string
  videoFileTemplate?: string
}

type StreamOption = {
  videoDetail: VideoDetail
  video?: boolean
  audio?: boolean
  proxyHost?: string
  streamOpt: StreamPathOpt
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
  size: z.number().optional(),
  id: z.number()
})

type Stream = z.infer<typeof streamSchema>['dash']['audio'][number]

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

function ensureDirectoryExistence(filePath: string) {
  var dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) {
    return true
  }
  ensureDirectoryExistence(dirname)
  fs.mkdirSync(dirname)
}

const saveStreamTo = async (
  url: string,
  backupUrls: string[],
  destination: string
) => {
  ensureDirectoryExistence(destination)
  const res = await fetch(url)
  if (!res.ok) {
    const [backup, ...rest] = backupUrls
    if (backup) {
      core.info(
        `failed to fetch stream, use other backup stream url: ${backup}`
      )
      return await saveStreamTo(backup, rest, destination)
    } else {
      throw new Error(
        `failed to fetch stream: no other backup url available, ${JSON.stringify(res.body)}`
      )
    }
  }
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

const getTypeByMime = (mime: string) => {
  if (mime.startsWith('video')) return 'video'
  if (mime.startsWith('audio')) return 'audio'
  throw new Error(`Unknown mime: ${mime}`)
}

const getFilepath = (
  stream: Stream,
  metadata: VideoDetail,
  streamOpt: StreamPathOpt
) => {
  const { mimeType } = stream
  const param = { ...metadata, stream }

  const ext = getExtByMimeType(mimeType)
  const type = getTypeByMime(mimeType)
  let template = `output/output.${ext}`
  let res = template
  if (mimeType.startsWith('video') && streamOpt.videoFileTemplate)
    template = streamOpt.videoFileTemplate
  if (mimeType.startsWith('audio') && streamOpt.audioFileTemplate)
    template = streamOpt.audioFileTemplate

  try {
    res = format(template, param)
  } catch (e) {
    core.error(
      `使用模版获取Path出错，template[${template}],param: ${JSON.stringify(param)}`
    )
    core.info(`使用默认模版`)
  }
  core.setOutput(`${type}-output-path`, res)
  return res
}

export const getAndDownloadStream = async (
  cid: number,
  bvid: string,
  opt: StreamOption
) => {
  const streamDetail = await api.getStreamByCidAndBvid({ cid, bvid, ...opt })
  const stream = streamSchema.parse(streamDetail)
  let streams = []

  if (opt.audio) streams.push(stream.dash.audio)
  if (opt.video) streams.push(stream.dash.video)

  for (const stream of streams) {
    const sortedStream = stream.sort((a, b) => a.bandwidth - b.bandwidth)
    const { baseUrl, backupUrl } = sortedStream[0]
    core.debug(`handling stream: ${JSON.stringify(sortedStream[0])}`)
    const path = getFilepath(sortedStream[0], opt.videoDetail, opt.streamOpt)
    await saveStreamTo(baseUrl, backupUrl, path)
  }
}
