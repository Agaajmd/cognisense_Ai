'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type Locale = 'id' | 'en'

const messages = {
  id: {
    common: {
      loading: 'Memuat...',
      continue: 'Lanjut',
      back: 'Kembali',
      send: 'Kirim',
      analyzing: 'Menganalisis...',
      complete: 'Selesai',
    },
    header: {
      subtitle: 'Asesmen Stres',
      complete: 'Selesai',
      switch: 'EN',
      langLabel: 'Bahasa',
      phases: {
        baseline: 'Profil',
        questionnaire: 'Kuesioner',
        biometric: 'Biometrik',
        chat: 'Chat',
        rorschach: 'Rorschach',
        results: 'Hasil',
      },
    },
    phase1: {
      title: 'Profil Dasar',
      subtitle: 'Isi data singkat agar hasil lebih akurat',
      age: 'Usia',
      agePlaceholder: 'Masukkan usia Anda',
      occupation: 'Pekerjaan',
      occupationPlaceholder: 'Contoh: Software Engineer',
      sleepHours: 'Jam Tidur per Malam',
      sleepHoursPlaceholder: 'Contoh: 7.5',
      exercise: 'Frekuensi Olahraga',
      exercisePlaceholder: 'Pilih frekuensi',
      diet: 'Kualitas Pola Makan',
      dietPlaceholder: 'Pilih kualitas',
      next: 'Lanjut ke Kuesioner Stres',
      options: {
        never: 'Tidak pernah',
        rare: '1-2 kali per minggu',
        moderate: '3-4 kali per minggu',
        frequent: '5+ kali per minggu',
        poor: 'Kurang baik',
        fair: 'Cukup',
        good: 'Baik',
        excellent: 'Sangat baik',
      },
    },
    phase2: {
      title: 'Fase 3: Biometrik Wajah',
      subtitle: 'Gunakan kamera depan. Aplikasi mengambil 3 foto live.',
      grantCamera: 'Aktifkan Kamera',
      retake: 'Ambil Ulang 3 Foto',
      scanning: 'Pemindaian berlangsung',
      idle: 'Siap memindai',
      step1: 'Foto 1 diambil',
      step2: 'Foto 2 diambil',
      step3: 'Foto 3 diambil',
      waiting: 'Tarik napas pelan, foto berikutnya dalam {seconds} detik...',
      permissionError: 'Izin kamera ditolak. Aktifkan izin kamera browser untuk melanjutkan.',
      readyHint: 'Posisikan wajah di dalam oval. Pastikan cahaya cukup dan wajah terlihat jelas.',
      sendServer: '3 foto diproses dengan MediaPipe untuk landmark wajah, lalu dianalisis untuk micro-expression, skin pallor, dan pupil.',
      next: 'Lanjut ke Chat Asesmen',
      analysisTitle: 'Ringkasan Analisis Wajah',
      metrics: {
        heartRate: 'Estimasi denyut',
        bloodPressure: 'Estimasi tekanan darah',
        respiratoryRate: 'Estimasi napas',
        skinConductance: 'Estimasi respons kulit',
        microExpression: 'Micro-expression delta',
        skinPallor: 'Perubahan warna kulit',
        pupilDilation: 'Aktivasi pupil',
      },
    },
    phase3: {
      title: 'Chat Asesmen',
      subtitle: 'Jawab dengan jujur. Asisten akan menanyakan lanjutan secara alami.',
      startPrompt: 'Mulai dari sini: ceritakan kondisi Anda hari ini.',
      inputPlaceholder: 'Tulis jawaban Anda...',
      next: 'Lanjut ke Rorschach',
      aiThinking: 'AI sedang menulis...',
    },
    phase4: {
      title: 'Fase 4: AI Projective Test',
      subtitle: 'Jawab 3 kartu Rorschach: 2 wajib, kartu ke-3 opsional bisa dilewati.',
      instruction: 'Apa satu kata atau benda pertama yang terlintas di pikiranmu saat melihat gambar ini?',
      responseLabel: 'Jawaban pertama Anda',
      responsePlaceholder: 'Contoh: kupu-kupu, topeng, monster, darah',
      analyze: 'Analisis Jawaban',
      viewResults: 'Lihat Hasil Asesmen',
      nextCard: 'Lanjut Kartu Berikutnya',
      skipOptional: 'Lewati Kartu Opsional',
      cardLabel: 'Kartu {index} dari {total}',
      optionalTag: 'Opsional',
      generating: 'Membuat hasil...',
      reference: 'Sumber legal: Wikimedia Commons (Rorschach Plate I, public domain)',
      classificationTitle: 'Klasifikasi AI',
      category: 'Kategori',
      stressImpact: 'Dampak stres',
      rationale: 'Alasan',
      categories: {
        dark: 'Dark / Anxious',
        neutral: 'Neutral / Positive',
      },
    },
    phase5: {
      title: 'Hasil Asesmen Anda',
      subtitle: 'Ringkasan stres dan wellness dari seluruh fase',
      loading: 'Memuat hasil...',
      stressScore: 'Skor Stres',
      wellness: 'Wellness',
      summary: 'Ringkasan',
      recommendations: 'Rekomendasi Personal',
      newAssessment: 'Mulai Asesmen Baru',
      download: 'Unduh Laporan',
      footer: 'Hasil ini bersifat informatif, bukan diagnosis medis. Untuk dukungan profesional, konsultasikan dengan psikolog/tenaga kesehatan.',
      levels: {
        low: 'Stres Rendah',
        moderate: 'Stres Sedang',
        high: 'Stres Tinggi',
        goodWellness: 'Wellness Baik',
      },
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      continue: 'Continue',
      back: 'Back',
      send: 'Send',
      analyzing: 'Analyzing...',
      complete: 'Complete',
    },
    header: {
      subtitle: 'Stress Assessment',
      complete: 'Complete',
      switch: 'ID',
      langLabel: 'Language',
      phases: {
        baseline: 'Profile',
        questionnaire: 'Questionnaire',
        biometric: 'Biometric',
        chat: 'Chat',
        rorschach: 'Rorschach',
        results: 'Results',
      },
    },
    phase1: {
      title: 'Baseline Profile',
      subtitle: 'Fill this short form so your result is more accurate',
      age: 'Age',
      agePlaceholder: 'Enter your age',
      occupation: 'Occupation',
      occupationPlaceholder: 'Example: Software Engineer',
      sleepHours: 'Sleep Hours per Night',
      sleepHoursPlaceholder: 'Example: 7.5',
      exercise: 'Exercise Frequency',
      exercisePlaceholder: 'Select frequency',
      diet: 'Diet Quality',
      dietPlaceholder: 'Select quality',
      next: 'Continue to Stress Questionnaire',
      options: {
        never: 'Never',
        rare: '1-2 times per week',
        moderate: '3-4 times per week',
        frequent: '5+ times per week',
        poor: 'Poor',
        fair: 'Fair',
        good: 'Good',
        excellent: 'Excellent',
      },
    },
    phase2: {
      title: 'Phase 3: Facial Biometric Scan',
      subtitle: 'Use your front camera. The app captures 3 live photos.',
      grantCamera: 'Enable Camera',
      retake: 'Retake 3 Photos',
      scanning: 'Scanning in progress',
      idle: 'Ready to scan',
      step1: 'Photo 1 captured',
      step2: 'Photo 2 captured',
      step3: 'Photo 3 captured',
      waiting: 'Take a slow breath, next photo in {seconds} seconds...',
      permissionError: 'Camera permission was denied. Please allow camera access to continue.',
      readyHint: 'Center your face inside the oval. Use stable lighting for better analysis.',
      sendServer: 'All 3 photos are processed with MediaPipe facial landmarks, then analyzed for micro-expression, skin pallor, and pupil activity.',
      next: 'Continue to Chat Assessment',
      analysisTitle: 'Facial Analysis Summary',
      metrics: {
        heartRate: 'Estimated heart rate',
        bloodPressure: 'Estimated blood pressure',
        respiratoryRate: 'Estimated breathing rate',
        skinConductance: 'Estimated skin response',
        microExpression: 'Micro-expression delta',
        skinPallor: 'Skin color shift',
        pupilDilation: 'Pupil activation',
      },
    },
    phase3: {
      title: 'Assessment Chat',
      subtitle: 'Answer honestly. The assistant will ask natural follow-up questions.',
      startPrompt: 'Start here: tell me how you feel today.',
      inputPlaceholder: 'Type your response...',
      next: 'Continue to Rorschach',
      aiThinking: 'AI is writing...',
    },
    phase4: {
      title: 'Phase 4: AI Projective Test',
      subtitle: 'Complete 3 Rorschach cards: first 2 required, third card is optional and skippable.',
      instruction: 'What is the first word or object that comes to your mind when you see this image?',
      responseLabel: 'Your first response',
      responsePlaceholder: 'Example: butterfly, mask, monster, blood',
      analyze: 'Analyze Response',
      viewResults: 'View Assessment Result',
      nextCard: 'Continue to Next Card',
      skipOptional: 'Skip Optional Card',
      cardLabel: 'Card {index} of {total}',
      optionalTag: 'Optional',
      generating: 'Generating results...',
      reference: 'Legal source: Wikimedia Commons (Rorschach Plate I, public domain)',
      classificationTitle: 'AI Classification',
      category: 'Category',
      stressImpact: 'Stress impact',
      rationale: 'Reason',
      categories: {
        dark: 'Dark / Anxious',
        neutral: 'Neutral / Positive',
      },
    },
    phase5: {
      title: 'Your Assessment Results',
      subtitle: 'Stress and wellness summary across all phases',
      loading: 'Loading results...',
      stressScore: 'Stress Score',
      wellness: 'Wellness',
      summary: 'Summary',
      recommendations: 'Personalized Recommendations',
      newAssessment: 'Start New Assessment',
      download: 'Download Report',
      footer: 'This result is informative and not a medical diagnosis. For professional support, consult a licensed psychologist or health professional.',
      levels: {
        low: 'Low Stress',
        moderate: 'Moderate Stress',
        high: 'High Stress',
        goodWellness: 'Good Wellness',
      },
    },
  },
} as const

function getByPath(obj: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, obj)

  return typeof value === 'string' ? value : path
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  )
}

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (path: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('id')

  const value = useMemo<LanguageContextType>(() => {
    return {
      locale,
      setLocale,
      toggleLocale: () => setLocale(prev => (prev === 'id' ? 'en' : 'id')),
      t: (path, params) => interpolate(getByPath(messages[locale], path), params),
    }
  }, [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider')
  }
  return context
}
