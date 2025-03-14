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
  audio?: boolean
  video?: boolean
  sessdata?: string
}

const commonFieldSchema = z.object({
  // output
  audio: z.coerce.boolean().optional(),
  video: z.coerce.boolean().optional(),
  sessdata: z.string().optional()
})

const inputSchema = z
  .object({
    bvid: z.string().optional(),
    aid: z.coerce.number().optional(),
    cid: z.coerce.number().optional(),
    mid: z.coerce.number().optional(),
    keyword: z.string().optional()
  })
  .merge(commonFieldSchema)

function parseInput() {
  let input = {
    bvid: core.getInput('bvid'),
    aid: core.getInput('aid'),
    cid: core.getInput('cid'),
    mid: core.getInput('mid'),
    keyword: core.getInput('keyword'),
    audio: core.getInput('audio'),
    video: core.getInput('video'),
    sessdata: core.getInput('sessdata')
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
    await getBiliMetaByUser({ mid: input.mid!, keyword: input.keyword })
}

const idStrategy = {
  name: '按照bvid/aid/cid获取视频',
  cond: (input) => input.aid || input.bvid || input.cid,
  getter: (input) => getBiliMetaById({ aid: input.aid, bvid: input.bvid, cid: input.cid })
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
    core.debug(`开始将视频信息写入output`)
    handleData(videoMeta)
    core.debug(`output写入完成`)
    if (input.audio || input.video) {
      core.debug(`开始获取Stream`)
      // 保存视频流，音频流
      await getAndDownloadStream(videoMeta.cid, {})
      core.debug(`Stream获取完成`)
    }
    core.debug('Bilibili Action 执行完成')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
// const reasonMap = {
//   '0': '成功',
//   '-400': '请求错误',
//   '-403': '权限不足',
//   '-404': '无视频',
//   '62002': '稿件不可见',
//   '62004': '稿件审核中',
//   '62012': '仅UP主自己可见'
// }

const handleArray = (data: any[], key: string) => {
  for (const idx of data) {
    handleItem(data[idx], `${key}[${idx}]`)
  }
}

const handleItem = (data: any, key: string) => {
  switch (typeof data) {
    case 'bigint':
    case 'number':
    case 'string':
    case 'boolean':
      core.setOutput(key, data)
      break
    case 'object':
      if (data[key] instanceof Array) {
        handleArray(data[key], key)
      } else {
        handleData(data[key], key)
      }
      break
    case 'undefined':
      return
    case 'function':
    case 'symbol':
      throw new Error('Unreachable code line')
  }
}

const handleData = (data: Record<string, any>, prefix: string = '') => {
  const getKey = (key: string) => prefix + `${prefix === '' ? '' : '.'}` + key
  const keys = Object.keys(data)
  for (const key of keys) {
    handleItem(data[key], getKey(key))
  }
}
