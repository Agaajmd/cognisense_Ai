'use client'

import { useEffect, useRef, useState } from 'react'
import { useAssessment } from '@/app/context/assessment-context'
import { useI18n } from '@/app/context/language-context'
import { analyzeBiometricPhotos } from '@/app/actions/analysis'
import { estimateBiometricFromPhotos } from '@/lib/biometric-mediapipe'
import { PrimaryButton } from '@/components/assessment/atoms/primary-button'
import { SectionHeading } from '@/components/assessment/atoms/section-heading'

function isLikelyMobileSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isWebkit = /WebKit/i.test(ua)
  const isCriOS = /CriOS/i.test(ua)
  const isFxiOS = /FxiOS/i.test(ua)
  return isIOS && isWebkit && !isCriOS && !isFxiOS
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => Promise<T>): Promise<T> {
  let done = false
  return Promise.race([
    promise.then(value => {
      done = true
      return value
    }),
    new Promise<T>((resolve) => {
      setTimeout(async () => {
        if (done) return
        resolve(await fallback())
      }, ms)
    }),
  ])
}

function getBiometricProcessErrorMessage(localeHint: string) {
  if (localeHint === 'id') {
    return 'Pemindaian wajah belum berhasil. Pastikan wajah terlihat jelas, lalu coba Ambil Ulang 3 Foto.'
  }
  return 'Facial scan could not be completed. Make sure your face is clearly visible, then try Retake 3 Photos.'
}

