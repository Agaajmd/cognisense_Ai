'use client'

import { useState, useRef, useEffect } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { Input } from '@/components/ui/input'
import { analyzeSentiment, sendChatToGemini } from '@/app/actions/analysis'
import { chatInputSchema } from '@/lib/validation/assessment'
import { FormError } from '@/components/assessment/atoms/form-error'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'

export default function Phase3Chat() {
  const { chat, setChat, setCurrentPhase } = useAssessment()
  const { t, locale } = useI18n()
  const [messages, setMessages] = useState(chat.messages)
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    const parsed = chatInputSchema.safeParse(inputValue)
    if (!parsed.success) {
      setInputError(locale === 'id' ? 'Pesan minimal 3 karakter dan maksimal 500 karakter.' : 'Message must be 3-500 characters.')
      return
    }
    setInputError('')

    const userMessage = { role: 'user' as const, content: parsed.data }
    const chatForAI = [
      ...messages,
      userMessage,
    ]

    setMessages(chatForAI)
    setInputValue('')
    setAnalyzing(true)

    const assistantReply = await sendChatToGemini(chatForAI, locale)
    const newMessages = [...chatForAI, { role: 'assistant' as const, content: assistantReply }]
    setMessages(newMessages)

    let sentiment = chat.sentiment
    if (newMessages.length >= 6) {
      sentiment = await analyzeSentiment(newMessages)
    }

    setChat({ messages: newMessages, sentiment })
    setAnalyzing(false)
  }

  const handleNext = () => {
    setChat({ messages, sentiment: chat.sentiment })
    setCurrentPhase('rorschach')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
      <div className="w-full max-w-2xl fade-in flex flex-col h-screen md:h-auto">
        <div className="glassmorphism p-8 md:p-12 space-y-6 flex-1 flex flex-col">
          <SectionHeading title={t('phase3.title')} subtitle={t('phase3.subtitle')} />

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto max-h-96 bg-white/30 rounded-lg p-4"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>{t('phase3.startPrompt')}</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`smooth-transition max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {analyzing && <p className="text-center text-sm text-slate-500">{t('phase3.aiThinking')}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value)
                  if (inputError) setInputError('')
                }}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('phase3.inputPlaceholder')}
                disabled={analyzing}
                className="text-base"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || analyzing}
                className="smooth-transition px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-white rounded-lg font-semibold"
              >
                {analyzing ? t('common.analyzing') : t('common.send')}
              </button>
            </div>
            <FormError message={inputError} />

            {messages.length >= 4 && (
              <PrimaryButton
                onClick={handleNext}
                disabled={analyzing}
              >
                {t('phase3.next')}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
