export function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600 text-lg">{subtitle}</p>
    </div>
  )
}
