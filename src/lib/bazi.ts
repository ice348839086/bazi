import { Solar, Lunar, EightChar } from 'lunar-javascript'
import type { BaZi, MingPan, TianGan, DiZhi, WuXing, WuXingStats, UserInfo, ShiChen } from '@/types'

// 时辰对应表
export const SHI_CHEN_LIST: ShiChen[] = [
  { name: '子', label: '子时', range: '23:00-00:59' },
  { name: '丑', label: '丑时', range: '01:00-02:59' },
  { name: '寅', label: '寅时', range: '03:00-04:59' },
  { name: '卯', label: '卯时', range: '05:00-06:59' },
  { name: '辰', label: '辰时', range: '07:00-08:59' },
  { name: '巳', label: '巳时', range: '09:00-10:59' },
  { name: '午', label: '午时', range: '11:00-12:59' },
  { name: '未', label: '未时', range: '13:00-14:59' },
  { name: '申', label: '申时', range: '15:00-16:59' },
  { name: '酉', label: '酉时', range: '17:00-18:59' },
  { name: '戌', label: '戌时', range: '19:00-20:59' },
  { name: '亥', label: '亥时', range: '21:00-22:59' },
]

// 天干五行对应
const TIAN_GAN_WU_XING: Record<TianGan, WuXing> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
}

// 地支五行对应
const DI_ZHI_WU_XING: Record<DiZhi, WuXing> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
}

// 时辰转换为小时（用于lunar-javascript）
function shiChenToHour(shiChen: string): number {
  const hourMap: Record<string, number> = {
    '子': 0,
    '丑': 2,
    '寅': 4,
    '卯': 6,
    '辰': 8,
    '巳': 10,
    '午': 12,
    '未': 14,
    '申': 16,
    '酉': 18,
    '戌': 20,
    '亥': 22,
  }
  return hourMap[shiChen] ?? 12
}

// 计算五行统计
function calculateWuXingStats(baZi: BaZi): WuXingStats {
  const stats: WuXingStats = {
    '金': 0,
    '木': 0,
    '水': 0,
    '火': 0,
    '土': 0,
  }

  // 统计四柱天干地支的五行
  const pillars = [baZi.yearPillar, baZi.monthPillar, baZi.dayPillar, baZi.hourPillar]

  for (const pillar of pillars) {
    const tianGanWuXing = TIAN_GAN_WU_XING[pillar.tianGan]
    const diZhiWuXing = DI_ZHI_WU_XING[pillar.diZhi]

    if (tianGanWuXing) stats[tianGanWuXing]++
    if (diZhiWuXing) stats[diZhiWuXing]++
  }

  return stats
}

// 格式化八字字符串
function formatBaZiString(baZi: BaZi): string {
  return [
    `${baZi.yearPillar.tianGan}${baZi.yearPillar.diZhi}`,
    `${baZi.monthPillar.tianGan}${baZi.monthPillar.diZhi}`,
    `${baZi.dayPillar.tianGan}${baZi.dayPillar.diZhi}`,
    `${baZi.hourPillar.tianGan}${baZi.hourPillar.diZhi}`,
  ].join(' ')
}

// 有效时辰列表（用于校验）
const VALID_SHI_CHEN = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])

// 计算八字命盘
export function calculateMingPan(userInfo: UserInfo): MingPan {
  // 输入校验
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(userInfo.birthDate)) {
    throw new Error('出生日期格式不正确，请使用 YYYY-MM-DD 格式（如：1990-05-15）')
  }
  const [year, month, day] = userInfo.birthDate.split('-').map(Number)
  if (year < 1900 || year > 2100) {
    throw new Error('出生年份需在 1900 年至 2100 年之间')
  }
  if (month < 1 || month > 12) {
    throw new Error('出生月份需在 1 至 12 之间')
  }
  if (day < 1 || day > 31) {
    throw new Error('出生日期需在 1 至 31 之间')
  }
  if (!VALID_SHI_CHEN.has(userInfo.birthTime)) {
    throw new Error('出生时辰无效，请选择子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥中的一项')
  }

  // 解析出生日期
  const hour = shiChenToHour(userInfo.birthTime)

  // 使用 lunar-javascript 创建公历日期
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0)

  // 获取农历
  const lunar = solar.getLunar()

  // 获取八字
  const eightChar = lunar.getEightChar()

  // 构建八字对象
  const baZi: BaZi = {
    yearPillar: {
      tianGan: eightChar.getYearGan() as TianGan,
      diZhi: eightChar.getYearZhi() as DiZhi,
    },
    monthPillar: {
      tianGan: eightChar.getMonthGan() as TianGan,
      diZhi: eightChar.getMonthZhi() as DiZhi,
    },
    dayPillar: {
      tianGan: eightChar.getDayGan() as TianGan,
      diZhi: eightChar.getDayZhi() as DiZhi,
    },
    hourPillar: {
      tianGan: eightChar.getTimeGan() as TianGan,
      diZhi: eightChar.getTimeZhi() as DiZhi,
    },
  }

  // 计算五行统计
  const wuXingStats = calculateWuXingStats(baZi)

  // 构建命盘
  const mingPan: MingPan = {
    userInfo,
    lunarDate: {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      isLeap: lunar.getMonth() < 0, // 负数表示闰月
    },
    baZi,
    baZiString: formatBaZiString(baZi),
    wuXingStats,
    dayMaster: baZi.dayPillar.tianGan,
  }

  return mingPan
}

// 获取五行颜色
export function getWuXingColor(wuXing: WuXing): string {
  const colorMap: Record<WuXing, string> = {
    '金': '#fbbf24', // 金色
    '木': '#22c55e', // 绿色
    '水': '#3b82f6', // 蓝色
    '火': '#ef4444', // 红色
    '土': '#a16207', // 黄褐色
  }
  return colorMap[wuXing]
}

// 获取天干五行
export function getTianGanWuXing(tianGan: TianGan): WuXing {
  return TIAN_GAN_WU_XING[tianGan]
}

// 获取地支五行
export function getDiZhiWuXing(diZhi: DiZhi): WuXing {
  return DI_ZHI_WU_XING[diZhi]
}

// 格式化农历日期
export function formatLunarDate(lunarDate: MingPan['lunarDate']): string {
  const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
  const dayNames = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ]

  const monthIndex = Math.abs(lunarDate.month) - 1
  const dayIndex = lunarDate.day - 1

  const leapPrefix = lunarDate.isLeap ? '闰' : ''

  return `${lunarDate.year}年${leapPrefix}${monthNames[monthIndex]}月${dayNames[dayIndex]}`
}
