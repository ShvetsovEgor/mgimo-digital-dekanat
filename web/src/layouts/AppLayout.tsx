import { useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Avatar, SectionTitle } from '@/components/ui/Layout';
import { Logo } from '@/components/Logo';
import { DemoBar } from '@/components/DemoBar';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useLogout } from '@/lib/auth';
import { cx } from '@/lib/cx';
import { useProfile, useRole, useUnreadCount } from '@/lib/queries';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: typeof Home;
}

const STUDENT_NAV: NavItem[] = [
  { to: '/', label: 'Сегодня', short: 'Сегодня', icon: Home },
  { to: '/schedule', label: 'Расписание', short: 'Пары', icon: CalendarDays },
  { to: '/progress', label: 'Учёба', short: 'Учёба', icon: GraduationCap },
  { to: '/requests', label: 'Заявки', short: 'Заявки', icon: FileText },
  { to: '/notifications', label: 'Уведомления', short: 'Ещё', icon: Bell },
];

const STAFF_NAV: NavItem[] = [
  { to: '/staff', label: 'Заявки', short: 'Заявки', icon: FileText },
  { to: '/staff?tab=messages', label: 'Вопросы', short: 'Вопросы', icon: Bell },
  { to: '/staff?tab=announce', label: 'Объявления', short: 'Объявл.', icon: CalendarDays },
];

function isActivePath(pathname: string, to: string): boolean {
  const base = to.split('?')[0] ?? to;
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

function navPath(to: string): string {
  return to.split('?')[0] ?? to;
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const unread = useUnreadCount();
  const { isStaff } = useRole();
  const items = isStaff ? STAFF_NAV : STUDENT_NAV;

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Перейти к содержимому
      </a>
      <Sidebar items={items} unread={unread} open={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className="lg:pl-[264px]">
        <Header onMenu={() => setMobileMenu(true)} />
        <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pt-4 pb-6 sm:px-6 lg:px-8">
          {children}
          <Outlet />
          <Footer />
          <DemoBar />
        </main>
      </div>
      <BottomNav items={items} pathname={location.pathname} unread={unread} />
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const unread = useUnreadCount();
  const { isStaff } = useRole();
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Открыть меню"
          className="grid size-11 cursor-pointer place-items-center rounded-xl text-ink hover:bg-line/50 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Link to="/" className="lg:hidden" aria-label="Дедлайн — на главную">
          <Logo size="sm" withSubtitle={false} />
        </Link>
        <div className="hidden lg:block">
          <p className="text-sm font-semibold text-ink">{isStaff ? 'Кабинет сотрудника деканата' : 'Кабинет студента'}</p>
          <p className="text-xs text-muted">Цифровой деканат 2030 · концепт</p>
        </div>
        <NavLink
          to="/notifications"
          aria-label={unread > 0 ? `Уведомления: ${unread} новых` : 'Уведомления'}
          className="relative grid size-11 place-items-center rounded-xl text-ink transition-colors hover:bg-line/50"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="nums absolute top-1.5 right-1.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>
      </div>
    </header>
  );
}

interface SidebarProps {
  items: NavItem[];
  unread: number;
  open: boolean;
  onClose: () => void;
}

function Sidebar({ items, unread, open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={cx(
          'fixed inset-0 z-40 bg-[#0B1120]/50 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-line bg-surface transition-transform duration-200 lg:w-[264px] lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Основная навигация"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <Link to="/" onClick={onClose} aria-label="Дедлайн — на главную">
            <Logo size="md" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted hover:bg-line/50 lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
          <p className="px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Разделы</p>
          <nav aria-label="Разделы кабинета" className="flex flex-col gap-0.5">
            {items.map((item) => (
              <SideLink key={item.to} item={item} unread={unread} onNavigate={onClose} />
            ))}
          </nav>
          <p className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Настройки</p>
          <nav aria-label="Настройки" className="flex flex-col gap-0.5">
            <SideLink
              item={{ to: '/profile', label: 'Профиль', short: 'Профиль', icon: UserRound }}
              unread={0}
              onNavigate={onClose}
            />
          </nav>
          <div className="mt-auto border-t border-line px-3 pt-3">
            <SectionTitle>Тема</SectionTitle>
            <ThemeSwitcher />
          </div>
        </div>
        <div className="border-t border-line px-3 py-3">
          <UserCard />
        </div>
      </aside>
    </>
  );
}

function SideLink({ item, unread, onNavigate }: { item: NavItem; unread: number; onNavigate: () => void }) {
  const path = navPath(item.to);
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors duration-150',
          isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink/85 hover:bg-line/50',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className="size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.to === '/notifications' && unread > 0 && (
            <span className="nums rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">{unread}</span>
          )}
          {isActive && <ChevronDown className="size-4 -rotate-90 text-brand" aria-hidden="true" />}
        </>
      )}
    </NavLink>
  );
}

function UserCard() {
  const profile = useProfile();
  const logout = useLogout();
  const toast = useToast();
  const navigate = useNavigate();
  const data = profile.data?.profile;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar initials={data?.initials ?? '··'} name={data?.displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{data?.displayName ?? '…'}</p>
        <p className="truncate text-xs text-muted">{data?.group ?? ''}</p>
      </div>
      <button
        type="button"
        aria-label="Выйти из кабинета"
        title="Выйти"
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted hover:bg-line/50 hover:text-danger"
        onClick={async () => {
          await logout();
          toast.success('Вы вышли из кабинета');
          navigate('/login', { replace: true });
        }}
      >
        <LogOut className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function BottomNav({ items, pathname, unread }: { items: NavItem[]; pathname: string; unread: number }) {
  return (
    <nav
      aria-label="Быстрая навигация"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-[560px] items-stretch justify-around px-1">
        {items.map((item) => {
          const active = isActivePath(pathname, item.to);
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={navPath(item.to)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors',
                  active ? 'text-brand-ink' : 'text-muted',
                )}
              >
                <span className="relative">
                  <item.icon className={cx('size-[22px]', active && 'text-brand')} aria-hidden="true" />
                  {item.to === '/notifications' && unread > 0 && (
                    <span className="nums absolute -top-1.5 -right-2 grid min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                {item.short}
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" aria-hidden="true" />}
              </NavLink>
            </li>
          );
        })}
        <li className="flex-1">
          <NavLink
            to="/profile"
            aria-current={pathname === '/profile' ? 'page' : undefined}
            className={cx(
              'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors',
              pathname === '/profile' ? 'text-brand-ink' : 'text-muted',
            )}
          >
            <UserRound className="size-[22px]" aria-hidden="true" />
            Профиль
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-line pt-4 pb-24 text-xs text-muted lg:pb-4">
      <p className="max-w-[70ch]">
        «Дедлайн» — концепт для конкурса VK Education «Кибербезопасность и ИИ в высшей школе — 2026». Неофициальный
        сервис МГИМО, не подключён к системам университета. Все данные вымышлены.
      </p>
      <p className="mt-2">
        Учебный проект ·{' '}
        <Link to="/verify/demo-token-2030" className="font-semibold text-brand-ink underline-offset-2 hover:underline">
          Проверка подлинности документа
        </Link>
      </p>
    </footer>
  );
}
