# DESIGN — визуальная система «Дедлайн»

## Идея
МГИМО ассоциируется с тёмно-синим «дипломатическим» и золотом. Мы не копируем логотип и не используем
его цвета так, чтобы получилось «официально»: строим свой узнаваемый стиль — **глубокий индиго + золото-«шафран»**,
крупная типографика, мягкие карточки, акцент на цифрах. Логотип «Дедлайн» — стилизованный конверт-цепочка
(сообщение + университет) в золотом круге.

Иконка логотипа: конверт (MessageSquare + GraduationCap сочетание) — SVG рисуем сами.

## Цвета (tokens)
| Токен | Светлая тема | Тёмная тема |
|---|---|---|
| `--color-ink` (текст) | `#0F1B3D` | `#E7E9F2` |
| `--color-muted` | `#5A6480` | `#9AA2BD` |
| `--color-bg` | `#F6F5F1` (тёплый бумажный) | `#0B1120` |
| `--color-surface` | `#FFFFFF` | `#141C33` |
| `--color-line` | `#E6E3DA` | `#24304F` |
| `--color-brand` (индиго) | `#1D3A8A` | `#8FA8F5` |
| `--color-brand-strong` | `#12245C` | `#B4C4FF` |
| `--color-gold` | `#C9A227` | `#E2C05A` |
| `--color-ok` | `#1F7A4D` | `#5ED39A` |
| `--color-warn` | `#B45309` | `#F5B75A` |
| `--color-danger` | `#B42318` | `#FF8A7A` |

Контраст текста на фоне ≥ 4.5:1.

## Типографика
- **Manrope** (OFL) — весь интерфейс. Заголовки 600–800, цифры tabular-nums.
- Масштаб: 12/13/14/16/18/22/28/34. Body 15–16 px. Line-height 1.45–1.6.

## Радиусы и тени
- Радиусы: 12 (элементы), 16 (карточки), 22 (панели), 999 (чипы).
- Тень: `0 1px 2px rgba(15,27,61,.06), 0 8px 24px -12px rgba(15,27,61,.18)`.

## Сетка
- Мобильный: отступ 16 px, карточки в один столбец, bottom-nav с 5 пунктами.
- Планшет ≥ 768: 2 колонки. Десктоп ≥ 1024: sidebar 264 px + контент max 1120 px.
- Тач-цели ≥ 44 px.

## Компоненты
- `Button` (primary/tonal/ghost/danger), `Card`, `Chip`, `Badge`, `Sheet` (bottom-sheet на мобильном, modal на десктопе),
  `Progress` (с маркером порога), `Skeleton`, `EmptyState`, `ErrorState`, `Segmented`, `Tabs`, `Toast`,
  `Field` (label + control + error), `PageHeader`, `RingProgress` (рейтинг).

## Иконки
Lucide (ISC): CalendarDays, GraduationCap, FileText, Bell, UserRound, Sun/Moon, MapPin, Clock, AlertTriangle,
CheckCircle2, ArrowRight, Download, QrCode, ShieldCheck, MessageCircle, Search, Plus, X, ChevronLeft/Right.

## Микроанимации
- 150–220 ms ease-out; `prefers-reduced-motion: reduce` — отключаем.
- Skeleton shimmer только при загрузке; оптимистичные обновления статусов.

## Tone of voice
- Простой, дружелюбный, без канцелярита. «До “автомата” — 14 баллов», а не «недостаточное количество <…>».
- Ошибки объясняют, что делать: «Пароль короткий — нужно не меньше 8 символов».
- Дисклеймер «Концепт для конкурса» — в футере и на экране входа.
