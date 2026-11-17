// Логотип «Дедлайн»: конверт-цепочка в золотом круге + название.
// Собственный знак, логотип университета не используется.

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Логотип «Дедлайн»"
      focusable="false"
    >
      <defs>
        <linearGradient id="dl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9CD6E" />
          <stop offset="1" stopColor="#C9A227" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="#1D3A8A" />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="url(#dl-gold)" strokeWidth="2" />
      <rect x="14.5" y="18" width="19" height="13" rx="2.6" fill="none" stroke="#F6F5F1" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 19.2 24 26l9-6.8" fill="none" stroke="#F6F5F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="30.2" r="1.9" fill="url(#dl-gold)" />
    </svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withSubtitle?: boolean;
  className?: string;
}

const SIZES = {
  sm: { mark: 32, title: 'text-[16px]', sub: 'text-[10px]' },
  md: { mark: 40, title: 'text-[19px]', sub: 'text-[11px]' },
  lg: { mark: 52, title: 'text-[24px]', sub: 'text-[12px]' },
} as const;

export function Logo({ size = 'md', withSubtitle = true, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={s.mark} />
      <span className="flex flex-col leading-none">
        <span className={`font-extrabold tracking-tight text-ink ${s.title}`}>Дедлайн</span>
        {withSubtitle && (
          <span className={`mt-1 font-semibold uppercase tracking-[0.12em] text-muted ${s.sub}`}>цифровой деканат 2030</span>
        )}
      </span>
    </span>
  );
}
