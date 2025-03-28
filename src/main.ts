import * as core from '@actions/core'
import z from 'zod'
import { getBiliMetaById, getBiliMetaByUser, VideoDetail } from './bili-meta.js'
import { getAndDownloadStream } from './get-stream.js'

type Input = {
  bvid?: string
  aid?: number
  cid?: number
  mid?: number
  keyword?: string
  page?: number
  batch?: boolean
  audio?: boolean
  video?: boolean
  sessdata?: string
  proxyHost?: string
  audioFileTemplate?: string
  videoFileTemplate?: string
}

const commonFieldSchema = z.object({
  // output
  audio: z.coerce.boolean().optional(),
  video: z.coerce.boolean().optional(),
  sessdata: z.string().optional(),
  proxyHost: z.string().optional(),
  audioFileTemplate: z.string().optional(),
  videoFileTemplate: z.string().optional()
})

const inputSchema = z
  .object({
    bvid: z.string().optional(),
    aid: z.coerce.number().optional(),
    cid: z.coerce.number().optional(),
    mid: z.coerce.number().optional(),
    keyword: z.string().optional(),
    batch: z.coerce.boolean().optional()
  })
  .merge(commonFieldSchema)

function parseInput() {
  let input = {
    bvid: core.getInput('bvid'),
    aid: core.getInput('aid'),
    cid: core.getInput('cid'),
    mid: core.getInput('mid'),
    keyword: core.getInput('keyword'),
    page: core.getInput('page'),
    audio: core.getInput('audio'),
    video: core.getInput('video'),
    sessdata: core.getInput('sessdata'),
    proxyHost: core.getInput('proxy-stream-host'),
    audioFileTemplate: core.getInput('audio-file-template'),
    videoFileTemplate: core.getInput('video-file-template'),
    batch: core.getInput('batch')
  }
  const parsedInput = inputSchema.parse(input)

  return parsedInput
}

type Strategy = {
  name: string
  cond: (input: Input) => any
  getter: (input: Input) => Promise<VideoDetail>
}

const userStrategy: Strategy = {
  name: '按照关键字和用户ID获取最新视频',
  cond: (input: Input) => input.mid,
  getter: async (input: Input) =>
    await getBiliMetaByUser({
      mid: input.mid!,
      keyword: input.keyword,
      batch: input.batch ?? false
    })
}

const idStrategy = {
  name: '按照bvid/aid获取视频',
  cond: (input) => input.aid || input.bvid,
  getter: (input) =>
    getBiliMetaById({ aid: input.aid, bvid: input.bvid, cid: input.cid })
} satisfies Strategy

const strategies = [idStrategy, userStrategy]

export async function run(): Promise<void> {
  core.debug('开始执行 Bilibili Action')
  const input = parseInput()
  core.debug(`Input: ${JSON.stringify(input)}`)
  try {
    let videoMeta: VideoDetail | null | undefined
    // strategy 1 check avid bvid cid
    for (const stra of strategies) {
      if (stra.cond(input)) {
        try {
          core.debug(`执行策略【${stra.name}】: ${JSON.stringify(input)}`)
          videoMeta = await stra.getter(input)
          break
        } catch (e: any) {
          core.debug(`执行策略【${stra.name}】失败: ${e?.toString()}`)
        }
      }
    }
    if (!videoMeta) {
      throw new Error('未能获取到视频信息')
    }
    core.debug(`成功获取视频信息: ${JSON.stringify(videoMeta)}`)
    // console.log('setting-output', JSON.stringify(videoMeta))
    core.setOutput('video', videoMeta)
    if (input.audio || input.video) {
      core.debug(`开始获取Stream`)
      // 保存视频流，音频流
      await getAndDownloadStream(videoMeta.cid, videoMeta.bvid, {
        video: input.video,
        audio: input.audio,
        proxyHost: input.proxyHost,
        videoDetail: videoMeta,
        streamOpt: {
          videoFileTemplate: input.videoFileTemplate,
          audioFileTemplate: input.audioFileTemplate
        }
      })
      core.debug(`Stream获取完成`)
    }
    core.debug('Bilibili Action 执行完成')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
