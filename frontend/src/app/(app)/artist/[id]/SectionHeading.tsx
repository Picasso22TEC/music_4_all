// ─── Section heading — título + subtítulo temático (tienda de discos neón) ─────
//
// Encabezado compartido por las secciones de la página de artista (Popular,
// Albums, Singles & EPs, Compilations, Fans also like). Un marcador neón teal
// hace de gutter y ancla título + subtítulo; el subtítulo aporta el tono de
// "tienda de discos" (heavy rotation, LPs, 45s, crate digging) sin perder el
// significado, que sigue en el <h2>.
//
// Ambos textos usan text-secondary (≥ 4.5:1 sobre surface-void → AA). La
// jerarquía la da la tipografía: mono/uppercase/bold vs sans/sentence-case.

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-0.5 h-3.5 w-[3px] shrink-0 rounded-full bg-teal-400 shadow-glow-active"
      />
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-secondary">
          {title}
        </h2>
        <p className="font-sans text-2xs text-secondary">{subtitle}</p>
      </div>
    </div>
  )
}
