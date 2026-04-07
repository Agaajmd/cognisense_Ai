'use client'

import { useState } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { baselineSchema } from '@/lib/validation/assessment'
import { FormError } from '@/components/assessment/atoms/form-error'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'
import { PhaseShell } from '@/components/assessment/molecules/phase-shell'

export default function Phase1Baseline() {
  const { baseline, setBaseline, setCurrentPhase } = useAssessment()
  const { t, locale } = useI18n()
  const [formData, setFormData] = useState(baseline)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleNext = () => {
    const parsed = baselineSchema.safeParse(formData)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      parsed.error.issues.forEach(issue => {
        const field = String(issue.path[0] || '')
        if (!field) return
        nextErrors[field] = issue.message || (locale === 'id' ? 'Input belum valid' : 'Invalid input')
      })
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setBaseline(formData)
    setCurrentPhase('questionnaire')
  }

  const isComplete = formData.age && formData.occupation && formData.sleepHours && formData.exerciseFrequency && formData.diet

  return (
    <PhaseShell maxWidth="max-w-2xl">
      <SectionHeading title={t('phase1.title')} subtitle={t('phase1.subtitle')} />

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase1.age')}</label>
              <Input
                type="number"
                min="18"
                max="120"
                value={formData.age}
                onChange={e => handleChange('age', e.target.value)}
                placeholder={t('phase1.agePlaceholder')}
                className="text-base"
              />
              <FormError message={errors.age} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase1.occupation')}</label>
              <Input
                value={formData.occupation}
                onChange={e => handleChange('occupation', e.target.value)}
                placeholder={t('phase1.occupationPlaceholder')}
                className="text-base"
              />
              <FormError message={errors.occupation} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase1.sleepHours')}</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="12"
                value={formData.sleepHours}
                onChange={e => handleChange('sleepHours', e.target.value)}
                placeholder={t('phase1.sleepHoursPlaceholder')}
                className="text-base"
              />
              <FormError message={errors.sleepHours} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase1.exercise')}</label>
              <Select value={formData.exerciseFrequency} onValueChange={val => handleChange('exerciseFrequency', val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phase1.exercisePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('phase1.options.never')}</SelectItem>
                  <SelectItem value="rare">{t('phase1.options.rare')}</SelectItem>
                  <SelectItem value="moderate">{t('phase1.options.moderate')}</SelectItem>
                  <SelectItem value="frequent">{t('phase1.options.frequent')}</SelectItem>
                </SelectContent>
              </Select>
              <FormError message={errors.exerciseFrequency} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase1.diet')}</label>
              <Select value={formData.diet} onValueChange={val => handleChange('diet', val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phase1.dietPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">{t('phase1.options.poor')}</SelectItem>
                  <SelectItem value="fair">{t('phase1.options.fair')}</SelectItem>
                  <SelectItem value="good">{t('phase1.options.good')}</SelectItem>
                  <SelectItem value="excellent">{t('phase1.options.excellent')}</SelectItem>
                </SelectContent>
              </Select>
              <FormError message={errors.diet} />
            </div>
          </div>

          <PrimaryButton
            onClick={handleNext}
            disabled={!isComplete}
          >
            {t('phase1.next')}
          </PrimaryButton>
    </PhaseShell>
  )
}
