'use client'

import React, { createContext, useContext, useState } from 'react'

export type Phase = 'baseline' | 'questionnaire' | 'biometric' | 'chat' | 'rorschach' | 'results'

export interface BaselineData {
  age: string
  occupation: string
  sleepHours: string
  exerciseFrequency: string
  diet: string
}

export interface BiometricData {
  heartRate: number
  bloodPressure: string
  respiratoryRate: number
  skinConductance: number
  microExpression: number
  skinPallor: number
  pupilDilation: number
}

export interface QuestionnaireData {
  cognitive: number
  emotional: number
  somatic: number
  behavioral: number
  overload: number
}

export interface ChatData {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  sentiment: 'positive' | 'neutral' | 'negative' | null
}

export interface RorschachData {
  responses: Array<{ inkblot: number; response: string; interpretation: string }>
  patterns: string[]
}

export interface AssessmentResults {
  stressScore: number
  wellnessScore: number
  recommendations: string[]
  summary: string
  breakdown: Array<{ factor: string; impact: number; reason: string }>
}

export interface AssessmentContextType {
  currentPhase: Phase
  setCurrentPhase: (phase: Phase) => void
  baseline: BaselineData
  setBaseline: (data: BaselineData) => void
  questionnaire: QuestionnaireData
  setQuestionnaire: (data: QuestionnaireData) => void
  biometric: BiometricData
  setBiometric: (data: BiometricData) => void
  chat: ChatData
  setChat: (data: ChatData) => void
  rorschach: RorschachData
  setRorschach: (data: RorschachData) => void
  results: AssessmentResults | null
  setResults: (data: AssessmentResults) => void
  reset: () => void
  phaseProgress: number
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined)

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [currentPhase, setCurrentPhase] = useState<Phase>('baseline')
  const [baseline, setBaseline] = useState<BaselineData>({
    age: '',
    occupation: '',
    sleepHours: '',
    exerciseFrequency: '',
    diet: '',
  })
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
    cognitive: 0,
    emotional: 0,
    somatic: 0,
    behavioral: 0,
    overload: 0,
  })
  const [biometric, setBiometric] = useState<BiometricData>({
    heartRate: 0,
    bloodPressure: '0/0',
    respiratoryRate: 0,
    skinConductance: 0,
    microExpression: 0,
    skinPallor: 0,
    pupilDilation: 0,
  })
  const [chat, setChat] = useState<ChatData>({
    messages: [],
    sentiment: null,
  })
  const [rorschach, setRorschach] = useState<RorschachData>({
    responses: [],
    patterns: [],
  })
  const [results, setResults] = useState<AssessmentResults | null>(null)

  const phases: Phase[] = ['baseline', 'questionnaire', 'biometric', 'chat', 'rorschach', 'results']
  const currentPhaseIndex = phases.indexOf(currentPhase)
  const phaseProgress = ((currentPhaseIndex + 1) / phases.length) * 100

  const reset = () => {
    setCurrentPhase('baseline')
    setBaseline({ age: '', occupation: '', sleepHours: '', exerciseFrequency: '', diet: '' })
    setQuestionnaire({
      cognitive: 0,
      emotional: 0,
      somatic: 0,
      behavioral: 0,
      overload: 0,
    })
    setBiometric({
      heartRate: 0,
      bloodPressure: '0/0',
      respiratoryRate: 0,
      skinConductance: 0,
      microExpression: 0,
      skinPallor: 0,
      pupilDilation: 0,
    })
    setChat({ messages: [], sentiment: null })
    setRorschach({ responses: [], patterns: [] })
    setResults(null)
  }

  return (
    <AssessmentContext.Provider
      value={{
        currentPhase,
        setCurrentPhase,
        baseline,
        setBaseline,
        questionnaire,
        setQuestionnaire,
        biometric,
        setBiometric,
        chat,
        setChat,
        rorschach,
        setRorschach,
        results,
        setResults,
        reset,
        phaseProgress,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  )
}

export function useAssessment() {
  const context = useContext(AssessmentContext)
  if (!context) {
    throw new Error('useAssessment must be used within AssessmentProvider')
  }
  return context
}
