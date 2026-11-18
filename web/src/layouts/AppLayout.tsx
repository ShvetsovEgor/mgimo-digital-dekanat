import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  GraduationCap,
  Home,
  LogIn,
  UserRound,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Layout';
import { Logo } from '@/components/Logo';
import { LanguageMenu, ThemeMenu } from '@/components/ui/HeaderMenus';
import { DemoBar } from '@/components/DemoBar';
import { cx } from '@/lib/cx';
import { useMeta, useProfile, useRole, useUnreadCount } from '@/lib/queries';
import { useLogout } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: typeof Home;
  badge?: 'unread';
  /** Внешний переход (другая точка входа, вне кабинета). */
  href?: string;
  external?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { to: '/', label: 'Главная', short: 'Главная', icon: Home },
  { to: '/schedule', label: 'Расписание', short: 'Пары', icon: CalendarDays },
  { to: '/progress', label: 'Учёба', short: 'Учёба', icon: GraduationCap },
  { to: '/requests', label: 'Заявки', short: 'Заявки', icon: FileText },
  { to: '/notifications', label: 'Уведомления', short: 'Ещё', icon: Bell, badge: 'unread' },
];

const STAFF_NAV: NavItem[] = [
  { to: '/staff', label: 'Заявки', short: 'Заявки', icon: FileText },
  { to: '/staff?tab=messages', label: 'Вопросы', short: 'Вопросы', icon: Bell },
  { to: '/staff?tab=announce', label: 'Объявления', short: 'Объявл.', icon: CalendarDays },
];

const PAGE_TITLES: Record<string, { title: string; parent?: string; parentTo?: string }> = {
  '/': { title: 'Главная' },
  '/schedule': { title: 'Расписание' },
  '/progress': { title: 'Учёба' },
  '/scholarship': { title: 'Калькулятор стипендии', parent: 'Учёба', parentTo: '/progress' },
  '/requests': { title: 'Заявки' },
  '/requests/new': { title: 'Новая заявка', parent: 'Заявки', parentTo: '/requests' },
  '/notifications': { title: 'Уведомления' },
  '/profile': { title: 'Профиль' },
  '/staff': { title: 'Кабинет деканата' },
};

function pageTitle(pathname: string): { title: string; parent?: string; parentTo?: string } {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/requests\/\d+$/.test(pathname)) return { title: 'Заявка', parent: 'Заявки', parentTo: '/requests' };
  if (pathname.startsWith('/requests/')) return { title: 'Новая заявка', parent: 'Заявки', parentTo: '/requests' };
  if (pathname.startsWith('/staff')) return { title: 'Кабинет деканата' };
  return { title: 'Кабинет' };
}

function navPath(to: string): string {
  return to.split('?')[0] ?? to;
}

function isActivePath(pathname: string, to: string): boolean {
  const base = navPath(to);
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Оболочка кадра: узкая колонка, шапка на холсте, поле 24 px, нижняя навигация на 360 px. */
export function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const unread = useUnreadCount();
  const { isStaff } = useRole();
  const items = isStaff ? STAFF_NAV : STUDENT_NAV;
  const current = pageTitle(location.pathname);

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Перейти к содержимому
      </a>
      <Sidebar items={items} unread={unread} open={drawer} onClose={() => setDrawer(false)} pathname={location.pathname} />
      <div className="lg:pl-[208px]">
        <div className="mx-auto w-full max-w-[1180px] px-4 lg:px-6">
          <TopBar current={current} onMenu={() => setDrawer(true)} />
          <main id="main" className="pb-28 lg:pb-8">
            {children}
            <Outlet />
            <Footer />
            <DemoBar />
          </main>
        </div>
      </div>
      <BottomNav items={items} unread={unread} onMore={() => setDrawer(true)} />
    </div>
  );
}

function UnreadBadge() {
  const unread = useUnreadCount();
  if (unread <= 0) return null;
  return (
    <span className="nums absolute top-2 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-bold text-white">
      {unread > 9 ? '9+' : unread}
    </span>
  );
}

