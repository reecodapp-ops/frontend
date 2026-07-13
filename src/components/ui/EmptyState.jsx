/**
 * EmptyState — centered illustration area with icon, heading, subtext, and optional action button.
 * Props:
 *   icon      — Lucide icon component
 *   iconBg    — tailwind bg class (default 'bg-bg-gray')
 *   iconColor — tailwind color class (default 'text-muted')
 *   heading   — main text
 *   subtext   — secondary text (optional)
 *   action    — { label, onClick } for a primary button (optional)
 */
const EmptyState = ({
  icon: Icon,
  iconBg = 'bg-bg-gray',
  iconColor = 'text-muted',
  heading,
  subtext,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      {Icon && (
        <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mb-5`}>
          <Icon size={28} className={iconColor} />
        </div>
      )}
      <h3 className="text-lg font-bold text-navy mb-1.5">{heading}</h3>
      {subtext && (
        <p className="text-muted text-sm max-w-xs leading-relaxed mb-6">{subtext}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary text-sm px-5 py-2.5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
