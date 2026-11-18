// Логотип «Дедлайн»: свой знак — контурный конверт с закладкой-дедлайном, цвет акцента #9154EB.
// Логотипы университетов не используются.

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Логотип «Дедлайн»"
      focusable="false"
      fill="none"
    >
      {/* конверт */}
      <rect
        x="3.6"
        y="7.6"
        width="24.8"
        height="18.4"
        rx="3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5.2 9.6 16 18l10.8-8.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* закладка-дедлайн */}
      <path d="M19.4 2.8h7.2v7.2l-3.6-2.6-3.6 2.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withSubtitle?: boolean;
  className?: string;
}

const SIZES = {
  sm: { mark: 22, title: 'text-sm' },
  md: { mark: 28, title: 'text-lg' },
  lg: { mark: 40, title: 'text-2xl' },
} as const;

/** Знак цветом акцента, рядом слово «Дедлайн». Подпись — тихой сноской. */
export function Logo({ size = 'md', withSubtitle = false, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={s.mark} className="text-brand" />
      <span className="flex flex-col leading-none">
        <span className={`font-semibold tracking-[-0.02em] text-ink ${s.title}`}>Дедлайн</span>
        {withSubtitle && <span className="mt-1 text-[11px] text-quiet">цифровой деканат 2030</span>}
      </span>
    </span>
  );
}
