'use client'

import { AssessmentProvider, useAssessment } from '@/app/context/assessment-context'
import { LanguageProvider } from '@/app/context/language-context'
import Header from '@/components/assessment/header'
import Phase1Baseline from '@/components/assessment/phases/phase-1-baseline'
import Phase2Questionnaire from '@/components/assessment/phases/phase-2-questionnaire'
import Phase2Biometric from '@/components/assessment/phases/phase-2-biometric'
import Phase3Chat from '@/components/assessment/phases/phase-3-chat'
import Phase4Rorschach from '@/components/assessment/phases/phase-4-rorschach'
import Phase5Results from '@/components/assessment/phases/phase-5-results'

function AssessmentContent() {
  const { currentPhase } = useAssessment()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
      <Header />
      {currentPhase === 'baseline' && <Phase1Baseline />}
      {currentPhase === 'questionnaire' && <Phase2Questionnaire />}
      {currentPhase === 'biometric' && <Phase2Biometric />}
      {currentPhase === 'chat' && <Phase3Chat />}
      {currentPhase === 'rorschach' && <Phase4Rorschach />}
      {currentPhase === 'results' && <Phase5Results />}
    </div>
  )
}

export default function Home() {
  return (
    <LanguageProvider>
      <AssessmentProvider>
        <AssessmentContent />
      </AssessmentProvider>
    </LanguageProvider>
  )
}
