import { reecodColor } from '../../utils/format'

// ─── Reecod score card ─────────────────────────────────────────────────────
// Renders one lens of a Reecod score object:
//   { percentage, color, label, status, meaning, action, factors?, reason? }
// status is "calculated" or "insufficient_data" — per spec, insufficient_data
// must show "--" and a short helper text, never a fabricated number.
const ScoreCard = ({ score, insufficientHint }) => {
  if (!score) return null

  if (score.status === 'insufficient_data') {
    return (
      <div className="flex items-center gap-4 p-4 bg-bg-gray rounded-xl">
        <div className="w-16 h-16 rounded-full bg-surface border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
          <span className="text-muted font-bold text-lg">--</span>
        </div>
        <div>
          <p className="font-semibold text-navy text-sm">{score.label || 'Needs More Records'}</p>
          <p className="text-muted text-xs mt-0.5">{score.reason || insufficientHint || 'Not enough clean records yet to calculate this score.'}</p>
        </div>
      </div>
    )
  }

  const { text, bg } = reecodColor(score.color)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`font-bold text-xl ${text}`}>{score.percentage}</span>
        </div>
        <div>
          <p className={`font-bold text-sm ${text}`}>{score.label}</p>
          <p className="text-muted text-xs mt-0.5">{score.meaning}</p>
        </div>
      </div>
      {score.action && (
        <div className={`px-3 py-2 rounded-lg text-xs ${bg} ${text}`}>
          {score.action}
        </div>
      )}
      {score.factors && Object.keys(score.factors).length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {Object.entries(score.factors).map(([key, val]) => (
            <div key={key} className="px-3 py-2 bg-bg-gray rounded-lg">
              <p className="text-xs text-muted capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-sm font-semibold text-navy">{Number(val).toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScoreCard
