import { useState } from 'react'
import { Wallet, CalendarDays, Info, SkipForward } from 'lucide-react'
import Button from '../../components/ui/Button'

const today = new Date().toISOString().split('T')[0]

const Step3OpeningBalance = ({ onBack, initialData, currency = 'UGX', onSuccess }) => {
  const [amount, setAmount] = useState(() => {
    if (initialData?.opening_balance !== undefined) {
      const num = parseFloat(String(initialData.opening_balance))
      return isNaN(num) ? '' : num.toLocaleString('en-UG')
    }
    return ''
  })
  const [openingDate, setOpeningDate] = useState(initialData?.opening_date || today)
  const [errors, setErrors] = useState({})

  const formatDisplay = val => {
    const num = parseFloat(val.replace(/,/g, ''))
    if (isNaN(num)) return ''
    return num.toLocaleString('en-UG')
  }

  const validate = () => {
    const e = {}
    const raw = amount.replace(/,/g, '')
    if (raw === '' || raw === '.') {
      e.amount = 'Please enter an amount (0 or more), or skip.'
    } else {
      const num = parseFloat(raw)
      if (isNaN(num) || num < 0) e.amount = 'Please enter a valid amount (0 or more).'
    }
    if (!openingDate) e.openingDate = 'Please select the opening date.'
    return e
  }

  /** Submit with opening_balance included. */
  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    onSuccess({
      opening_balance: parseFloat(amount.replace(/,/g, '')),
      opening_date:    openingDate,
    })
  }

  /** Skip — omit opening_balance entirely; shell will not send the field. */
  const handleSkip = () => {
    setErrors({})
    onSuccess({ opening_date: openingDate })
  }

  return (
    <div className="card shadow-modal">
      <div className="mb-7">
        <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Wallet size={22} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-navy">How much business money are you starting with?</h2>
        <p className="text-muted mt-2 leading-relaxed">
          This is the money your business has available now. Do not include personal money.
          You can always set this later from your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Amount field */}
        <div className="form-group">
          <label htmlFor="opening-amount" className="label">
            Amount ({currency})
          </label>
          <div className={`flex items-center border-2 rounded-xl bg-surface transition-all duration-200 ${errors.amount ? 'border-danger' : 'border-border focus-within:border-primary'}`}>
            <input
              id="opening-amount"
              type="text"
              inputMode="numeric"
              className="flex-1 px-4 py-4 text-2xl font-semibold text-navy bg-transparent outline-none"
              placeholder="0"
              value={amount}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9.]/g, '')
                setAmount(raw)
              }}
              onBlur={() => setAmount(formatDisplay(amount))}
              onFocus={() => setAmount(amount.replace(/,/g, ''))}
            />
            <span className="px-4 text-muted font-semibold text-lg">{currency}</span>
          </div>
          {errors.amount && <p className="error-msg">{errors.amount}</p>}
        </div>

        {/* Opening date */}
        <div className="form-group">
          <label htmlFor="opening-date" className="label">Opening Date</label>
          <div className={`flex items-center border-2 rounded-xl bg-surface transition-all duration-200 ${errors.openingDate ? 'border-danger' : 'border-border focus-within:border-primary'}`}>
            <input
              id="opening-date"
              type="date"
              className="flex-1 px-4 py-3.5 text-navy bg-transparent outline-none text-[15px]"
              value={openingDate}
              max={today}
              onChange={e => setOpeningDate(e.target.value)}
            />
            <CalendarDays size={18} className="mr-4 text-muted flex-shrink-0" />
          </div>
          {errors.openingDate && <p className="error-msg">{errors.openingDate}</p>}
        </div>

        {/* Info box */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-navy leading-relaxed">
            This helps Reecod show your business money available from the start.
            If you're not sure, you can skip this and set it from your dashboard later.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            id="skip-opening-balance"
            type="button"
            variant="secondary"
            onClick={handleSkip}
            className="flex-1 gap-1.5 text-muted border-dashed"
          >
            <SkipForward size={15} />
            Skip for now
          </Button>
          <Button type="submit" className="flex-1" size="lg">
            Save &amp; Continue
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Step3OpeningBalance
