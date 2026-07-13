/**
 * DateGroupedList — groups items by date and renders section headers.
 * Props:
 *   items       — array of objects with a `date` or `created_at` field
 *   dateKey     — which field to group by (default 'date', fallback 'created_at')
 *   renderItem  — (item, index) => ReactNode
 *   emptyState  — ReactNode shown when items is empty
 */
const DateGroupedList = ({
  items = [],
  dateKey = 'date',
  renderItem,
  emptyState = null,
}) => {
  if (items.length === 0) return emptyState

  // Build ordered groups: [{ label, items }]
  const groups = []
  const groupMap = {}

  items.forEach(item => {
    const rawDate = item[dateKey] || item['created_at'] || item['date']
    const d = rawDate ? new Date(rawDate) : new Date()
    const label = formatDateLabel(d)

    if (!groupMap[label]) {
      groupMap[label] = []
      groups.push({ label, items: groupMap[label] })
    }
    groupMap[label].push(item)
  })

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.label}>
          {/* Date section header */}
          <div className="flex items-center gap-3 mb-2 px-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
              {group.label}
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="card p-0 overflow-hidden">
            {group.items.map((item, idx) => (
              <div key={item.id || idx} className="border-b border-border last:border-0">
                {renderItem(item, idx)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Converts a Date to a human-readable section label.
 * Today → "Today", Yesterday → "Yesterday", else "Mon, 10 Jun"
 */
function formatDateLabel(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = (today - target) / (1000 * 60 * 60 * 24)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default DateGroupedList
