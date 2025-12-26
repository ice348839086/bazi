'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { getWuXingColor, getTianGanWuXing, getDiZhiWuXing, formatLunarDate } from '@/lib/bazi'
import type { MingPan, WuXing } from '@/types'

interface BaZiDisplayProps {
  mingPan: MingPan
}

function PillarCard({
  title,
  tianGan,
  diZhi
}: {
  title: string
  tianGan: string
  diZhi: string
}) {
  const tianGanWuXing = getTianGanWuXing(tianGan as any)
  const diZhiWuXing = getDiZhiWuXing(diZhi as any)

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-mystic-400 mb-2">{title}</span>
      <div className="flex flex-col gap-1">
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-xl md:text-2xl font-bold border"
          style={{
            color: getWuXingColor(tianGanWuXing),
            borderColor: getWuXingColor(tianGanWuXing),
            backgroundColor: `${getWuXingColor(tianGanWuXing)}15`,
          }}
        >
          {tianGan}
        </div>
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-xl md:text-2xl font-bold border"
          style={{
            color: getWuXingColor(diZhiWuXing),
            borderColor: getWuXingColor(diZhiWuXing),
            backgroundColor: `${getWuXingColor(diZhiWuXing)}15`,
          }}
        >
          {diZhi}
        </div>
      </div>
      <div className="mt-1 flex flex-col items-center text-[10px]">
        <span style={{ color: getWuXingColor(tianGanWuXing) }}>{tianGanWuXing}</span>
        <span style={{ color: getWuXingColor(diZhiWuXing) }}>{diZhiWuXing}</span>
      </div>
    </div>
  )
}

function WuXingBar({ wuXing, count, max }: { wuXing: WuXing; count: number; max: number }) {
  const percentage = max > 0 ? (count / max) * 100 : 0
  const color = getWuXingColor(wuXing)

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-6 text-center font-bold"
        style={{ color }}
      >
        {wuXing}
      </span>
      <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="w-6 text-right text-mystic-400 text-sm">{count}</span>
    </div>
  )
}

export function BaZiDisplay({ mingPan }: BaZiDisplayProps) {
  const { baZi, wuXingStats, lunarDate, dayMaster } = mingPan
  const maxWuXing = Math.max(...Object.values(wuXingStats))
  const dayMasterWuXing = getTianGanWuXing(dayMaster)

  return (
    <Card variant="gold" className="animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-center">您的生辰八字</CardTitle>
        <p className="text-center text-sm text-mystic-400 mt-1">
          农历 {formatLunarDate(lunarDate)}
        </p>
      </CardHeader>

      <CardContent>
        {/* 四柱展示 */}
        <div className="flex justify-center gap-3 md:gap-6 mb-6">
          <PillarCard
            title="年柱"
            tianGan={baZi.yearPillar.tianGan}
            diZhi={baZi.yearPillar.diZhi}
          />
          <PillarCard
            title="月柱"
            tianGan={baZi.monthPillar.tianGan}
            diZhi={baZi.monthPillar.diZhi}
          />
          <PillarCard
            title="日柱"
            tianGan={baZi.dayPillar.tianGan}
            diZhi={baZi.dayPillar.diZhi}
          />
          <PillarCard
            title="时柱"
            tianGan={baZi.hourPillar.tianGan}
            diZhi={baZi.hourPillar.diZhi}
          />
        </div>

        {/* 日主提示 */}
        <div className="text-center mb-6 p-3 rounded-lg bg-dark-900/50">
          <p className="text-sm text-mystic-300">
            日主（日元）：
            <span
              className="text-lg font-bold ml-1"
              style={{ color: getWuXingColor(dayMasterWuXing) }}
            >
              {dayMaster}
            </span>
            <span
              className="text-sm ml-1"
              style={{ color: getWuXingColor(dayMasterWuXing) }}
            >
              ({dayMasterWuXing})
            </span>
          </p>
        </div>

        {/* 五行统计 */}
        <div className="space-y-2">
          <h4 className="text-sm text-mystic-400 mb-3">五行分布</h4>
          <WuXingBar wuXing="金" count={wuXingStats.金} max={maxWuXing} />
          <WuXingBar wuXing="木" count={wuXingStats.木} max={maxWuXing} />
          <WuXingBar wuXing="水" count={wuXingStats.水} max={maxWuXing} />
          <WuXingBar wuXing="火" count={wuXingStats.火} max={maxWuXing} />
          <WuXingBar wuXing="土" count={wuXingStats.土} max={maxWuXing} />
        </div>

        {/* 八字文字形式 */}
        <div className="mt-4 pt-4 border-t border-mystic-800/50 text-center">
          <p className="text-xs text-mystic-500">
            八字：
            <span className="text-mystic-300 tracking-widest ml-1">
              {mingPan.baZiString}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
