// Shared formatting helpers.
//
// IMPORTANT: as of the v3 backend, `business.currency` is an OBJECT
// ({ id, iso_code, name, symbol, decimal_places, ... }) coming from the
// `currencies` table via the `currency_id` FK — it is no longer a plain
// string. This is what caused the earlier "[object Object] 28,000" bug:
// something was rendering the whole currency object instead of a field
// on it. Always go through formatMoney() below instead of interpolating
// `business.currency` directly in JSX.

export function formatMoney(amount, currency) {
  const n = Number(amount || 0)

  // Accept either the full currency object, a bare ISO/symbol string, or
  // nothing at all (falls back to a plain number).
  let symbol = ''
  let decimals = 2

  if (currency && typeof currency === 'object') {
    symbol = currency.symbol || currency.iso_code || ''
    decimals = currency.decimal_places ?? 2
  } else if (typeof currency === 'string') {
    symbol = currency
  }

  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return symbol ? `${symbol} ${formatted}` : formatted
}

// credit_level -> { label, variant } for <Badge variant=...>
// Matches customers.credit_level CHECK constraint:
// UNSCORED, BLOCKED, HIGH_RISK, AVERAGE, GOOD, EXCELLENT
export function creditLevelMeta(level) {
  const map = {
    UNSCORED:  { label: 'Unscored',  variant: 'neutral' },
    BLOCKED:   { label: 'Blocked',   variant: 'danger'  },
    HIGH_RISK: { label: 'High risk', variant: 'danger'  },
    AVERAGE:   { label: 'Average',   variant: 'warning' },
    GOOD:      { label: 'Good',      variant: 'info'    },
    EXCELLENT: { label: 'Excellent', variant: 'success' },
  }
  return map[level] || map.UNSCORED
}

export const CREDIT_LEVEL_OPTIONS = [
  { value: '', label: 'All credit levels' },
  { value: 'UNSCORED', label: 'Unscored' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'HIGH_RISK', label: 'High risk' },
  { value: 'AVERAGE', label: 'Average' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EXCELLENT', label: 'Excellent' },
]

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', opts)
}

// Reecod Engine score color -> tailwind classes.
// Per the Reecod spec: green/yellow/orange/red, mapped consistently across
// Customer Credit Trust, Buyer Value, Supplier Reliability, Supplier Terms.
export function reecodColor(color) {
  const map = {
    green:  { text: 'text-success', bg: 'bg-green-50', ring: 'ring-success/20' },
    yellow: { text: 'text-warning', bg: 'bg-amber-50', ring: 'ring-warning/20' },
    orange: { text: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-500/20' },
    red:    { text: 'text-danger', bg: 'bg-red-50', ring: 'ring-danger/20' },
  }
  return map[color] || { text: 'text-muted', bg: 'bg-bg-gray', ring: 'ring-border' }
}
