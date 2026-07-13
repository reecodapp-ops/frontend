import { useState, useEffect, useRef } from 'react'
import { Globe, Search, ChevronDown } from 'lucide-react'
import api from '../../api/axios'

// Helper to get flag emoji dynamically from ISO code
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🏳️'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  try {
    return String.fromCodePoint(...codePoints)
  } catch {
    return '🏳️'
  }
}

// Module-level cache for countries lookup
let cachedCountriesPromise = null
export const fetchCountriesCached = () => {
  if (!cachedCountriesPromise) {
    cachedCountriesPromise = api.get('/countries')
      .then(res => {
        return (res.data || [])
          .filter(c => c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
      })
      .catch(err => {
        cachedCountriesPromise = null
        throw err
      })
  }
  return cachedCountriesPromise
}

// Helper to split E.164 number into country ID and local number
export const parseE164 = (phone, countriesList) => {
  if (!phone || !countriesList || countriesList.length === 0) {
    return { countryId: null, localNumber: phone || '' }
  }

  let normalized = phone.trim()
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  // Sort by calling code length descending
  const sorted = [...countriesList].sort((a, b) => {
    const codeA = a.calling_code || ''
    const codeB = b.calling_code || ''
    return codeB.length - codeA.length
  })

  for (const c of sorted) {
    const code = c.calling_code || ''
    if (code && normalized.startsWith(code)) {
      const local = normalized.substring(code.length).trim()
      return { countryId: c.id, localNumber: local }
    }
  }

  return { countryId: null, localNumber: phone }
}

const PhoneNumberInput = ({
  id,
  label = 'Phone number',
  countryId,
  localNumber,
  defaultCountryId,
  onChange,
  error,
  disabled = false,
  required = false,
}) => {
  const [countries, setCountries] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchCountriesCached()
      .then(setCountries)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = e => {
      if (!dropdownRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-default country picker if not explicitly set
  useEffect(() => {
    if (countries.length > 0 && !countryId) {
      const defId = defaultCountryId || countries[0]?.id
      if (defId) {
        onChange({ phone_country_id: defId, phone_local_number: localNumber })
      }
    }
  }, [countries, countryId, defaultCountryId, localNumber, onChange])

  const selectedCountry = countries.find(c => c.id === countryId)

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.calling_code.includes(search)
  )

  const handleLocalChange = e => {
    onChange({
      phone_country_id: countryId,
      phone_local_number: e.target.value,
    })
  }

  const handleSelectCountry = (c) => {
    onChange({
      phone_country_id: c.id,
      phone_local_number: localNumber,
    })
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="form-group">
      <label htmlFor={id} className="label flex items-center justify-between">
        <span>
          {label} {!required && <span className="text-muted font-normal text-xs">(optional)</span>}
        </span>
        {error && <span className="text-danger text-xs font-semibold">{error}</span>}
      </label>

      <div
        className={`flex items-stretch rounded-xl border bg-surface overflow-visible transition-colors ${
          error ? 'border-danger' : 'border-border focus-within:border-primary'
        } ${disabled ? 'bg-bg-gray/50 cursor-not-allowed' : ''}`}
      >
        {/* Country Picker Trigger */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className="h-full px-3 flex items-center gap-1.5 border-r border-border hover:bg-bg-gray/30 transition-colors text-sm font-semibold text-navy cursor-pointer select-none"
          >
            {selectedCountry ? (
              <>
                <span className="text-lg">{getFlagEmoji(selectedCountry.iso_code)}</span>
                <span className="text-xs text-muted">{selectedCountry.calling_code}</span>
              </>
            ) : (
              <Globe size={15} className="text-muted" />
            )}
            <ChevronDown size={12} className="text-muted flex-shrink-0 mt-0.5" />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-xl shadow-modal z-50 w-64 max-h-60 overflow-hidden flex flex-col fade-in">
              <div className="p-2 border-b border-border flex items-center gap-2 bg-bg-gray/30 flex-shrink-0">
                <Search size={14} className="text-muted flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search country…"
                  className="w-full bg-transparent border-none outline-none text-xs py-1"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {filteredCountries.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted italic">No countries found</p>
                ) : (
                  filteredCountries.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className="w-full text-left px-3 py-2 hover:bg-bg-gray transition-colors text-xs flex items-center justify-between gap-3 border-b border-border/40 last:border-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{getFlagEmoji(c.iso_code)}</span>
                        <span className="font-semibold text-navy truncate">{c.name}</span>
                      </div>
                      <span className="text-[10px] text-muted font-bold flex-shrink-0">{c.calling_code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local number input field */}
        <input
          id={id}
          type="tel"
          disabled={disabled}
          placeholder="e.g. 772000000"
          value={localNumber}
          onChange={handleLocalChange}
          className="flex-1 bg-transparent border-none outline-none px-3 py-2.5 text-sm font-semibold text-navy"
        />
      </div>
    </div>
  )
}

export default PhoneNumberInput