export default function Phase2Biometric() {
  const { biometric, setBiometric, setCurrentPhase } = useAssessment()
  const { t, locale } = useI18n()
  const [formData, setFormData] = useState(biometric)
  const [scanning, setScanning] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [scanStep, setScanStep] = useState(t('phase2.idle'))
  const [captures, setCaptures] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setScanStep(t('phase2.idle'))
  }, [t])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  const waitWithCountdown = async (seconds: number) => {
    for (let i = seconds; i > 0; i -= 1) {
      setCountdown(i)
      await sleep(1000)
    }
    setCountdown(0)
  }

  const waitForVideoReady = async () => {
    const video = videoRef.current
    if (!video) return false

    for (let i = 0; i < 25; i += 1) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        return true
      }
      await sleep(120)
    }

    return false
  }

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return ''

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }

  const captureFrameWithRetry = async () => {
    for (let i = 0; i < 5; i += 1) {
      const shot = captureFrame()
      if (shot) return shot
      await sleep(180)
    }
    return ''
  }

  const runCaptureSequence = async () => {
    try {
      setScanning(true)
      setAnalyzing(false)
      setPermissionError('')
      setCaptures([])

      const ready = await waitForVideoReady()
      if (!ready) {
        throw new Error('Camera stream is not ready')
      }

      await sleep(500)

      const shot1 = await captureFrameWithRetry()
      setScanStep(t('phase2.step1'))
      const batch1 = shot1 ? [shot1] : []
      setCaptures(batch1)

      await waitWithCountdown(2)
      const shot2 = await captureFrameWithRetry()
      setScanStep(t('phase2.step2'))
      const batch2 = shot2 ? [...batch1, shot2] : [...batch1]
      setCaptures(batch2)

      await waitWithCountdown(2)
      const shot3 = await captureFrameWithRetry()
      setScanStep(t('phase2.step3'))
      const batch3 = shot3 ? [...batch2, shot3] : [...batch2]
      setCaptures(batch3)

      if (!batch3.length) {
        throw new Error('No valid captures from camera stream')
      }

      const normalizedBatch = [...batch3]
      while (normalizedBatch.length < 3) {
        normalizedBatch.push(normalizedBatch[normalizedBatch.length - 1])
      }
      setCaptures(normalizedBatch)

      setAnalyzing(true)
      setScanStep(t('common.analyzing'))

      const analysis = await withTimeout(
        estimateBiometricFromPhotos(normalizedBatch).catch(() => analyzeBiometricPhotos(normalizedBatch)),
        8000,
        () => analyzeBiometricPhotos(normalizedBatch)
      )

      setFormData(analysis)
      setBiometric(analysis)
    } catch (error) {
      console.error('Biometric capture sequence failed:', error)
      setPermissionError(getBiometricProcessErrorMessage(locale))
      setScanStep(t('phase2.idle'))
    } finally {
      setAnalyzing(false)
      setScanning(false)
    }
  }

  const startCamera = async () => {
    try {
      setPermissionError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported')
      }

      streamRef.current?.getTracks().forEach(track => track.stop())

      const constraintQueue: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: 'user',
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ]

      let stream: MediaStream | null = null
      for (const constraints of constraintQueue) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch {
          // Try a less strict constraint for Safari/device compatibility.
        }
      }

      if (!stream) {
        throw new Error('Unable to initialize camera stream')
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        if (isLikelyMobileSafari()) {
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.setAttribute('muted', 'true')
          videoRef.current.setAttribute('autoplay', 'true')
        }
        await videoRef.current.play()
      }

      setCameraReady(true)
      setScanStep(t('phase2.idle'))
      await runCaptureSequence()
    } catch (error) {
      console.error('Camera permission error:', error)
      setPermissionError(t('phase2.permissionError'))
      setCameraReady(false)
    }
  }

  const handleRetake = async () => {
    await runCaptureSequence()
  }

  const handleNext = () => {
    setBiometric(formData)
    setCurrentPhase('chat')
  }

  const isComplete = captures.length === 3 && formData.heartRate > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
      <div className="w-full max-w-3xl fade-in">
        <div className="glassmorphism p-5 sm:p-6 md:p-10 space-y-6 md:space-y-8">
          <SectionHeading title={t('phase2.title')} subtitle={t('phase2.subtitle')} />

          <div className="space-y-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-sm">
              <video ref={videoRef} className="w-full aspect-[4/5] sm:aspect-video object-cover" muted playsInline autoPlay />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-56 sm:w-52 sm:h-72 md:w-64 md:h-80 border-[3px] border-white/85 rounded-[999px] shadow-[0_0_0_999px_rgba(15,23,42,0.25)]" />
              </div>

              {countdown > 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-white/20 border border-white/70 animate-pulse flex items-center justify-center text-white text-4xl font-bold">
                    {countdown}
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-700">{t('phase2.readyHint')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={startCamera}
                disabled={scanning || analyzing}
                className="smooth-transition w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
              >
                {scanning ? t('phase2.scanning') : t('phase2.grantCamera')}
              </button>

              <button
                onClick={handleRetake}
                disabled={!cameraReady || scanning || analyzing}
                className="smooth-transition w-full px-4 py-2.5 bg-secondary text-white rounded-lg hover:bg-secondary/90 disabled:opacity-60"
              >
                {t('phase2.retake')}
              </button>
            </div>

            {permissionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{permissionError}</div>
            )}

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">{scanStep}</p>
              <p className="text-sm text-slate-700">
                {countdown > 0
                  ? t('phase2.waiting', { seconds: countdown })
                  : scanning
                    ? t('phase2.scanning')
                    : t('phase2.idle')}
              </p>
              <p className="text-xs text-slate-600">{t('phase2.sendServer')}</p>
            </div>

            {captures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {captures.map((capture, idx) => (
                  <div key={`${idx}-${capture.length}`} className="space-y-1">
                    <img src={capture} alt={`capture-${idx + 1}`} className="rounded-lg border border-slate-300" />
                    <p className="text-xs text-center text-slate-600">{idx + 1}/3</p>
                  </div>
                ))}
              </div>
            )}

            {isComplete && (
              <div className="bg-white/60 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-900">{t('phase2.analysisTitle')}</p>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
                  <p>{t('phase2.metrics.heartRate')}: {formData.heartRate} bpm</p>
                  <p>{t('phase2.metrics.bloodPressure')}: {formData.bloodPressure}</p>
                  <p>{t('phase2.metrics.respiratoryRate')}: {formData.respiratoryRate} /min</p>
                  <p>{t('phase2.metrics.skinConductance')}: {formData.skinConductance}</p>
                  <p>{t('phase2.metrics.microExpression')}: {formData.microExpression}</p>
                  <p>{t('phase2.metrics.skinPallor')}: {formData.skinPallor}</p>
                  <p>{t('phase2.metrics.pupilDilation')}: {formData.pupilDilation}</p>
                </div>
              </div>
            )}

            {analyzing && (
              <div className="text-sm text-slate-700">{t('common.analyzing')}</div>
            )}

            <div>
              <PrimaryButton
                onClick={handleNext}
                disabled={!isComplete || scanning || analyzing}
              >
                {t('phase2.next')}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
