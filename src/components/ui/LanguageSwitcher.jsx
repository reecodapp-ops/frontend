import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

/**
 * LanguageSwitcher
 * ────────────────
 * A single component that works in two contexts:
 *
 *   variant="compact"   → sidebar / header (globe icon + bare select, no label text)
 *   variant="settings"  → Settings page (visible label + subtitle, full-width select)
 *
 * Persistence is handled automatically by i18next-browser-languagedetector via
 * localStorage key 'dukamate_lang' — no duplicate logic here.
 *
 * Display labels are pulled from translation.json under language_selector.{code}
 * (e.g. language_selector.sw → "Kiswahili") so the option text itself is translated
 * as the interface language changes.
 *
 * Width note: the select has a min-w so the layout doesn't shift when switching
 * between labels of different lengths (e.g. "English" vs "Kiswahili (Congo)").
 *
 * Usage:
 *   import LanguageSwitcher from '../ui/LanguageSwitcher'
 *
 *   // In Sidebar / header:
 *   <LanguageSwitcher />
 *
 *   // In SettingsPage:
 *   <LanguageSwitcher variant="settings" />
 */

// Supported language codes in display order.
// Add new entries here — the translation.json files supply the human-readable labels.
const SUPPORTED_LANGUAGES = ['en', 'fr', 'sw', 'sw-CD']

/**
 * Normalise whatever i18n.language returns to one of our supported codes.
 * e.g.  'en-US'  → 'en'
 *        'sw-CD'  → 'sw-CD'   (exact match wins over prefix 'sw')
 *        'fr-BE'  → 'fr'
 */
const resolveActive = (lng) => {
  if (SUPPORTED_LANGUAGES.includes(lng)) return lng
  // longest-prefix wins: 'sw-CD' before 'sw'
  const sorted = [...SUPPORTED_LANGUAGES].sort((a, b) => b.length - a.length)
  return sorted.find(code => lng.startsWith(code)) || 'en'
}

// ─── Compact variant (sidebar / header) ──────────────────────────────────────
const CompactSwitcher = ({ active, options, onChange }) => (
  <div className="flex items-center gap-1.5">
    <Globe
      size={13}
      className="text-muted flex-shrink-0 pointer-events-none"
      aria-hidden="true"
    />
    <select
      id="language-switcher-compact"
      value={active}
      onChange={onChange}
      // min-w prevents layout shift between shorter and longer labels.
      // "Kiswahili (Congo)" is the longest option (~18 chars).
      className="
        text-xs text-muted bg-transparent border-none outline-none
        cursor-pointer hover:text-navy transition-colors
        min-w-[72px]
      "
    >
      {options.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  </div>
)

// ─── Settings page variant ────────────────────────────────────────────────────
const SettingsSwitcher = ({ active, options, onChange, t }) => (
  <div className="form-group">
    <label htmlFor="language-switcher-settings" className="label">
      {t('settings.language')}
    </label>
    <p className="text-muted text-xs mb-2">{t('settings.language_subtitle')}</p>
    <div className="relative">
      <Globe
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        aria-hidden="true"
      />
      <select
        id="language-switcher-settings"
        value={active}
        onChange={onChange}
        // Full-width but with a min-w guard; pl-9 aligns text past the globe icon.
        className="input-field pl-9 min-w-[200px] w-full"
      >
        {options.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  </div>
)

// ─── Public component ─────────────────────────────────────────────────────────
const LanguageSwitcher = ({ variant = 'compact', className = '' }) => {
  const { i18n, t } = useTranslation()

  const active = resolveActive(i18n.language)

  // Build option list: label comes from the translation file, not hardcoded.
  // Falls back to the raw code if the key is missing (safe for future additions).
  const options = SUPPORTED_LANGUAGES.map(code => ({
    code,
    label: t(`language_selector.${code}`, { defaultValue: code }),
  }))

  const handleChange = (e) => {
    // i18next-browser-languagedetector persists to localStorage automatically
    i18n.changeLanguage(e.target.value)
  }

  return (
    <div className={className}>
      {variant === 'settings' ? (
        <SettingsSwitcher active={active} options={options} onChange={handleChange} t={t} />
      ) : (
        <CompactSwitcher active={active} options={options} onChange={handleChange} />
      )}
    </div>
  )
}

export default LanguageSwitcher
