import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

/**
 * Language selector dropdown.
 * Writes the user's choice to localStorage via i18next's LanguageDetector
 * (key: 'dukamate_lang') so it persists across sessions.
 *
 * Place this anywhere in the layout — currently rendered at the bottom of Sidebar.
 */
const LANGUAGES = [
  { code: 'en',    label: 'English'    },
  { code: 'fr',    label: 'Français'   },
  { code: 'sw',    label: 'Kiswahili'  },
  { code: 'sw-CD', label: 'Kiswahili (CD)' },
]

const LanguageSelector = ({ className = '' }) => {
  const { i18n, t } = useTranslation()

  // Normalise the active language to one of our supported codes.
  // e.g. 'en-US' → 'en', 'sw-CD' stays 'sw-CD'
  const active = LANGUAGES.find(l => i18n.language === l.code)?.code
    || LANGUAGES.find(l => i18n.language.startsWith(l.code))?.code
    || 'en'

  const handleChange = e => {
    i18n.changeLanguage(e.target.value)
    // LanguageDetector's caches:['localStorage'] handles persistence automatically
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe size={14} className="text-muted flex-shrink-0" />
      <select
        id="language-selector"
        aria-label={t('language_selector.label')}
        value={active}
        onChange={handleChange}
        className="text-xs text-muted bg-transparent border-none outline-none cursor-pointer hover:text-navy transition-colors"
      >
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector
