import { AlertTriangle } from 'lucide-react'

/**
 * WarningBanner — inline amber banner for soft API warnings.
 * If onConfirm + onCancel are provided → renders Cancel + Confirm buttons.
 * Otherwise → plain informational banner.
 * Props: message, onConfirm (optional), onCancel (optional), confirmLabel, cancelLabel
 */
const WarningBanner = ({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) => {
  const hasActions = onConfirm && onCancel

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 fade-in"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">{message}</p>
          {hasActions && (
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-warning hover:bg-amber-600 rounded-lg transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WarningBanner
