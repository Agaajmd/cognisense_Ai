import React from 'react'

export function PhaseShell({ children, maxWidth = 'max-w-2xl' }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
      <div className={`w-full ${maxWidth} fade-in`}>
        <div className="glassmorphism p-8 md:p-12 space-y-8">{children}</div>
      </div>
    </div>
  )
}
