interface BreakdownItem {
  factor: string
  impact: number
  reason: string
}

interface AssessmentReport {
  stressScore: number
  wellnessScore: number
  summary: string
  recommendations: string[]
  breakdown?: BreakdownItem[]
}

export async function downloadAssessmentPdf(results: AssessmentReport, locale: 'id' | 'en') {
  const { jsPDF } = await import('jspdf/dist/jspdf.umd.min.js')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  let y = 48

  const labels =
    locale === 'id'
      ? {
          title: 'Laporan Asesmen CogniSense',
          subtitle: 'Stress & Wellness Insight',
          stress: 'Skor Stres',
          wellness: 'Skor Wellness',
          summary: 'Ringkasan',
          breakdown: 'Rincian Faktor',
          recommendations: 'Rekomendasi',
          generated: 'Dibuat',
        }
      : {
          title: 'CogniSense Assessment Report',
          subtitle: 'Stress & Wellness Insight',
          stress: 'Stress Score',
          wellness: 'Wellness Score',
          summary: 'Summary',
          breakdown: 'Factor Breakdown',
          recommendations: 'Recommendations',
          generated: 'Generated',
        }

  pdf.setFillColor(236, 246, 255)
  pdf.roundedRect(32, 28, width - 64, 96, 12, 12, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(20, 50, 95)
  pdf.text(labels.title, 48, 60)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(70, 90, 120)
  pdf.text(labels.subtitle, 48, 82)
  pdf.text(`${labels.generated}: ${new Date().toLocaleString()}`, 48, 102)

  const drawBar = (x: number, yPos: number, value: number, color: [number, number, number]) => {
    const w = 220
    const h = 10
    const clamped = Math.max(0, Math.min(100, value))
    pdf.setFillColor(226, 232, 240)
    pdf.roundedRect(x, yPos, w, h, 5, 5, 'F')
    pdf.setFillColor(color[0], color[1], color[2])
    pdf.roundedRect(x, yPos, (w * clamped) / 100, h, 5, 5, 'F')
  }

  y = 152
  pdf.setFontSize(12)
  pdf.setTextColor(30, 40, 55)
  pdf.setFont('helvetica', 'bold')
  const stressPercent = Math.round(results.stressScore)
  const wellnessPercent = Math.round(results.wellnessScore)
  pdf.text(`${labels.stress}: ${stressPercent}%`, 48, y)
  pdf.text(`${labels.wellness}: ${wellnessPercent}%`, 300, y)
  drawBar(48, y + 8, stressPercent, [220, 38, 38])
  drawBar(300, y + 8, wellnessPercent, [22, 163, 74])

  y += 42
  pdf.setFont('helvetica', 'bold')
  pdf.text(labels.summary, 48, y)
  y += 16
  pdf.setFont('helvetica', 'normal')
  const summaryLines = pdf.splitTextToSize(results.summary, width - 96)
  pdf.text(summaryLines, 48, y)
  y += summaryLines.length * 14 + 16

  if (results.breakdown?.length) {
    pdf.setFont('helvetica', 'bold')
    pdf.text(labels.breakdown, 48, y)
    y += 14

    pdf.setFont('helvetica', 'normal')
    for (const item of results.breakdown) {
      const impact = item.impact > 0 ? `+${item.impact}` : `${item.impact}`
      const line = `${item.factor} (${impact}) - ${item.reason}`
      const lines = pdf.splitTextToSize(line, width - 96)
      pdf.text(lines, 52, y + 12)
      y += lines.length * 14 + 8
      if (y > 740) {
        pdf.addPage()
        y = 54
      }
    }
  }

  if (y > 700) {
    pdf.addPage()
    y = 54
  }

  pdf.setFont('helvetica', 'bold')
  pdf.text(labels.recommendations, 48, y)
  y += 14
  pdf.setFont('helvetica', 'normal')

  results.recommendations.forEach((recommendation, index) => {
    const lines = pdf.splitTextToSize(`${index + 1}. ${recommendation}`, width - 96)
    pdf.text(lines, 52, y + 12)
    y += lines.length * 14 + 6
    if (y > 740) {
      pdf.addPage()
      y = 54
    }
  })

  pdf.save('CogniSense_Assessment_Report.pdf')
}
