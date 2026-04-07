'use client'

import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { BarChart3, ClipboardList, FileQuestion, MessageCircle, ScanFace, Shapes, Sparkles } from 'lucide-react'

export default function Header() {
  const { currentPhase, phaseProgress } = useAssessment()
  const { t, toggleLocale } = useI18n()

  const phases = [
    { id: 'baseline', label: t('header.phases.baseline'), icon: ClipboardList },
    { id: 'questionnaire', label: t('header.phases.questionnaire'), icon: FileQuestion },
    { id: 'biometric', label: t('header.phases.biometric'), icon: ScanFace },
    { id: 'chat', label: t('header.phases.chat'), icon: MessageCircle },
    { id: 'rorschach', label: t('header.phases.rorschach'), icon: Shapes },
    { id: 'results', label: t('header.phases.results'), icon: BarChart3 },
  ]

  return (
    <div className="sticky top-3 z-50 px-3 sm:px-4">
      <div className="glassmorphism max-w-5xl mx-auto rounded-2xl border border-sky-100/80 shadow-[0_8px_30px_rgba(14,56,110,0.08)] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CogniSense</h1>
              <p className="text-xs text-slate-600">{t('header.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLocale}
              className="smooth-transition px-3 py-1.5 text-xs rounded-md bg-white/60 border border-white/70 text-slate-700 hover:bg-white"
              aria-label={t('header.langLabel')}
            >
              {t('header.switch')}
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{phaseProgress.toFixed(0)}%</p>
              <p className="text-xs text-slate-600">{t('header.complete')}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-sky-100/70 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="smooth-transition h-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${phaseProgress}%` }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="flex justify-between items-center gap-1 sm:gap-2">
          {phases.map((phase, idx) => (
            <div key={phase.id} className="flex flex-col items-center gap-1">
              <div
                className={`smooth-transition w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                  phases.findIndex(p => p.id === currentPhase) >= idx
                    ? 'bg-primary border-primary text-white'
                    : 'bg-sky-50 border-sky-200 text-slate-600'
                }`}
              >
                <phase.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 hidden md:inline">{phase.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
