import { useState } from 'react';
import { Icon } from '@/ui';
import { Palette } from '@/domain/enums.js';
import { useTheme } from '@/hooks/useTheme.js';
import { useT } from '@/hooks/useT.js';
import styles from './ThemeSwitcher.module.css';

const PALETTES = [
  { id: Palette.SAROY, label: 'Saroy · Terracotta', colors: ['#b85535', '#d89a2e', '#fbf6ec'] },
  { id: Palette.MARVARID, label: 'Marvarid · Electric cyan', colors: ['#16d9e3', '#168bff', '#f2f1ed'] },
  { id: Palette.SAMARQAND, label: 'Samarqand · Signal indigo', colors: ['#6558f5', '#e9a23b', '#f4f1e8'] },
  { id: Palette.DARYO, label: 'Daryo · Growth emerald', colors: ['#15b981', '#e9a23b', '#f1efe6'] },
  { id: Palette.OSMON, label: 'Osmon · Bright azure', colors: ['#168bff', '#16d9e3', '#eef6ff'] },
  { id: Palette.UCHQUN, label: 'Uchqun · Forge amber', colors: ['#e9a23b', '#b85535', '#fff7e8'] },
  { id: Palette.MEROS, label: 'Meros · Deep terracotta', colors: ['#913f2a', '#e9a23b', '#f9eee9'] },
];

/** The palette/dark controls — reusable inline (e.g. in Settings). */
export function ThemeControls() {
  const { palette, dark, setPalette, toggleDark } = useTheme();
  const { t } = useT();
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.darkRow}
        onClick={toggleDark}
        aria-pressed={dark}
      >
        <Icon name={dark ? 'moon' : 'sun'} size={16} />
        <span>{t('settings.dark')}</span>
        <span className={`${styles.toggle} ${dark ? styles.toggleOn : ''}`}>
          <span className={styles.knob} />
        </span>
      </button>
      <div className={styles.swatches}>
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.swatch} ${palette === p.id ? styles.swatchOn : ''}`}
            onClick={() => setPalette(p.id)}
          >
            <span className={styles.dots}>
              {p.colors.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            <span className={styles.swatchLabel}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Floating tweaks button + popover. */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <div className={styles.fabWrap}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>StarForge · {t('shell.appearance')}</div>
          <ThemeControls />
        </div>
      )}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-label={t('shell.appearance')}
      >
        <Icon name={open ? 'x' : 'settings'} size={20} />
      </button>
    </div>
  );
}
