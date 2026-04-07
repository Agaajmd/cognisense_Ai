'use client'

import { useState } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { Textarea } from '@/components/ui/textarea'
import { classifyProjectiveResponse, generateAssessmentResults } from '@/app/actions/analysis'
import { AlertTriangle, CheckCircle2, Shapes } from 'lucide-react'
import { projectiveResponseSchema } from '@/lib/validation/assessment'
import { FormError } from '@/components/assessment/atoms/form-error'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'

const cards = [
  { id: 1, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rorschach_blot_01.jpg', required: true },
  { id: 2, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rorschach_blot_02.jpg', required: true },
  { id: 3, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rorschach_blot_03.jpg', required: false },
]

interface ClassificationItem {
  cardId: number
  category: 'dark' | 'neutral'
  stressDelta: number
  reason: string
}

interface RorschachResponse {
  inkblot: number
  response: string
  interpretation: string
}

export default function Phase4Rorschach() {
  const { t, locale } = useI18n()
  const { setRorschach, baseline, questionnaire, biometric, chat, setResults, setCurrentPhase } = useAssessment()

  const [cardIndex, setCardIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [inputError, setInputError] = useState('')
  const [responses, setResponses] = useState<RorschachResponse[]>([])
  const [classifications, setClassifications] = useState<ClassificationItem[]>([])
  const [finalized, setFinalized] = useState(false)

  const currentCard = cards[cardIndex]

  const finalizeAssessment = async (nextResponses: RorschachResponse[], nextCls: ClassificationItem[]) => {
    const patterns = nextCls.some(item => item.category === 'dark')
      ? ['projective_dark', 'anxious']
      : ['integrative']

    setRorschach({
      responses: nextResponses,
      patterns,
    })

    const results = await generateAssessmentResults(
      baseline,
      questionnaire,
      biometric,
      chat.sentiment || 'neutral',
      patterns,
      locale
    )

    setResults(results)
    setFinalized(true)
  }

  const handleAnalyze = async () => {
    const parsed = projectiveResponseSchema.safeParse(response)
    if (!parsed.success) {
      setInputError(locale === 'id' ? 'Jawaban minimal 2 karakter dan maksimal 120 karakter.' : 'Response must be 2-120 characters.')
      return
    }

    setInputError('')
    setAnalyzing(true)

    const answer = parsed.data
    const cls = await classifyProjectiveResponse(answer, locale)

    const nextResponses: RorschachResponse[] = [
      ...responses,
      {
        inkblot: currentCard.id,
        response: answer,
        interpretation: cls.category,
      },
    ]

    const nextCls: ClassificationItem[] = [
      ...classifications,
      {
        cardId: currentCard.id,
        category: cls.category,
        stressDelta: cls.stressDelta,
        reason: cls.reason,
      },
    ]

    setResponses(nextResponses)
    setClassifications(nextCls)
    setResponse('')

    const isLastCard = cardIndex === cards.length - 1
    if (isLastCard) {
      await finalizeAssessment(nextResponses, nextCls)
    } else {
      setCardIndex(prev => prev + 1)
    }

    setAnalyzing(false)
  }

  const handleSkipOptional = async () => {
    if (currentCard.required) return
    setAnalyzing(true)
    await finalizeAssessment(responses, classifications)
    setAnalyzing(false)
  }

  const latestClassification = classifications[classifications.length - 1]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
      <div className="w-full max-w-2xl fade-in">
        <div className="glassmorphism p-8 md:p-12 space-y-8">
          <SectionHeading title={t('phase4.title')} subtitle={t('phase4.subtitle')} />

          <div className="rounded-xl border border-sky-100 bg-white/60 p-5">
            <div className="flex items-start gap-3 text-slate-700">
              <Shapes className="w-5 h-5 mt-0.5 text-primary" />
              <div>
                <p className="text-sm md:text-base font-medium">{t('phase4.instruction')}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {t('phase4.cardLabel', { index: cardIndex + 1, total: cards.length })}
                  {!currentCard.required ? ` • ${t('phase4.optionalTag')}` : ''}
                </p>
              </div>
            </div>
          </div>

          {!finalized && (
            <>
              <div className="flex justify-center items-center py-6 bg-white/50 rounded-lg border border-sky-200">
                <img
                  src={currentCard.image}
                  alt={`Rorschach Plate ${currentCard.id}`}
                  className="max-h-80 rounded-md border border-slate-200"
                  loading="lazy"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t('phase4.responseLabel')}</label>
                  <Textarea
                    value={response}
                    onChange={e => {
                      setResponse(e.target.value)
                      if (inputError) setInputError('')
                    }}
                    placeholder={t('phase4.responsePlaceholder')}
                    className="text-base min-h-24"
                  />
                  <FormError message={inputError} />
                </div>

                <PrimaryButton onClick={handleAnalyze} disabled={!response.trim() || analyzing}>
                  {analyzing
                    ? t('phase4.generating')
                    : cardIndex === cards.length - 1
                      ? t('phase4.analyze')
                      : t('phase4.nextCard')}
                </PrimaryButton>

                {!currentCard.required && (
                  <PrimaryButton
                    onClick={handleSkipOptional}
                    className="bg-secondary hover:bg-secondary/90"
                    disabled={analyzing}
                  >
                    {t('phase4.skipOptional')}
                  </PrimaryButton>
                )}
              </div>
            </>
          )}

          {(latestClassification || finalized) && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">{t('phase4.classificationTitle')}</p>
              {latestClassification && (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    {latestClassification.category === 'dark' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {t('phase4.category')}: {latestClassification.category === 'dark' ? t('phase4.categories.dark') : t('phase4.categories.neutral')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{t('phase4.stressImpact')}: +{latestClassification.stressDelta}</p>
                  <p className="text-sm text-slate-700">{t('phase4.rationale')}: {latestClassification.reason}</p>
                </>
              )}

              {finalized && (
                <PrimaryButton
                  onClick={() => setCurrentPhase('results')}
                  className="mt-2 bg-secondary hover:bg-secondary/90"
                >
                  {t('phase4.viewResults')}
                </PrimaryButton>
              )}
            </div>
          )}

          <a
            className="text-xs text-primary underline inline-block"
            href="https://commons.wikimedia.org/wiki/Category:Rorschach_inkblot_test"
            target="_blank"
            rel="noreferrer"
          >
            {t('phase4.reference')}
          </a>
        </div>
      </div>
    </div>
  )
}
