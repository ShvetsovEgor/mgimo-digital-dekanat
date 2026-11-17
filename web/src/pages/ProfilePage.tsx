import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  BadgeCheck,
  Building2,
  CalendarClock,
  DoorOpen,
  GraduationCap,
  Info,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar, DefinitionList, PageHeader, Stat } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/States';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { PasswordForm } from '@/components/profile/PasswordForm';
import { ContactForm } from '@/components/profile/ContactForm';
import { useLogout } from '@/lib/auth';
import { mockRouteOf, keys, useProfile } from '@/lib/queries';
import { api, ApiError } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { ProfileBundle } from '@/lib/types';

export default function ProfilePage() {
  useDocumentTitle('Профиль — Дедлайн');
  const profile = useProfile();
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();
  const client = useQueryClient();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const data = profile.data;

  const toggle2fa = async (enabled: boolean) => {
    setTwoFactorBusy(true);
    try {
      const next = await api.post<ProfileBundle>(
        '/me/2fa',
        { enabled },
        { mockRoute: mockRouteOf('/me/2fa') },
      );
      client.setQueryData(keys.profile, next);
      toast.success(enabled ? '2FA включена — при входе попросим код' : '2FA выключена');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось изменить настройку');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const doLogoutAll = async () => {
    await logout({ allDevices: true });
    toast.success('Вы вышли на всех устройствах');
    navigate('/login', { replace: true });
  };

  return (
    <div className="animate-fade">
      <PageHeader title="Профиль" description="Личные данные, деканат и безопасность аккаунта." />
      {profile.isLoading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-[22px]" />
          <Skeleton className="h-40 w-full rounded-[16px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
        </div>
      )}
      {profile.isError && <ErrorState error={profile.error} onRetry={() => void profile.refetch()} title="Профиль не загрузился" />}
      {data && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <StudentCard data={data} />
            <Card padding="md">
              <CardHeader title="Учёба" icon={<GraduationCap className="size-[18px]" aria-hidden="true" />} />
              <DefinitionList
                columns={2}
                items={[
                  { label: 'Программа', value: `${data.profile.program} · ${data.profile.programCode}` },
                  { label: 'Факультет', value: data.profile.faculty },
                  { label: 'Курс и группа', value: `${data.profile.courseOrdinal} · ${data.profile.group}${data.profile.subgroup ? `, подгр. ${data.profile.subgroup}` : ''}` },
                  { label: 'Семестр', value: data.profile.semesterLabel },
                  { label: 'Форма обучения', value: `${data.profile.degree} · ${data.profile.studyForm}` },
                  { label: '№ зачётки', value: <span className="nums">{data.profile.recordBookMasked}</span> },
                  { label: 'Финансирование', value: data.profile.fundedLabel },
                  { label: 'Стипендия', value: data.profile.scholarship ?? 'Нет' },
                  { label: 'Общежитие', value: data.profile.dorm ?? 'Не предоставлено' },
                  { label: 'Куратор', value: data.profile.curator },
                ]}
              />
            </Card>
            <ContactForm data={data} />
          </div>
          <div className="space-y-3">
            <DeaneryCard data={data} />
            <Card padding="md">
              <CardHeader title="Безопасность" icon={<ShieldCheck className="size-[18px]" aria-hidden="true" />} />
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-xl bg-ok-soft px-3 py-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-ok-ink" aria-hidden="true" />
                  <p className="text-[12px] text-ok-ink">
                    {data.profile.verification.label} · {data.profile.verification.note}
                  </p>
                </div>
                <Toggle
                  label="Двухфакторная защита"
                  description="Код из приложения при входе. Прототип: переключатель сохраняется на сервере."
                  checked={data.profile.security.twoFactor}
                  onChange={(value) => void toggle2fa(value)}
                  disabled={twoFactorBusy}
                />
                <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
                  <span className="text-muted">Пароль изменён</span>
                  <span className="font-semibold text-ink">{data.profile.security.lastPasswordChange}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted">Активных сессий</span>
                  <span className="nums font-semibold text-ink">{data.profile.security.activeSessions}</span>
                </div>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => setPasswordOpen(true)} iconLeft={<KeyRound className="size-4" aria-hidden="true" />}>
                    Сменить пароль
                  </Button>
                  <Button variant="ghost" onClick={() => setLogoutAllOpen(true)} iconLeft={<DoorOpen className="size-4" aria-hidden="true" />}>
                    Выйти на всех устройствах
                  </Button>
                </div>
              </div>
            </Card>
            <Card padding="md">
              <CardHeader title="Тема" />
              <ThemeSwitcher />
            </Card>
            <Card padding="md" className="bg-surface-2">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                <Info className="size-4 text-muted" aria-hidden="true" />
                Концепт для конкурса
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                «Дедлайн» — прототип для конкурса VK Education. Неофициальный сервис МГИМО, не подключён к системам
                университета. Все персональные данные вымышлены.
              </p>
            </Card>
          </div>
        </div>
      )}

      <PasswordForm open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <Sheet
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        title="Выйти на всех устройствах?"
        description="Все сессии, включая эту, будут завершены. Понадобится снова войти по логину и паролю."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setLogoutAllOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => void doLogoutAll()} iconLeft={<LogOut className="size-4" aria-hidden="true" />}>
              Выйти везде
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-muted">Совет: если вышел не вы — сначала смените пароль, затем завершите сессии.</p>
      </Sheet>
    </div>
  );
}

