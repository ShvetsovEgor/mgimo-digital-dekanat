// Логотип «Дедлайн»: свой знак — стилизованная «застёжка» между двумя линиями, цвет акцента.
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
      viewBox="0 0 28 28"
      className={className}
      role="img"
      aria-label="Логотип «Дедлайн»"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 4.5H21M7 23.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 4.5V7.5C9 9.5 10.4 11.3 12.3 12.4L14 13.4L15.7 12.4C17.6 11.3 19 9.5 19 7.5V4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 23.5V20.5C9 18.5 10.4 16.7 12.3 15.6L14 14.6L15.7 15.6C17.6 16.7 19 18.5 19 20.5V23.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.5 21.5H16.5L14 18.5L11.5 21.5Z" fill="currentColor" />
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
