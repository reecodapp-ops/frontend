import { CheckCircle, Pencil, ArrowLeft } from 'lucide-react'
import Button from '../ui/Button'
import WarningBanner from '../ui/WarningBanner'
import { formatMoney, formatDate } from '../../utils/format'

// ─── Shared Receipt View ──────────────────────────────────────────────────────
// Renders a GET /sales/{id}/receipt payload (confirmed shape: receipt_number,
// business_name, currency_symbol, items[with line_total], total_amount,
// footer — a ready multi-line string, whatsapp_share_url) in the style of
// the reference template. customer_name/customer_phone, payment_type,
// due_date, outstanding_amount, and note are attached by the caller (they
// aren't part of the receipt endpoint itself per the API doc).
//
// NOTE on fields: DukaMate's schema has no tax/VAT concept anywhere (no
// tax_rate column on businesses or sales), so unlike the reference template
// there is no "Sales Tax" line — subtotal and total are the same number.
const ReceiptView = ({ receipt, currency, showActions = true, onEdit, onBack, onShare }) => {
  if (!receipt) return null

  const warnings = receipt.warnings || []
  const items = receipt.items || []
  const total = receipt.total_amount ?? receipt.total ?? items.reduce(
    (sum, it) => sum + (it.line_total ?? (Number(it.quantity ?? it.qty ?? 0) * Number(it.unit_price ?? it.price ?? 0))), 0
  )
  const isDebt = (receipt.payment_type || '').toUpperCase() === 'ON_DEBT'
  const amountPaid = receipt.amount_paid ?? (isDebt ? total - (receipt.outstanding_amount ?? 0) : total)
  const balanceDue = receipt.outstanding_amount ?? (isDebt ? Math.max(total - amountPaid, 0) : 0)

  const businessName = receipt.business_name || 'Your business'

  return (
    <div className="space-y-5">
      {showActions && (
        <div className="flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-1.5 text-muted hover:text-navy text-sm font-medium transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            {onShare && (
              <Button variant="secondary" size="sm" onClick={onShare}>Share</Button>
            )}
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit} className="gap-1.5">
                <Pencil size={14} /> Edit sale
              </Button>
            )}
          </div>
        </div>
      )}

      {warnings.map((w, i) => (
        <WarningBanner key={w.code || i} message={w.message || w.code} />
      ))}

      {/* ── Receipt card ── */}
      <div className="bg-surface border border-border rounded-2xl shadow-modal p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 pb-6">
          <div>
            <p className="font-bold text-navy text-lg">{businessName}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold text-navy tracking-wide leading-tight uppercase">
              Sales<br />Receipt
            </h1>
          </div>
        </div>

        {/* Billed to / Receipt meta */}
        <div className="flex items-start justify-between gap-6 py-5 border-t border-border">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Billed to</p>
            <p className="font-semibold text-navy">{receipt.customer_name || 'Walk-in customer'}</p>
            {receipt.customer_phone && <p className="text-muted text-sm">{receipt.customer_phone}</p>}
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wide">Receipt #</span>
              <span className="text-sm font-semibold text-navy">{receipt.receipt_number || '—'}</span>
            </div>
            <div className="flex items-center justify-end gap-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wide">Date</span>
              <span className="text-sm font-semibold text-navy">{formatDate(receipt.occurred_at)}</span>
            </div>
            {isDebt && receipt.due_date && (
              <div className="flex items-center justify-end gap-4">
                <span className="text-xs font-bold text-muted uppercase tracking-wide">Due date</span>
                <span className="text-sm font-semibold text-danger">{formatDate(receipt.due_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="mt-2 rounded-xl overflow-hidden border border-border">
          <div className="grid grid-cols-[50px_1fr_130px_130px] bg-navy text-white text-xs font-bold uppercase tracking-wide">
            <div className="px-4 py-3">Qty</div>
            <div className="px-4 py-3">Description</div>
            <div className="px-4 py-3 text-right">Unit price</div>
            <div className="px-4 py-3 text-right">Amount</div>
          </div>
          {items.map((it, i) => {
            const qty = it.quantity ?? it.qty ?? 0
            const unitPrice = it.unit_price ?? it.price ?? 0
            const lineTotal = it.line_total ?? (qty * unitPrice)
            return (
              <div key={i} className="grid grid-cols-[50px_1fr_130px_130px] border-t border-border text-sm">
                <div className="px-4 py-3 text-navy">{qty}</div>
                <div className="px-4 py-3 text-navy">{it.product_name || it.name || it.description}</div>
                <div className="px-4 py-3 text-right text-muted">{formatMoney(unitPrice, currency)}</div>
                <div className="px-4 py-3 text-right font-semibold text-navy">{formatMoney(lineTotal, currency)}</div>
              </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end mt-5 space-y-1.5">
          <div className="flex items-center justify-between w-64 text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-navy font-medium">{formatMoney(total, currency)}</span>
          </div>
          <div className="flex items-center justify-between w-64 px-3 py-2 bg-bg-gray rounded-lg mt-1">
            <span className="font-bold text-navy">Total</span>
            <span className="font-bold text-navy text-lg">{formatMoney(total, currency)}</span>
          </div>
          {isDebt && (
            <>
              <div className="flex items-center justify-between w-64 text-sm pt-2">
                <span className="text-muted">Paid</span>
                <span className="text-success font-medium">{formatMoney(amountPaid, currency)}</span>
              </div>
              <div className="flex items-center justify-between w-64 text-sm">
                <span className="text-muted">Balance due</span>
                <span className="text-danger font-semibold">{formatMoney(balanceDue, currency)}</span>
              </div>
            </>
          )}
        </div>

        {/* Payment type + notes */}
        <div className="mt-6 pt-5 border-t border-border">
          <span className={`badge ${!isDebt ? 'badge-success' : 'badge-warning'} mb-3 inline-block`}>
            {!isDebt ? 'Paid in cash' : 'Sold on credit'}
          </span>
          {receipt.note && <p className="text-sm text-muted italic mb-3">"{receipt.note}"</p>}
          {receipt.footer && (
            <p className="text-sm text-muted whitespace-pre-line">{receipt.footer}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReceiptView
