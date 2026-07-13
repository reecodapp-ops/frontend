import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * SlidePanel — full-height right panel with dark overlay.
 * Closes on Escape key or overlay click.
 * Props: title, onClose, children, width (default 'w-[540px]')
 */
const SlidePanel = ({ title, onClose, children, width = 'w-[540px]' }) => {
  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`${width} h-full bg-surface flex flex-col shadow-modal slide-in-right overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-navy transition-colors rounded-lg p-1 hover:bg-bg-gray"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default SlidePanel
