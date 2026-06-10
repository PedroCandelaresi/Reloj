export function ExportButtons({ excelHref }: { excelHref: string }) {
  return (
    <details className="shrink-0 text-right">
      <summary className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--brand-text)' }}>
        Exportar
      </summary>
      <a
        href={excelHref}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        <ExcelIcon /> Exportar Excel
      </a>
    </details>
  );
}

function ExcelIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 12l3 4m0-4l-3 4m6-4h2m-2 4h2" />
    </svg>
  );
}
