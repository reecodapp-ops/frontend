import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

/**
 * ConfirmationBanner — fixed top-of-page green bar.
 * Auto-dismisses after 3 seconds.
 * Props: message, onDismiss
 */
const ConfirmationBanner = ({ message, onDismiss }) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 py-3.5 bg-success text-white shadow-lg fade-in"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <CheckCircle size={20} className="flex-shrink-0" />
        <span className="font-semibold text-sm">{message}</span>
      </div>
      <button
        onClick={() => { setVisible(false); onDismiss?.() }}
        className="text-white/80 hover:text-white transition-colors ml-4 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default ConfirmationBanner
