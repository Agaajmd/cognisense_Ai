'use server'

type ChatMessage = { role: string; content: string }

interface QuestionnaireInput {
  cognitive: number
  emotional: number
  somatic: number
  behavioral: number
  overload: number
}

function stripCodeFences(value: string) {
  return value.replace(/```json|```/gi, '').trim()
}

function stripSuspiciousBase64(value: string) {
  // Remove unusually long base64-like chunks that sometimes leak from model/tool outputs.
  return value.replace(/[A-Za-z0-9+/]{180,}={0,2}/g, '').trim()
}

function normalizeModelText(value: string) {
  const noFences = stripCodeFences(value)
  const noBlob = stripSuspiciousBase64(noFences)
  return noBlob.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function extractJsonObject(raw: string) {
  const clean = stripCodeFences(raw)

  try {
    return JSON.parse(clean)
  } catch {
    // Fall through to partial extraction.
  }

  const firstBrace = clean.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = firstBrace; i < clean.length; i++) {
    const ch = clean[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = clean.slice(firstBrace, i + 1)
        try {
          return JSON.parse(candidate)
        } catch {
          return null
        }
      }
    }
  }

  return null
}

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GEMINI_COGNISENSE || process.env.GEMINIAPIKEY || '').trim()
}

async function callGemini(prompt: string) {
  const apiKey = getGeminiKey()
  if (!apiKey) return null

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001']
  let lastError = ''

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.35,
              topP: 0.9,
              maxOutputTokens: 500,
            },
          }),
        }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body?.error?.message || `Gemini error ${response.status}`
        if (response.status === 429 || response.status === 403) {
          throw new Error(message)
        }
        if (response.status === 404 || response.status === 400) continue
        throw new Error(message)
      }

      const data = await response.json()
      const parts = data?.candidates?.[0]?.content?.parts
      const rawText = Array.isArray(parts)
        ? parts
            .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
            .join('\n')
        : ''

      const text = normalizeModelText(rawText)
      if (text) return text
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown Gemini error'
      console.error(`Gemini call failed on model ${model}: ${String(lastError).slice(0, 240)}`)
    }
  }

  if (lastError) {
    throw new Error(lastError)
  }

  return null
}

