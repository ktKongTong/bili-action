import z from 'zod'
import * as core from '@actions/core'
const responseSchema = z.object({
  code: z.number(),
  message: z.coerce.string(),
  data: z.any().optional(),
  result: z.any().optional(),
  ttl: z.coerce.number().optional()
})

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
  if (parsed.data.data) return parsed.data.data as T
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
  getArchiveByUser: async (opt: { mid: number; keyword?: string }) => {
    const data = await apiFetch(
      `https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${opt.mid}&keywords=${opt.keyword ?? ''}&pn=0`
    )
    return data
  },

  getStreamByCidAndBvid: async (opt: {
    cid: number
    bvid: string
    sessdata?: string
    proxyHost?: string
  }) => {
    const host = opt.proxyHost || `https://api.bilibili.com`
    const data = await apiFetch(
      `${host}/x/player/playurl?fnval=16&cid=${opt.cid}&bvid=${opt.bvid}`
    )
    return data
  }
}
