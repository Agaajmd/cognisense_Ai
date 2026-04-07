'use client'

import { useState, useEffect } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { downloadAssessmentPdf } from '@/lib/report/pdf'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'

export default function Phase5Results() {
  const { results, reset } = useAssessment()
  const { t, locale } = useI18n()
  const [displayedScore, setDisplayedScore] = useState(0)

  useEffect(() => {
    if (!results) return

    const increment = results.stressScore / 30
    const interval = setInterval(() => {
      setDisplayedScore(prev => {
        const next = prev + increment
        return next >= results.stressScore ? results.stressScore : next
      })
    }, 50)

    return () => clearInterval(interval)
  }, [results])

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 p-4">
        <div className="text-center">
          <p className="text-slate-600">{t('phase5.loading')}</p>
        </div>
      </div>
    )
  }

  const stressLevel = results.stressScore < 35 ? t('phase5.levels.low') : results.stressScore < 70 ? t('phase5.levels.moderate') : t('phase5.levels.high')
  const stressColor = results.stressScore < 35 ? 'text-green-600' : results.stressScore < 70 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 p-4 fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <SectionHeading title={t('phase5.title')} subtitle={t('phase5.subtitle')} />
        </div>

        {/* Main Score Card */}
        <div className="glassmorphism p-8 md:p-12 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Stress Score with Donut */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(107, 114, 128, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(displayedScore / 100) * 251.2} 251.2`}
                    className={`smooth-transition ${stressColor}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{Math.round(displayedScore)}</span>
                  <span className="text-sm text-slate-600">{t('phase5.stressScore')}</span>
                </div>
              </div>
              <div className={`text-xl font-semibold ${stressColor}`}>{stressLevel}</div>
            </div>

            {/* Wellness Score */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(107, 114, 128, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(results.wellnessScore / 100) * 251.2} 251.2`}
                    className="smooth-transition text-green-600"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{Math.round(results.wellnessScore)}</span>
                  <span className="text-sm text-slate-600">{t('phase5.wellness')}</span>
                </div>
              </div>
              <div className="text-xl font-semibold text-green-600">{t('phase5.levels.goodWellness')}</div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/50 border border-sky-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('phase5.summary')}</h3>
            <p className="text-slate-700 leading-relaxed">{results.summary}</p>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('phase5.recommendations')}</h3>
            <div className="space-y-3">
              {results.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="smooth-transition bg-sky-50 border border-sky-200 rounded-lg p-4 hover:bg-sky-100 flex items-start gap-3"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <p className="text-slate-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {results.breakdown.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">{locale === 'id' ? 'Alasan dan Penjelasan Detail' : 'Detailed Reasons & Explanation'}</h3>
              <div className="space-y-3">
                {results.breakdown.map((item, idx) => (
                  <div key={`${item.factor}-${idx}`} className="rounded-lg border border-blue-100 bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.factor}</p>
                      <p className={`text-sm font-semibold ${item.impact >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {item.impact >= 0 ? '+' : ''}{item.impact}
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <PrimaryButton
              onClick={() => {
                reset()
                window.location.reload()
              }}
            >
              {t('phase5.newAssessment')}
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                void downloadAssessmentPdf(results, locale)
              }}
              className="bg-secondary hover:bg-secondary/90"
            >
              {t('phase5.download')}
            </PrimaryButton>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-slate-600">
          <p>{t('phase5.footer')}</p>
        </div>
      </div>
    </div>
  )
}