function TopBar({
  current,
  onMenu,
}: {
  current: { title: string; parent?: string; parentTo?: string };
  onMenu: () => void;
}) {
  const profile = useProfile();
  const data = profile.data?.profile;
  return (
    <header className="safe-top flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Открыть меню"
          className="grid size-11 cursor-pointer place-items-center rounded-[10px] text-muted hover:bg-surface-hover hover:text-ink lg:hidden"
        >
          <span className="flex flex-col gap-[3px]" aria-hidden="true">
            <span className="h-0.5 w-[18px] rounded-full bg-current" />
            <span className="h-0.5 w-[18px] rounded-full bg-current" />
            <span className="h-0.5 w-[18px] rounded-full bg-current" />
          </span>
        </button>
        <Link to="/" className="mr-1 lg:hidden" aria-label="Дедлайн — на главную">
          <Logo size="sm" />
        </Link>
        <nav aria-label="Хлебные крошки" className="hidden min-w-0 items-center gap-1.5 lg:flex">
          {current.parent && (
            <>
              <Link to={current.parentTo ?? '/'} className="text-[13px] text-muted hover:text-ink">
                {current.parent}
              </Link>
              <ChevronRight className="size-3.5 text-quiet" aria-hidden="true" />
            </>
          )}
          <h1 className="truncate text-sm font-semibold text-ink" aria-current="page">
            {current.title}
          </h1>
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <LanguageMenu />
        <ThemeMenu />
        <Link
          to="/notifications"
          className="relative hidden size-11 place-items-center rounded-[10px] text-ink hover:bg-surface-hover lg:grid"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          <UnreadBadge />
        </Link>
        <Link
          to="/profile"
          aria-label={data ? `Профиль: ${data.displayName}` : 'Профиль'}
          className="ml-1 grid size-8 place-items-center rounded-full"
        >
          <Avatar initials={data?.initials ?? '··'} size="sm" />
        </Link>
      </div>
    </header>
  );
}

interface SidebarProps {
  items: NavItem[];
  unread: number;
  open: boolean;
  onClose: () => void;
  pathname: string;
}

