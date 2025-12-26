'use client'

import { useState, FormEvent } from 'react'
import { Calendar, User, Clock, MapPin, Sparkles } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { SHI_CHEN_LIST } from '@/lib/bazi'
import type { UserInfo } from '@/types'

interface UserInfoFormProps {
  onSubmit: (userInfo: UserInfo) => void
  isLoading?: boolean
}

export function UserInfoForm({ onSubmit, isLoading }: UserInfoFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthDate: '1995-01-01',
    birthTime: '',
    birthPlace: '',
  })

  // 使用函数式更新避免状态丢失
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名'
    }

    if (!formData.gender) {
      newErrors.gender = '请选择性别'
    }

    if (!formData.birthDate) {
      newErrors.birthDate = '请选择出生日期'
    }

    if (!formData.birthTime) {
      newErrors.birthTime = '请选择出生时辰'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const userInfo: UserInfo = {
      name: formData.name.trim(),
      gender: formData.gender as '男' | '女',
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthPlace: formData.birthPlace || undefined,
    }

    onSubmit(userInfo)
  }

  const genderOptions = [
    { value: '男', label: '男' },
    { value: '女', label: '女' },
  ]

  const shiChenOptions = SHI_CHEN_LIST.map((sc) => ({
    value: sc.name,
    label: sc.label,
    description: sc.range,
  }))

  return (
    <Card variant="elevated" className="max-w-xl mx-auto animate-fadeIn">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-dark-950" />
          </div>
          <div>
            <CardTitle>开始您的命理之旅</CardTitle>
            <p className="text-sm text-mystic-400 mt-1">请填写您的基本信息，我们将为您解读命运密码</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 姓名 */}
          <div className="relative">
            <div className="absolute left-4 top-[42px] text-mystic-400 pointer-events-none">
              <User className="w-5 h-5" />
            </div>
            <Input
              id="name"
              label="姓名"
              placeholder="请输入您的姓名"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              error={errors.name}
              className="pl-12"
            />
          </div>

          {/* 性别 */}
          <Select
            id="gender"
            label="性别"
            placeholder="请选择性别"
            options={genderOptions}
            value={formData.gender}
            onChange={(e) => updateFormData('gender', e.target.value)}
            error={errors.gender}
          />

          {/* 出生日期 */}
          <div className="relative">
            <div className="absolute left-4 top-[42px] text-mystic-400 pointer-events-none">
              <Calendar className="w-5 h-5" />
            </div>
            <Input
              id="birthDate"
              type="date"
              label="出生日期（公历）"
              value={formData.birthDate}
              onChange={(e) => updateFormData('birthDate', e.target.value)}
              error={errors.birthDate}
              className="pl-12"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* 出生时辰 */}
          <div className="relative">
            <div className="absolute left-4 top-[42px] text-mystic-400 pointer-events-none z-10">
              <Clock className="w-5 h-5" />
            </div>
            <Select
              id="birthTime"
              label="出生时辰"
              placeholder="请选择出生时辰"
              options={shiChenOptions}
              value={formData.birthTime}
              onChange={(e) => updateFormData('birthTime', e.target.value)}
              error={errors.birthTime}
              className="pl-12"
            />
          </div>

          {/* 出生地点（可选） */}
          <div className="relative">
            <div className="absolute left-4 top-[42px] text-mystic-400 pointer-events-none">
              <MapPin className="w-5 h-5" />
            </div>
            <Input
              id="birthPlace"
              label="出生地点（可选）"
              placeholder="如：北京市"
              value={formData.birthPlace}
              onChange={(e) => updateFormData('birthPlace', e.target.value)}
              className="pl-12"
            />
            <p className="text-xs text-mystic-500 mt-1">用于真太阳时校正，可提高准确性</p>
          </div>

          {/* 提交按钮 */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              开始算命
            </Button>
          </div>
        </form>

        {/* 提示信息 */}
        <div className="mt-6 p-4 rounded-lg bg-mystic-950/50 border border-mystic-800/50">
          <p className="text-xs text-mystic-400 leading-relaxed">
            <span className="text-gold-400">温馨提示：</span>
            为保证分析准确性，请尽可能准确地填写您的出生信息。所有数据仅用于命理分析，不会被存储或分享给第三方。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
