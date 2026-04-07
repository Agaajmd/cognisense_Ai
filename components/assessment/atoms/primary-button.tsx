import React from 'react'

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function PrimaryButton({ children, className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`smooth-transition w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-white font-semibold py-3 rounded-lg ${className}`}
    >
      {children}
    </button>
  )
}