function Sidebar({ items, unread, open, onClose, pathname }: SidebarProps) {
  return (
    <>
      <div
        className={cx(
          'fixed inset-0 z-40 bg-[#1c1b23]/40 transition-opacity duration-200 lg:hidden dark:bg-black/60',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line bg-sidebar transition-transform duration-200 lg:w-[208px] lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Основная навигация"
      >
        <div className="flex items-center justify-between px-3 pt-4 pb-3">
          <Link to="/" onClick={onClose} aria-label="Дедлайн — на главную">
            <Logo size="md" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="grid size-11 cursor-pointer place-items-center rounded-[10px] text-muted hover:bg-surface-hover lg:hidden"
          >
            <X className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
          <nav aria-label="Разделы кабинета" className="flex flex-col gap-2">
            {items.map((item) => (
              <SideLink key={item.to} item={item} unread={unread} pathname={pathname} onNavigate={onClose} />
            ))}
          </nav>
          <div className="my-3 border-t border-line" role="separator" />
          <nav aria-label="Профиль" className="flex flex-col gap-2">
            <SideLink
              item={{ to: '/profile', label: 'Профиль', short: 'Профиль', icon: UserRound }}
              unread={0}
              pathname={pathname}
              onNavigate={onClose}
            />
            <SideLink
              item={{
                to: 'https://mgimo.ru/study/schedule/',
                href: 'https://mgimo.ru/study/schedule/',
                label: 'Сайт расписания',
                short: 'Расписание',
                icon: CalendarDays,
                external: true,
              }}
              unread={0}
              pathname={pathname}
              onNavigate={onClose}
            />
          </nav>
          <div className="mt-auto pt-6 pb-3">
            <UserCard />
          </div>
        </div>
      </aside>
    </>
  );
}

const SIDE_LINK_CLASS =
  'group flex min-h-11 items-center gap-3 rounded-[10px] px-2 text-sm transition-colors duration-150 hover:bg-surface-hover';

function SideLink(props: { item: NavItem; unread: number; pathname: string; onNavigate: () => void }) {
  const { item } = props;
  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={props.onNavigate} className={SIDE_LINK_CLASS}>
        <SideGlyph item={item} active={false} />
        <span className="flex-1 truncate font-medium text-ink">{item.label}</span>
        <ExternalLinkGlyph />
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      onClick={props.onNavigate}
      aria-current={isActivePath(props.pathname, item.to) ? 'page' : undefined}
      className={SIDE_LINK_CLASS}
    >
      {({ isActive }) => (
        <>
          <SideGlyph item={item} active={isActive} />
          <span className={cx('flex-1 truncate', isActive ? 'font-semibold text-brand' : 'font-medium text-ink')}>
            {item.label}
          </span>
          {item.badge === 'unread' && props.unread > 0 && (
            <span className="nums inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
              {props.unread > 9 ? '9+' : props.unread}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SideGlyph({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <item.icon
      className={cx('size-[18px] shrink-0', active ? 'text-brand' : 'text-muted group-hover:text-ink')}
      strokeWidth={1.75}
      aria-hidden="true"
    />
  );
}

/** Внешний переход: значок 14 px тихого цвета, текст остаётся в потоке (по документации). */
function ExternalLinkGlyph() {
  return (
    <svg className="size-3.5 shrink-0 text-quiet" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 3.5h-3v9h9v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 3.5h3v3M12.5 3.5 7.8 8.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserCard() {
  const profile = useProfile();
  const logout = useLogout();
  const toast = useToast();
  const data = profile.data?.profile;
  const navigate = useNavigate();
  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-1 py-1.5 text-left hover:bg-surface-hover"
      >
        <Avatar initials={data?.initials ?? '··'} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{data?.displayName ?? '…'}</span>
          <span className="block truncate text-[12px] text-muted">{data?.group ?? ''}</span>
        </span>
      </button>
      {/* Смена аккаунта только в этой вкладке: соседние вкладки остаются под своими студентами. */}
      <button
        type="button"
        onClick={async () => {
          await logout();
          toast.success('Вкладка вышла из аккаунта');
          navigate('/login', { replace: true });
        }}
        className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] px-1 text-[12px] font-medium text-muted hover:bg-surface-hover hover:text-ink"
      >
        <LogIn className="size-4" strokeWidth={1.75} aria-hidden="true" />
        Сменить аккаунт
      </button>
    </div>
  );
}

function BottomNav({ items, unread, onMore }: { items: NavItem[]; unread: number; onMore: () => void }) {
  const location = useLocation();
  return (
    <nav
      aria-label="Быстрая навигация"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden"
    >
      <ul className="flex items-stretch justify-around px-1">
        {items.map((item, index) => {
          const active = isActivePath(location.pathname, item.to);
          const isMore = item.badge === 'unread';
          const content = (
            <>
              <span className="relative">
                <item.icon
                  className={cx('size-[20px]', active ? 'text-brand' : 'text-muted')}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {isMore && unread > 0 && (
                  <span className="nums absolute -top-1.5 -right-2 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-1 text-[9px] leading-none font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className={cx('text-[11px]', active ? 'font-semibold text-brand' : 'font-medium text-muted')}>{item.short}</span>
            </>
          );
          if (isMore) {
            return (
              <li key={item.to + index} className="flex-1">
                <button
                  type="button"
                  onClick={onMore}
                  className="flex min-h-[54px] w-full cursor-pointer flex-col items-center justify-center gap-1"
                  aria-label={unread > 0 ? `Ещё: ${unread} новых` : 'Ещё'}
                >
                  {content}
                </button>
              </li>
            );
          }
          return (
            <li key={item.to + index} className="flex-1">
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-[54px] flex-col items-center justify-center gap-1"
              >
                {content}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Footer() {
  const meta = useMeta();
  const demoToken = meta.data?.demoDocument?.token;
  return (
    <footer className="mt-6 border-t border-line pt-3 text-[12px] text-quiet">
      <Link to={demoToken ? `/verify/${demoToken}` : '/verify'} className="text-brand hover:underline">
        Проверка подлинности документа
      </Link>
    </footer>
  );
}
