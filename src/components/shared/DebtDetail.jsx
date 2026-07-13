import { useState } from 'react'
import { X, CreditCard, ArrowRight, CheckCircle, Receipt, Clock, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import RecordPaymentModal from './RecordPaymentModal'
import { formatMoney, formatDate } from '../../utils/format'

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig = {
  PAID: {
    bg:   'bg-green-50',
    text: 'text-success',
    border: 'border-green-200',
    icon: CheckCircle,
    label: 'Fully paid',
  },
  PARTIAL: {
    bg:   'bg-amber-50',
    text: 'text-warning',
    border: 'border-amber-200',
    icon: AlertCircle,
    label: 'Partially paid',
  },
  UNPAID: {
    bg:   'bg-red-50',
    text: 'text-danger',
    border: 'border-red-200',
    icon: Clock,
    label: 'Unpaid',
  },
}

// ─── DebtDetail ───────────────────────────────────────────────────────────────
// Props:
//   row      — a ledger row: { id, receipt_number, status, original_amount,
//               paid_amount, remaining_amount, occurred_at, created_at,
//               fully_paid_at, payments, due_date }
//   customer — { id, full_name, debt_balance }
//   currency — currency object or string
//   onClose  — () => void
//   onPaymentRecorded — () => void   (called after a payment succeeds)
const DebtDetail = ({ row, customer, currency, onClose, onPaymentRecorded }) => {
  const { t } = useTranslation()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const cfg = statusConfig[row.status] || statusConfig.UNPAID
  const StatusIcon = cfg.icon
  const payments = row.payments || []
  const receiptLabel = row.receipt_number ? t('debt_detail.title_with_number', { number: row.receipt_number }) : t('debt_detail.title_fallback')

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    if (onPaymentRecorded) onPaymentRecorded()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-bg-gray rounded-xl flex items-center justify-center">
                <Receipt size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">{receiptLabel}</h2>
                <p className="text-xs text-muted">{formatDate(row.occurred_at || row.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted hover:text-navy transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Status pill */}
            <div className={`mx-6 mt-5 p-4 rounded-xl border ${cfg.bg} ${cfg.border} flex items-center gap-3`}>
              <StatusIcon size={18} className={cfg.text} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.text}`}>
                  {row.status === 'PAID' ? t('debt_detail.status_paid')
                    : row.status === 'PARTIAL' ? t('debt_detail.status_partial')
                    : t('debt_detail.status_unpaid')}
                </p>
                {row.status === 'PAID' && row.fully_paid_at && (
                  <p className="text-xs text-muted mt-0.5">{t('debt_detail.paid_on', { date: formatDate(row.fully_paid_at) })}</p>
                )}
                {row.status !== 'PAID' && row.due_date && (
                  <p className="text-xs text-muted mt-0.5">{t('debt_detail.due_date', { date: formatDate(row.due_date) })}</p>
                )}
              </div>
            </div>

            {/* Amount breakdown */}
            <div className="mx-6 mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 bg-bg-gray rounded-xl text-center">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{t('debt_detail.col_original')}</p>
                <p className="text-sm font-bold text-navy">{formatMoney(row.original_amount, currency)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{t('debt_detail.col_paid')}</p>
                <p className="text-sm font-bold text-success">{formatMoney(row.paid_amount ?? (row.original_amount - row.remaining_amount), currency)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-center">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{t('debt_detail.col_remaining')}</p>
                <p className="text-sm font-bold text-danger">{formatMoney(row.remaining_amount ?? 0, currency)}</p>
              </div>
            </div>

            {/* Payments received for this debt */}
            <div className="px-6 mt-5 pb-2">
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
                {t('debt_detail.payments_heading')}
              </h3>
              {payments.length === 0 ? (
                <p className="text-xs text-muted italic">{t('debt_detail.no_payments')}</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <div key={p.id ?? i} className="p-3 bg-bg-gray rounded-xl flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <ArrowRight size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-success">{formatMoney(p.amount, currency)}</p>
                          {p.note && <p className="text-xs text-muted mt-0.5 italic">"{p.note}"</p>}
                        </div>
                      </div>
                      <span className="text-xs text-muted whitespace-nowrap flex-shrink-0">
                        {formatDate(p.occurred_at || p.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-2">
            {row.remaining_amount > 0 && (
              <>
                <p className="text-[10px] text-muted text-center leading-relaxed">
                  {t('debt_detail.oldest_first_note')}
                </p>
                <Button
                  fullWidth
                  variant="success"
                  className="gap-2"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard size={15} />
                  {t('debt_detail.record_payment')}
                </Button>
              </>
            )}
            <Button fullWidth variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>

        </div>
      </div>

      {showPaymentModal && (
        <RecordPaymentModal
          customer={customer}
          currency={currency}
          prefill={{ amount: row.remaining_amount, note: `Payment for ${receiptLabel}` }}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  )
}

export default DebtDetail
