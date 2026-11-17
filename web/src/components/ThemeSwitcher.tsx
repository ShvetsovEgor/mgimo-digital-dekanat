import { useEffect, useState } from 'react';
import { Laptop, Monitor, Moon, Sun } from 'lucide-react';
import { Segmented } from './ui/Segmented';
import { listenSystemTheme, setStoredTheme, getStoredTheme, type ThemeMode } from '@/lib/theme';

const OPTIONS = [
  { value: 'light' as const, label: <><Sun className="size-4" aria-hidden="true" /> Светлая</> },
  { value: 'dark' as const, label: <><Moon className="size-4" aria-hidden="true" /> Тёмная</> },
  { value: 'system' as const, label: <><Monitor className="size-4" aria-hidden="true" /> Системная</> },
];

export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => listenSystemTheme(() => setStoredTheme(getStoredTheme())), []);

  return (
    <div>
      <Segmented
        label="Тема интерфейса"
        size="sm"
        options={OPTIONS}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setStoredTheme(value);
        }}
      />
      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
        <Laptop className="size-3.5" aria-hidden="true" />
        Выбор сохраняется в браузере и не передаётся на сервер.
      </p>
    </div>
  );
}
