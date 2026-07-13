import { Wallet, Users, AlertTriangle } from 'lucide-react'
import Button from '../../components/ui/Button'

const benefits = [
  {
    icon: Wallet,
    color: 'text-success',
    bg: 'bg-green-50',
    title: 'See your business money clearly',
    desc: 'Know exactly how much cash your business has right now — at any time, from anywhere.',
  },
  {
    icon: Users,
    color: 'text-warning',
    bg: 'bg-amber-50',
    title: 'Track money owed to you',
    desc: 'Know which customers owe you money and how much. No more forgotten debts.',
  },
  {
    icon: AlertTriangle,
    color: 'text-danger',
    bg: 'bg-red-50',
    title: 'Get early warnings',
    desc: 'Reecod will alert you when stock is running low or something looks off — before it becomes a problem.',
  },
]

const Step4Welcome = ({ bizData, onContinue }) => {
  return (
    <div className="fade-in">
      <div className="card shadow-modal mb-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-navy">You're all set!</h2>
          <p className="text-muted mt-2">
            {bizData?.name
              ? <><span className="font-semibold text-navy">{bizData.name}</span> is ready on Reecod.</>
              : 'Your business is ready on Reecod.'}
          </p>
        </div>

        <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          Here's what Reecod helps you do
        </p>

        <div className="space-y-4">
          {benefits.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="flex gap-4 p-4 bg-bg-gray rounded-xl">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="font-semibold text-navy text-[15px]">{title}</p>
                <p className="text-muted text-sm mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={onContinue}
          className="mt-8"
        >
          Go to my dashboard
        </Button>
      </div>
    </div>
  )
}

export default Step4Welcome
