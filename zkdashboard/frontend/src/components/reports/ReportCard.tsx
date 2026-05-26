import Link from 'next/link';

export function ReportCard({
  href,
  title,
  description,
  priority = 'normal',
}: {
  href: string;
  title: string;
  description: string;
  priority?: 'primary' | 'normal' | 'secondary';
}) {
  const isPrimary = priority === 'primary';
  const isSecondary = priority === 'secondary';

  return (
    <Link
      href={href}
      className={`card block rounded-xl transition-colors hover:border-emerald-500 ${isPrimary ? 'p-5' : 'p-4'} ${isSecondary ? 'opacity-90' : ''}`}
      style={isPrimary ? { borderColor: 'rgba(31,199,119,0.45)' } : undefined}
    >
      <h2 className={`${isPrimary ? 'text-lg' : 'text-base'} font-semibold`} style={{ color: isPrimary ? 'var(--brand-text)' : 'var(--text-primary)' }}>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: isSecondary ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
        {description}
      </p>
    </Link>
  );
}
