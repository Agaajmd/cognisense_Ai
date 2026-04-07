import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

interface FaceMetrics {
  browEyeRatio: number
  pupilRatio: number
  redness: number
}

export interface BiometricEstimate {
  heartRate: number
  bloodPressure: string
  respiratoryRate: number
  skinConductance: number
  microExpression: number
  skinPallor: number
  pupilDilation: number
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function avg(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]) {
  if (!values.length) return 0
  const mean = avg(values)
  const variance = avg(values.map(value => (value - mean) ** 2))
  return Math.sqrt(variance)
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function polygonArea(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

async function getFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      )

      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
      })
    })()
  }

  return landmarkerPromise
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

function collectFaceMetrics(
  image: HTMLImageElement,
  landmarks: Array<{ x: number; y: number; z: number }>
): FaceMetrics {
  const leftBrow = landmarks[70]
  const rightBrow = landmarks[300]
  const leftEyeTop = landmarks[159]
  const leftEyeBottom = landmarks[145]
  const rightEyeTop = landmarks[386]
  const rightEyeBottom = landmarks[374]
  const leftEyeOuter = landmarks[33]
  const leftEyeInner = landmarks[133]
  const rightEyeOuter = landmarks[362]
  const rightEyeInner = landmarks[263]

  const eyeWidth =
    (distance(leftEyeOuter, leftEyeInner) + distance(rightEyeOuter, rightEyeInner)) / 2 || 0.001
  const browEye =
    (distance(leftBrow, leftEyeTop) + distance(rightBrow, rightEyeTop) + distance(leftBrow, leftEyeBottom) + distance(rightBrow, rightEyeBottom)) /
      4 ||
    0.001
  const browEyeRatio = browEye / eyeWidth

  const leftIris = landmarks.slice(468, 473)
  const rightIris = landmarks.slice(473, 478)
  const irisArea = polygonArea(leftIris) + polygonArea(rightIris)
  const pupilRatio = irisArea / (eyeWidth * eyeWidth)

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      browEyeRatio,
      pupilRatio,
      redness: 0.33,
    }
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const faceXs = landmarks.map(point => point.x * canvas.width)
  const faceYs = landmarks.map(point => point.y * canvas.height)
  const minX = Math.max(0, Math.floor(Math.min(...faceXs)))
  const minY = Math.max(0, Math.floor(Math.min(...faceYs)))
  const maxX = Math.min(canvas.width, Math.ceil(Math.max(...faceXs)))
  const maxY = Math.min(canvas.height, Math.ceil(Math.max(...faceYs)))
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)

  const data = ctx.getImageData(minX, minY, width, height).data
  let totalRedness = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const brightness = (r + g + b) / 3
    if (brightness < 30 || brightness > 240) continue
    totalRedness += r / Math.max(1, g + b)
    count += 1
  }

  const redness = count > 0 ? totalRedness / count : 0.33

  return {
    browEyeRatio,
    pupilRatio,
    redness,
  }
}

export async function estimateBiometricFromPhotos(photos: string[]): Promise<BiometricEstimate> {
  if (photos.length < 3) {
    throw new Error('At least 3 photos are required')
  }

  const landmarker = await getFaceLandmarker()

  const frameMetrics: FaceMetrics[] = []

  for (const photo of photos.slice(0, 3)) {
    const image = await loadImage(photo)
    const result = landmarker.detect(image)
    const landmarks = result.faceLandmarks?.[0]

    if (!landmarks) continue
    frameMetrics.push(collectFaceMetrics(image, landmarks))
  }

  if (!frameMetrics.length) {
    return {
      heartRate: 76,
      bloodPressure: '118/78',
      respiratoryRate: 16,
      skinConductance: 4.2,
      microExpression: 0.5,
      skinPallor: 0.45,
      pupilDilation: 0.45,
    }
  }

  const browRatios = frameMetrics.map(frame => frame.browEyeRatio)
  const pupilRatios = frameMetrics.map(frame => frame.pupilRatio)
  const rednessValues = frameMetrics.map(frame => frame.redness)

  const browMean = avg(browRatios)
  const browConsistency = clamp(1 - stdDev(browRatios) * 25)
  const browFurrow = clamp((0.38 - browMean) * 6)
  const microExpression = clamp(browFurrow * 0.65 + browConsistency * 0.35)

  const rednessDelta = Math.max(...rednessValues) - Math.min(...rednessValues)
  const skinPallor = clamp(rednessDelta * 4.5)

  const pupilMean = avg(pupilRatios)
  const pupilVar = stdDev(pupilRatios)
  const pupilDilation = clamp((pupilMean - 0.035) * 18 + pupilVar * 12)

  const heartRate = Math.round(70 + microExpression * 20 + skinPallor * 8 + pupilDilation * 7)
  const systolic = Math.round(112 + microExpression * 14 + skinPallor * 10)
  const diastolic = Math.round(72 + microExpression * 9 + skinPallor * 6)
  const respiratoryRate = Math.round(14 + microExpression * 4 + pupilDilation * 3)
  const skinConductance = Number((3.6 + microExpression * 1.8 + skinPallor * 1.2).toFixed(2))

  return {
    heartRate,
    bloodPressure: `${systolic}/${diastolic}`,
    respiratoryRate,
    skinConductance,
    microExpression: Number(microExpression.toFixed(2)),
    skinPallor: Number(skinPallor.toFixed(2)),
    pupilDilation: Number(pupilDilation.toFixed(2)),
  }
}
