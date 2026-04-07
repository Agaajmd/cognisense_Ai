import { z } from 'zod'

export const baselineSchema = z.object({
  age: z.coerce.number().int().min(18, 'Usia minimal 18 tahun').max(120, 'Usia maksimal 120 tahun'),
  occupation: z
    .string()
    .trim()
    .min(2, 'Pekerjaan minimal 2 karakter')
    .max(80, 'Pekerjaan maksimal 80 karakter')
    .regex(/^[A-Za-z0-9 .,&()\/-]+$/, 'Gunakan huruf, angka, spasi, dan simbol umum (.,&()/-)'),
  sleepHours: z.coerce.number().min(2, 'Jam tidur minimal 2 jam').max(14, 'Jam tidur maksimal 14 jam'),
  exerciseFrequency: z.enum(['none', 'rare', 'moderate', 'frequent']),
  diet: z.enum(['poor', 'fair', 'good', 'excellent']),
})

export const chatInputSchema = z
  .string()
  .trim()
  .min(3)
  .max(500)

export const projectiveResponseSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