function StudentCard({ data }: { data: ProfileBundle }) {
  const p = data.profile;
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3.5">
        <Avatar initials={p.initials} name={p.displayName} size="lg" />
        <div className="min-w-0">
          <h2 className="text-xl leading-tight font-extrabold text-ink">{p.fullName}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {p.courseOrdinal} · {p.group} · {p.facultyShort}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="ok" size="sm" icon={<BadgeCheck className="size-3" aria-hidden="true" />}>
              {p.verification.label}
            </Badge>
            <Badge tone="gold" size="sm" icon={<Wallet className="size-3" aria-hidden="true" />}>
              {p.fundedLabel}
            </Badge>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3.5 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">E-mail</dt>
          <dd className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
            <Mail className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="truncate">{p.email}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">Телефон</dt>
          <dd className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-ink">
            <Phone className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            {p.phone ?? 'не указан'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">Telegram</dt>
          <dd className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-ink">
            <AtSign className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            {p.telegram ?? 'не указан'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function DeaneryCard({ data }: { data: ProfileBundle }) {
  const d = data.deanery;
  return (
    <Card padding="md">
      <CardHeader title="Деканат" icon={<Building2 className="size-[18px]" aria-hidden="true" />} />
      <ul className="space-y-2 text-[13px] text-ink">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {d.office}
            <span className="block text-[12px] text-muted">{d.building}</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>{d.hours}</span>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <a href={`mailto:${d.email}`} className="break-all text-brand-ink hover:underline underline-offset-2">
            {d.email}
          </a>
        </li>
        <li className="flex items-start gap-2">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <a href={`tel:${d.phone.replace(/[^+\d]/g, '')}`} className="nums text-brand-ink hover:underline underline-offset-2">
            {d.phone}
          </a>
        </li>
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <Stat label="Секретарь" value={<span className="text-[14px]">{d.secretary}</span>} />
        <Stat label="Декан" value={<span className="text-[14px]">{d.dean}</span>} />
      </div>
      <p className="mt-2 text-[12px] text-muted">{d.responseTime}</p>
      <Button variant="tonal" size="sm" fullWidth className="mt-2.5" onClick={() => window.location.assign('/notifications?ask=1')} iconLeft={<MessageCircle className="size-4" aria-hidden="true" />}>
        Задать вопрос
      </Button>
    </Card>
  );
}
