import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion, Home } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/Logo';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 text-center">
      <Logo size="lg" className="mb-8" />
      <span className="grid size-16 place-items-center rounded-3xl bg-surface-hover text-brand" aria-hidden="true">
        <FileQuestion className="size-8" />
      </span>
      <p className="mt-4 text-2xl font-semibold text-ink">Страница не найдена</p>
      <p className="mt-2 max-w-[38ch] text-sm text-muted">
        Возможно, ссылка устарела или раздел переехал. Вернитесь на главный экран — там всё самое важное на сегодня.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink to="/" iconLeft={<Home className="size-4" aria-hidden="true" />}>
          На главную
        </ButtonLink>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          iconLeft={<ArrowLeft className="size-4" aria-hidden="true" />}
        >
          Назад
        </Button>
      </div>
      <p className="mt-8 text-xs text-muted">
        Нужна помощь?{' '}
        <Link to="/notifications" className="font-semibold text-brand hover:underline">
          Задайте вопрос деканату
        </Link>
      </p>
    </div>
  );
}
