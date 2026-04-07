# CogniSense AI

Aplikasi web assessment psikologis berbasis Next.js untuk alur analisis multi-fase.

## Fitur Utama

- Alur assessment bertahap: baseline, questionnaire, biometric, chat, rorschach, dan hasil.
- Dukungan multi-bahasa melalui context provider.
- Komponen UI modular berbasis React + Tailwind.
- Validasi form dengan Zod dan React Hook Form.
- Ekspor laporan PDF.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- Zod

## Menjalankan Project

### 1. Install dependency

Gunakan salah satu package manager:

```bash
pnpm install
```

atau

```bash
npm install
```

### 2. Jalankan mode development

```bash
pnpm dev
```

Aplikasi akan tersedia di `http://localhost:3000`.

### 3. Build production

```bash
pnpm build
```

### 4. Jalankan production server

```bash
pnpm start
```

## Struktur Direktori (Ringkas)

- `app/` : routing, pages, server actions, dan context.
- `components/assessment/` : komponen utama alur assessment per fase.
- `components/ui/` : kumpulan komponen UI reusable.
- `lib/` : utilitas, integrasi biometric, dan generator report.
- `validation/` : skema validasi input.
- `types/` : deklarasi tipe tambahan.

## Script Tersedia

- `dev` : menjalankan server development.
- `build` : build aplikasi.
- `start` : menjalankan hasil build.
- `lint` : menjalankan linter.

## Catatan

- Pastikan environment variable lokal sudah disiapkan bila diperlukan.
- Folder build (`.next`) dan dependency (`node_modules`) diabaikan oleh git.
