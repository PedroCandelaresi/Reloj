type BrandLogoProps = {
  variant?: 'emerald' | 'steel';
  layout?: 'horizontal' | 'stacked' | 'wordmark';
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  variant = 'steel',
  layout = 'horizontal',
  className = '',
  iconClassName = '',
  wordmarkClassName = '',
}: BrandLogoProps) {
  const wordmark =
    variant === 'emerald'
      ? '/brand/conflunet-wordmark-emerald-tech.svg'
      : '/brand/conflunet-wordmark-brushed-steel.svg';
  const glow =
    variant === 'emerald'
      ? 'drop-shadow-[0_0_16px_rgba(35,255,153,0.28)]'
      : 'drop-shadow-[0_10px_18px_rgba(0,0,0,0.42)]';

  if (layout === 'wordmark') {
    return (
      <img
        src={wordmark}
        alt="CONFLUNET"
        className={`${glow} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${
        layout === 'stacked' ? 'flex-col gap-4' : 'gap-3'
      } ${glow} ${className}`}
    >
      <img
        src="/brand/conflunet-isotipo.svg"
        alt=""
        aria-hidden="true"
        className={layout === 'stacked' ? `w-28 ${iconClassName}` : `w-14 ${iconClassName}`}
      />
      <img
        src={wordmark}
        alt="CONFLUNET"
        className={layout === 'stacked' ? `w-72 max-w-full mx-auto ${wordmarkClassName}` : `w-52 max-w-[60vw] ${wordmarkClassName}`}
      />
    </div>
  );
}
