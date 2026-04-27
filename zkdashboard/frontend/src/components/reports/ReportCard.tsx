import Link from 'next/link';

export function ReportCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="card block rounded-xl p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <span className="mt-1 text-lg" style={{ color: 'var(--brand-text)' }}>→</span>
      </div>
    </Link>
  );
}