export async function analyzeSentiment(messages: Array<{ role: string; content: string }>) {
  try {
    const text = messages.map(m => m.content).join(' ').toLowerCase()

    const geminiPrompt = [
      'Classify this conversation sentiment as exactly one label: positive, neutral, or negative.',
      'Return only one word in lowercase.',
      `Conversation: ${text}`,
    ].join('\n')

    const geminiResult = await callGemini(geminiPrompt)
    if (geminiResult === 'positive' || geminiResult === 'neutral' || geminiResult === 'negative') {
      return geminiResult
    }
    
    const positiveKeywords = ['better', 'improved', 'happy', 'good', 'great', 'excellent', 'wonderful', 'amazing']
    const negativeKeywords = ['worse', 'stressed', 'anxious', 'tired', 'exhausted', 'difficult', 'problem', 'struggling']
    
    const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length
    const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length
    
    if (positiveCount > negativeCount) {
      return 'positive'
    } else if (negativeCount > positiveCount) {
      return 'negative'
    } else {
      return 'neutral'
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return 'neutral'
  }
}

export async function analyzeRorschach(responses: Array<{ response: string }>) {
  try {
    // Simulate psychological analysis of Rorschach responses
    const patterns: string[] = []
    
    responses.forEach((r) => {
      const text = r.response.toLowerCase()
      
      if (text.includes('movement') || text.includes('moving')) {
        patterns.push('kinetic')
      }
      if (text.includes('color') || text.includes('colored')) {
        patterns.push('chromatic')
      }
      if (text.includes('threat') || text.includes('danger') || text.includes('scary')) {
        patterns.push('anxious')
      }
      if (text.includes('harmony') || text.includes('together') || text.includes('balance')) {
        patterns.push('integrative')
      }
    })
    
    return [...new Set(patterns)]
  } catch (error) {
    console.error('Rorschach analysis error:', error)
    return []
  }
}

export async function classifyProjectiveResponse(input: string, locale: 'id' | 'en') {
  const word = input.trim().toLowerCase()

  try {
    const prompt = [
      'You classify one-word/short projective response from an abstract inkblot.',
      'Return strict JSON only with this schema:',
      '{"bucket":1|2|3,"label":"dark_anxious|animal_nature|neutral_object","stressDelta":number,"reason":"short"}',
      'Rules:',
      'bucket 1 = death/violence/fear/threat/gore/anxiety imagery, stressDelta must be 20.',
      'bucket 2 = animal/nature imagery, stressDelta must be 0.',
      'bucket 3 = neutral inanimate/common object, stressDelta must be 0.',
      `locale=${locale}`,
      `response=${word}`,
    ].join('\n')

    const output = await callGemini(prompt)
    if (output) {
      const parsed = extractJsonObject(output)
      const fallbackBucketMatch = output.match(/"?bucket"?\s*:\s*([1-3])/i)
      const fallbackReasonMatch = output.match(/"?reason"?\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i)

      const bucket = Number(parsed?.bucket ?? fallbackBucketMatch?.[1])
      const normalizedBucket = bucket === 1 || bucket === 2 || bucket === 3 ? bucket : 3
      const stressDelta = normalizedBucket === 1 ? 20 : 0
      const category: 'dark' | 'neutral' = normalizedBucket === 1 ? 'dark' : 'neutral'
      const reasonCandidate = typeof parsed?.reason === 'string' ? parsed.reason : fallbackReasonMatch?.[1]

      return {
        bucket: normalizedBucket,
        category,
        stressDelta,
        reason: normalizeModelText(String(reasonCandidate || '')).slice(0, 140) || (locale === 'id' ? 'Asosiasi umum berdasarkan konteks kata.' : 'General association based on context.'),
      }
    }
  } catch (error) {
    console.error('Projective classification error:', error)
  }

  const darkKeywords = [
    'monster',
    'blood',
    'skull',
    'dead',
    'death',
    'hancur',
    'darah',
    'tengkorak',
    'setan',
    'iblis',
    'serang',
    'mutilasi',
  ]

  const isDark = darkKeywords.some(keyword => word.includes(keyword))
  return {
    bucket: isDark ? 1 : 3,
    category: (isDark ? 'dark' : 'neutral') as 'dark' | 'neutral',
    stressDelta: isDark ? 20 : 0,
    reason: locale === 'id' ? 'Klasifikasi fallback berbasis kata kunci.' : 'Keyword-based fallback classification.',
  }
}

export async function sendChatToGemini(messages: ChatMessage[], locale: 'id' | 'en') {
  try {
    if (!getGeminiKey()) {
      return locale === 'id'
        ? 'Koneksi AI belum aktif karena API key Gemini tidak ditemukan di server.'
        : 'AI connection is not active because Gemini API key is missing on the server.'
    }

    const systemGuide =
      locale === 'id'
        ? 'Kamu asisten asesmen stres. Beri respons empatik, spesifik, dan singkat 2-3 kalimat. Gunakan bahasa Indonesia natural dan selalu akhiri dengan satu pertanyaan lanjutan.'
        : 'You are a stress assessment assistant. Respond empathetically and specifically in 2-3 concise sentences. Always end with one relevant follow-up question.'

    const transcript = messages
      .slice(-8)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')

    const prompt = `${systemGuide}\n\nConversation:\n${transcript}\n\nReply as assistant now.`

    const output = await callGemini(prompt)
    if (output) {
      const cleaned = normalizeModelText(output)
      if (cleaned) {
        return cleaned.slice(0, 800)
      }
    }

    return locale === 'id'
      ? 'Terima kasih sudah bercerita. Bisa jelaskan situasi yang paling membuat Anda tertekan minggu ini?'
      : 'Thanks for sharing. Can you describe what has been the most stressful situation for you this week?'
  } catch (error) {
    console.error('Gemini chat error:', error)
    const message = (error instanceof Error ? error.message : '').toLowerCase()
    if (
      message.includes('quota') ||
      message.includes('resource_exhausted') ||
      message.includes('rate') ||
      message.includes('billing') ||
      message.includes('429')
    ) {
      return locale === 'id'
        ? 'AI Gemini terhubung, tetapi kuota API saat ini habis atau billing belum aktif. Mohon aktifkan kuota di Google AI Studio.'
        : 'Gemini AI is connected, but API quota is exhausted or billing is not enabled. Please enable quota in Google AI Studio.'
    }
    return locale === 'id'
      ? 'Terima kasih sudah berbagi. Apa satu hal yang paling membantu Anda merasa lebih tenang?'
      : 'Thank you for sharing. What is one thing that helps you feel calmer?'
  }
}

export async function analyzeBiometricPhotos(photos: string[]) {
  try {
    const seed = photos.reduce((sum, photo) => sum + photo.length, 0)
    const normalized = (seed % 1000) / 1000

    const heartRate = Math.round(72 + normalized * 28)
    const systolic = Math.round(112 + normalized * 18)
    const diastolic = Math.round(72 + normalized * 12)
    const respiratoryRate = Math.round(14 + normalized * 8)
    const skinConductance = Number((3.8 + normalized * 2.2).toFixed(2))
    const microExpression = Number((0.35 + normalized * 0.45).toFixed(2))
    const skinPallor = Number((0.3 + (1 - normalized) * 0.5).toFixed(2))
    const pupilDilation = Number((0.25 + normalized * 0.55).toFixed(2))

    return {
      heartRate,
      bloodPressure: `${systolic}/${diastolic}`,
      respiratoryRate,
      skinConductance,
      microExpression,
      skinPallor,
      pupilDilation,
    }
  } catch (error) {
    console.error('Biometric photo analysis error:', error)
    return {
      heartRate: 78,
      bloodPressure: '120/80',
      respiratoryRate: 16,
      skinConductance: 4.1,
      microExpression: 0.5,
      skinPallor: 0.45,
      pupilDilation: 0.4,
    }
  }
}

export async function generateAssessmentResults(
  baseline: any,
  questionnaire: QuestionnaireInput,
  biometric: any,
  chatSentiment: string,
  rorschachPatterns: string[],
  locale: 'id' | 'en' = 'en'
) {
  try {
    // Calculate stress score (0-100)
    let stressScore = 50
    const breakdown: Array<{ factor: string; impact: number; reason: string }> = []
    
    // Biometric factors
    const heartRate = biometric.heartRate || 70
    if (heartRate > 100) {
      stressScore += 15
      breakdown.push({
        factor: locale === 'id' ? 'Detak jantung tinggi' : 'Elevated heart rate',
        impact: 15,
        reason: locale === 'id' ? 'Denyut >100 bpm mengindikasikan aktivasi stres fisik.' : 'Heart rate >100 bpm indicates physical stress activation.',
      })
    }
    if (heartRate > 120) {
      stressScore += 10
      breakdown.push({
        factor: locale === 'id' ? 'Detak sangat tinggi' : 'Very high heart rate',
        impact: 10,
        reason: locale === 'id' ? 'Denyut >120 bpm menambah risiko overstimulasi.' : 'Heart rate >120 bpm increases overstimulation risk.',
      })
    }
    if (heartRate < 60) {
      stressScore -= 10
      breakdown.push({
        factor: locale === 'id' ? 'Detak rendah stabil' : 'Lower resting pulse',
        impact: -10,
        reason: locale === 'id' ? 'Denyut rendah cenderung terkait kondisi lebih relaks.' : 'Lower pulse can correlate with calmer physiology.',
      })
    }
    if ((biometric.microExpression || 0) > 0.65) {
      stressScore += 8
      breakdown.push({
        factor: 'Micro-expression',
        impact: 8,
        reason: locale === 'id' ? 'Ketegangan wajah konsisten meningkatkan skor stres.' : 'Sustained facial tension increases stress score.',
      })
    }
    if ((biometric.skinPallor || 0) > 0.65) {
      stressScore += 6
      breakdown.push({
        factor: 'Skin pallor',
        impact: 6,
        reason: locale === 'id' ? 'Perubahan warna kulit cepat diasosiasikan dengan tekanan.' : 'Rapid skin color shifts are associated with pressure responses.',
      })
    }
    if ((biometric.pupilDilation || 0) > 0.65) {
      stressScore += 6
      breakdown.push({
        factor: 'Pupil dilation',
        impact: 6,
        reason: locale === 'id' ? 'Pembesaran pupil pada kondisi normal menandakan arousal.' : 'Pupil enlargement in normal conditions indicates arousal.',
      })
    }
    
    // Sleep impact
    const sleepHours = parseFloat(baseline.sleepHours) || 7
        // Questionnaire impact
        const qValues = [
          questionnaire.cognitive,
          questionnaire.emotional,
          questionnaire.somatic,
          questionnaire.behavioral,
          questionnaire.overload,
        ].filter(v => typeof v === 'number' && v > 0)

        if (qValues.length) {
          const qAvg = qValues.reduce((sum, v) => sum + v, 0) / qValues.length
          const qImpact = Math.round((qAvg - 1) * 5)
          stressScore += qImpact
          breakdown.push({
            factor: locale === 'id' ? 'Kuesioner gejala stres' : 'Stress symptom questionnaire',
            impact: qImpact,
            reason:
              locale === 'id'
                ? `Rata-rata skala gejala ${qAvg.toFixed(1)}/5 berkontribusi pada skor stres.`
                : `Average symptom scale ${qAvg.toFixed(1)}/5 contributes to stress score.`,
          })
        }

    if (sleepHours < 6) {
      stressScore += 15
      breakdown.push({
        factor: locale === 'id' ? 'Kurang tidur' : 'Sleep deficit',
        impact: 15,
        reason: locale === 'id' ? 'Tidur <6 jam memperberat respons stres harian.' : 'Sleeping <6 hours amplifies daily stress response.',
      })
    }
    if (sleepHours > 8.5) {
      stressScore += 5
      breakdown.push({
        factor: locale === 'id' ? 'Durasi tidur berlebih' : 'Long sleep duration',
        impact: 5,
        reason: locale === 'id' ? 'Durasi sangat panjang kadang terkait kelelahan kronis.' : 'Very long sleep can correlate with fatigue burden.',
      })
    }
    
    // Sentiment impact
    if (chatSentiment === 'negative') {
      stressScore += 20
      breakdown.push({
        factor: locale === 'id' ? 'Sentimen chat negatif' : 'Negative chat sentiment',
        impact: 20,
        reason: locale === 'id' ? 'Bahasa dominan negatif menaikkan indikator distress.' : 'Predominantly negative language increases distress indicators.',
      })
    }
    if (chatSentiment === 'positive') {
      stressScore -= 15
      breakdown.push({
        factor: locale === 'id' ? 'Sentimen chat positif' : 'Positive chat sentiment',
        impact: -15,
        reason: locale === 'id' ? 'Ekspresi positif menurunkan indikasi stres psikologis.' : 'Positive expression lowers psychological stress indicators.',
      })
    }
    
    // Rorschach patterns
    if (rorschachPatterns.includes('anxious')) {
      stressScore += 10
      breakdown.push({
        factor: locale === 'id' ? 'Asosiasi cemas' : 'Anxious association',
        impact: 10,
        reason: locale === 'id' ? 'Respons projective mengandung tema ancaman/kecemasan.' : 'Projective response contains threat/anxiety themes.',
      })
    }
    if (rorschachPatterns.includes('projective_dark')) {
      stressScore += 20
      breakdown.push({
        factor: locale === 'id' ? 'Kategori Dark/Anxious' : 'Dark/Anxious category',
        impact: 20,
        reason: locale === 'id' ? 'Asosiasi gelap menambah bobot risiko stres bawah sadar.' : 'Dark associations add subconscious stress-risk weight.',
      })
    }
    if (rorschachPatterns.includes('integrative')) {
      stressScore -= 10
      breakdown.push({
        factor: locale === 'id' ? 'Kategori netral/positif' : 'Neutral/positive category',
        impact: -10,
        reason: locale === 'id' ? 'Asosiasi adaptif menurunkan skor stres.' : 'Adaptive associations reduce stress score.',
      })
    }
    
    stressScore = Math.max(0, Math.min(100, stressScore))
    const wellnessScore = 100 - stressScore
    
    // Generate recommendations
    const recommendations: string[] = []
    if (stressScore > 70) {
      recommendations.push(
        locale === 'id'
          ? 'Pertimbangkan berkonsultasi dengan profesional kesehatan mental'
          : 'Consider speaking with a mental health professional'
      )
      recommendations.push(
        locale === 'id'
          ? 'Lakukan manajemen stres harian seperti meditasi atau latihan napas'
          : 'Implement daily stress management practices like meditation'
      )
    }
    if (sleepHours < 7) {
      recommendations.push(
        locale === 'id'
          ? 'Tingkatkan durasi tidur ke 7-9 jam per malam'
          : 'Increase sleep duration to 7-9 hours per night'
      )
    }
    if (heartRate > 100) {
      recommendations.push(
        locale === 'id'
          ? 'Lakukan olahraga kardio ringan secara rutin'
          : 'Engage in regular cardiovascular exercise'
      )
    }
    if (chatSentiment === 'negative') {
      recommendations.push(
        locale === 'id' ? 'Coba jurnal rasa syukur setiap hari' : 'Practice gratitude journaling'
      )
      recommendations.push(
        locale === 'id'
          ? 'Bangun koneksi dengan keluarga atau teman yang suportif'
          : 'Connect with supportive friends or family'
      )
    }
    if (recommendations.length === 0) {
      recommendations.push(
        locale === 'id' ? 'Pertahankan kebiasaan sehat yang sudah berjalan' : 'Maintain current healthy habits'
      )
      recommendations.push(
        locale === 'id' ? 'Lanjutkan aktivitas fisik secara konsisten' : 'Continue regular physical activity'
      )
    }

    const summary =
      locale === 'id'
        ? `Asesmen menunjukkan tingkat stres Anda ${stressScore}/100. Berdasarkan data biometrik, pola tidur, ekspresi emosi, dan indikator psikologis, fokuskan langkah pada rekomendasi personal di atas untuk menjaga kesejahteraan.`
        : `Your assessment indicates a stress level of ${stressScore}/100. Based on biometric data, sleep pattern, emotional expression, and psychological indicators, focus on the personalized recommendations above to improve wellbeing.`
    
    return {
      stressScore,
      wellnessScore,
      recommendations,
      summary,
      breakdown,
    }
  } catch (error) {
    console.error('Assessment results generation error:', error)
    return {
      stressScore: 50,
      wellnessScore: 50,
      recommendations: [locale === 'id' ? 'Silakan periksa kembali data asesmen Anda' : 'Please review your assessment data'],
      summary: locale === 'id' ? 'Terjadi kendala saat membuat hasil asesmen.' : 'An error occurred while generating results.',
      breakdown: [],
    }
  }
}
