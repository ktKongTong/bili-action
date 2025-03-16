import { api } from './api.js'
import z from 'zod'

const rightSchema = z
  .object({
    bp: z.number().describe('是否允许投稿'),
    elec: z.number().describe('是否允许投稿'),
    download: z.number().describe('是否允许下载'),
    movie: z.number().describe('是否允许投稿'),
    pay: z.number().describe('是否允许投稿'),
    hd5: z.number().describe('是否允许投稿'),
    no_reprint: z.number().describe('是否允许转载'),
    autoplay: z.number().describe('是否允许自动播放'),
    ugc_pay: z.number().describe('是否允许投稿'),
    is_cooperation: z.number().describe('是否允许投稿'),
    ugc_pay_preview: z.number().describe('是否允许投稿'),
    no_background: z.number().describe('是否允许投稿'),
    clean_mode: z.number().describe('是否允许投稿'),
    is_stein_gate: z.number().describe('是否允许投稿'),
    is_360: z.number().describe('是否允许投稿'),
    no_share: z.number().describe('是否允许分享'),
    arc_pay: z.number().describe('是否允许投稿'),
    free_watch: z.number().describe('是否免费可观看')
  })
  .describe('视频属性flag')

const pageSchema = z.object({
  cid: z.number().describe('分P cid'),
  dimension: z
    .object({
      width: z.number(),
      height: z.number(),
      rotate: z.number()
    })
    .describe('分辨率'),
  from: z.string().describe('来源'),
  page: z.number().describe('分P'),
  part: z.string().describe('unknown'),
  duration: z.number().describe('分P时长(秒)'),
  vid: z.string().describe('unknown'),
  weblink: z.string().describe('unknown')
})
const statSchema = z
  .object({
    aid: z.number().optional(),
    view: z.number().optional(),
    danmaku: z.number().optional(),
    reply: z.number().optional(),
    favorite: z.number().optional(),
    coin: z.number().optional(),
    share: z.number().optional(),
    now_rank: z.number().optional(),
    his_rank: z.number().optional(),
    like: z.number().optional(),
    dislike: z.number().optional(),
    evaluation: z.string().optional(),
    vt: z.number().optional()
  })
  .describe('视频状态信息')

const detailSchema = z.object({
  bvid: z.string(),
  aid: z.coerce.number(),
  videos: z.number().describe('视频分p数'),
  tid: z.number().describe('分区tid'),
  tid_v2: z.number().optional().describe('v2分区tid'),
  tname: z.string().describe('子分区名称'),
  tname_v2: z.string().optional().describe('V2子分区名称'),
  copyright: z.number().describe('版权类型——1:原创,2:转载'),
  pic: z.string().describe('封面图 url'),
  title: z.string().describe('视频标题'),
  pubdate: z.coerce.number().describe('视频发布时间(秒级时间戳）'),
  ctime: z.coerce.number().describe('视频创建时间(秒级时间戳）'),
  desc: z.string().describe('视频简介'),
  desc_v2: z
    .array(
      z.object({
        raw_text: z.string().describe('元素文本'),
        type: z.number().describe('元素类型——0:文本,1:mention'),
        biz_id: z.number().describe('默认为0，当type为1时，表示被@的用户id')
      })
    )
    .nullish()
    .describe('视频简介V2'),
  state: z
    .number()
    .describe('视频状态——一般为0(正常)，少数为1(橙色过审)，小于1则对外不可见'),
  duration: z.coerce.number().describe('所有分片总视频时长(秒)'),
  redirect_url: z
    .string()
    .optional()
    .describe('重定向链接，仅番剧/影视存在，转为 epid'),
  rights: rightSchema,
  owner: z
    .object({
      mid: z.coerce.number().describe('UP主id'),
      name: z.string().describe('UP主名称'),
      face: z.string().describe('UP主头像 url')
    })
    .describe('UP主信息'),
  stat: statSchema,
  argue_info: z
    .object({
      argue_msg: z.string(),
      argue_type: z.number(),
      argue_link: z.string()
    })
    .optional()
    .describe('争议信息'),
  dynamic: z.string().optional().describe('关联动态文本'),
  cid: z.number().describe('视频1P cid'),
  dimension: z
    .object({
      width: z.number(),
      height: z.number(),
      rotate: z.number()
    })
    .describe('视频1P分辨率'),
  premiere: z.any().nullish().describe('unknown').optional(),
  teenage_mode: z.number().describe('青少年模式，具体含义未知').optional(),
  is_chargeable_season: z.coerce
    .boolean()
    .describe('是否可充电（剧集季)?')
    .optional(),
  is_story: z.coerce.boolean().describe('unknown').optional(),
  is_upower_exclusive: z.coerce.boolean().describe('是否充电专属').optional(),
  is_upower_play: z.coerce.boolean().describe('unknown').optional(),
  is_upower_show: z.coerce.boolean().describe('unknown').optional(),
  no_cache: z.coerce.boolean().describe('不允许缓存').optional(),
  enable_vt: z.number().optional().describe('unknwon').optional(),
  vt_display: z.string().optional().describe('unknown').optional(),
  pages: z.array(pageSchema).describe('分P信息'),
  subtitle: z
    .object({
      allow_submit: z.boolean().describe('是否允许提交'),
      list: z.any().array()
    })
    .optional(),
  is_season_display: z.boolean().describe('unknown').optional(),
  user_garb: z.any().describe('用户装扮信息').optional(),
  honor_reply: z
    .object({
      honor: z.any().array().optional().describe('荣誉，如全站最高排名')
    })
    .optional(),
  like_icon: z.string().describe('可能是活动定制点赞图标').optional(),
  need_jump_bv: z.boolean().describe('跳转到BV').optional(),
  disable_show_up_info: z.boolean().describe('不展示 up 信息').optional(),
  is_story_play: z.number().describe('unknown').optional(),
  is_view_self: z.boolean().describe('是否为自己投稿').optional()
})

export type VideoDetail = z.infer<typeof detailSchema>

export async function getBiliMetaById(opt: {
  bvid?: string
  aid?: number
  cid?: number
}) {
  const detail = await api.getDetailById(opt)
  const data = detailSchema.parse(detail)
  return data
}

const archiveItemSchema = z.object({
  aid: z.coerce.string(),
  title: z.string(),
  pubdate: z.number(),
  ctime: z.number(),
  state: z.number(),
  pic: z.string(),
  duration: z.number(),
  stat: z.any(),
  bvid: z.string(),
  ugc_pay: z.number(),
  interactive_video: z.boolean(),
  enable_vt: z.number(),
  vt_display: z.string(),
  playback_position: z.number()
})
const archiveSchema = z.object({
  archives: z.array(archiveItemSchema),
  page: z.object({
    num: z.number(),
    size: z.number(),
    total: z.number()
  })
})

export async function getBiliMetaByUser(opt: {
  mid: number
  keyword?: string
}) {
  const archives = await api.getArchiveByUser(opt)
  const parsedArchives = archiveSchema.parse(archives)
  const bvid = parsedArchives.archives[0].bvid
  const data = getBiliMetaById({ bvid: bvid })
  return data
}
