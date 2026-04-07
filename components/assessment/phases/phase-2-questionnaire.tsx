'use client'

import { useState } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'
import { PhaseShell } from '@/components/assessment/molecules/phase-shell'
import { FormError } from '@/components/assessment/atoms/form-error'

const likert = [1, 2, 3, 4, 5] as const

type Key = 'cognitive' | 'emotional' | 'somatic' | 'behavioral' | 'overload'

export default function Phase2Questionnaire() {
  const { questionnaire, setQuestionnaire, setCurrentPhase } = useAssessment()
  const { locale } = useI18n()
  const [answers, setAnswers] = useState(questionnaire)
  const [error, setError] = useState('')

  const questions: Array<{ key: Key; text: string }> =
    locale === 'id'
      ? [
          {
            key: 'cognitive',
            text: 'Dalam sebulan terakhir, seberapa sering kamu kesulitan fokus atau pikiran tiba-tiba kosong?',
          },
          {
            key: 'emotional',
            text: 'Seberapa sering kamu merasa kewalahan dan tidak bisa mengontrol hal penting dalam hidupmu?',
          },
          {
            key: 'somatic',
            text: 'Apakah akhir-akhir ini kamu sering merasa tegang di rahang, leher, pundak, atau sakit kepala ringan?',
          },
          {
            key: 'behavioral',
            text: 'Seberapa sering kamu jadi sensitif atau mudah tersinggung oleh hal kecil?',
          },
          {
            key: 'overload',
            text: 'Seberapa sering kamu merasa energi mentalmu habis sebelum hari berakhir?',
          },
        ]
      : [
          {
            key: 'cognitive',
            text: 'In the last month, how often did you struggle to focus or feel your mind suddenly blank?',
          },
          {
            key: 'emotional',
            text: 'How often did you feel overwhelmed and unable to control important things in your life?',
          },
          {
            key: 'somatic',
            text: 'Have you recently experienced unusual muscle tension (jaw, neck, shoulders) or mild headaches?',
          },
          {
            key: 'behavioral',
            text: 'How often do you become emotionally reactive or irritated by small triggers?',
          },
          {
            key: 'overload',
            text: 'How often do you feel mentally drained before the day ends?',
          },
        ]

  const scaleLabel =
    locale === 'id'
      ? ['Tidak Pernah', 'Jarang', 'Kadang-kadang', 'Sering', 'Sangat Sering']
      : ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often']

  const setValue = (key: Key, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const handleNext = () => {
    const allAnswered = Object.values(answers).every(value => value >= 1 && value <= 5)
    if (!allAnswered) {
      setError(locale === 'id' ? 'Semua pertanyaan wajib dijawab dengan skala 1-5.' : 'Please answer all questions on a 1-5 scale.')
      return
    }

    setQuestionnaire(answers)
    setCurrentPhase('biometric')
  }

  return (
    <PhaseShell maxWidth="max-w-3xl">
      <SectionHeading
        title={locale === 'id' ? 'Fase 2: Kuesioner Gejala Stres' : 'Phase 2: Stress Symptoms Questionnaire'}
        subtitle={
          locale === 'id'
            ? 'Skala 1-5 untuk validasi gejala kognitif, emosional, dan fisik sebelum biometrik visual.'
            : 'Use a 1-5 scale to validate cognitive, emotional, and somatic symptoms before visual biometrics.'
        }
      />

      <div className="space-y-6">
        {questions.map((item, idx) => (
          <div key={item.key} className="rounded-lg border border-sky-200 bg-white/70 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {idx + 1}. {item.text}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {likert.map(value => (
                <button
                  key={`${item.key}-${value}`}
                  type="button"
                  onClick={() => setValue(item.key, value)}
                  className={`smooth-transition rounded-md border px-2 py-2 text-sm font-medium ${
                    answers[item.key] === value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-600">
              {scaleLabel.map((label, i) => (
                <span key={`${item.key}-label-${i}`} className="mr-2">
                  {i + 1}:{label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <FormError message={error} />
      <PrimaryButton onClick={handleNext}>{locale === 'id' ? 'Lanjut ke Biometrik Wajah' : 'Continue to Facial Biometrics'}</PrimaryButton>
    </PhaseShell>
  )
}
