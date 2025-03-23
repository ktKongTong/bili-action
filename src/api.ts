import z from 'zod'
import * as core from '@actions/core'
import { wbiQuery } from './wbi.js'
const responseSchema = z.object({
  code: z.number(),
  message: z.coerce.string(),
  data: z.any().optional(),
  result: z.any().optional(),
  ttl: z.coerce.number().optional()
})

const ua =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0'
const apiFetch = async <T = unknown>(
  input: string | URL | globalThis.Request,
  init?: RequestInit
) => {
  core.debug(`Fetching ${input}`)
  const data = await fetch(input, init)
  if (!data.ok) {
    throw new Error(`Failed to fetch video data: ${data.statusText}`)
  }
  const body = await data.json()
  core.debug(`output, ${JSON.stringify(body)}`)
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(`Failed to parse video data: ${parsed.error}`)
  }
  if (parsed.data.code != 0)
    core.debug(`请求出错,非预期结果：${JSON.stringify(parsed.data)}`)
  if (parsed.data.data) {
    return parsed.data.data as T
  }
  return parsed.data.result as T
}

export const api = {
  getDetailById: async (opt: { bvid?: string; aid?: number; cid?: number }) => {
    const p = new URLSearchParams()
    if (opt.bvid) p.set('bvid', opt?.bvid)
    if (opt.aid) p.set('aid', opt.aid.toString())
    if (opt.cid) p.set('cid', opt.cid.toString())
    const data = await apiFetch(
      `https://api.bilibili.com/x/web-interface/view?${p.toString()}`
    )
    return data
  },

  // https://socialsisteryi.github.io/bilibili-API-collect/docs/video/collection.html#根据关键词查找视频
  getArchiveByUser: async (opt: {
    mid: number
    keyword?: string
    page: number
  }) => {
    const data = await apiFetch(
      `https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${opt.mid}&keywords=${opt.keyword ?? ''}&pn=${opt.page}&ps=100`
    )
    return data
  },
  getStreamByCidAndBvid: async (opt: {
    cid: number
    bvid: string
    sessdata?: string
    proxyHost?: string
  }) => {
    let url = `https://api.bilibili.com/x/player/playurl?fnval=16&cid=${opt.cid}&bvid=${opt.bvid}`
    if (opt.proxyHost) {
      url = `${opt.proxyHost}?${url}`
    }
    let cookie = opt.sessdata ? `SESSDATA=${opt.sessdata}` : ''
    const data = await apiFetch(url, {
      headers: {
        Cookie: cookie,
        Referer: 'https://www.bilibili.com/',
        'User-Agent': ua
      }
    })
    return data
  },

  getTopComment: async (opt: { aid: string }) => {
    const query = await wbiQuery({
      oid: opt.aid,
      type: 1
    })
    return apiFetch(`https://api.bilibili.com/x/v2/reply/wbi/main?${query}`, {
      headers: {
        Referer: 'https://www.bilibili.com/',
        'User-Agent': ua
      }
    })
  }
}
