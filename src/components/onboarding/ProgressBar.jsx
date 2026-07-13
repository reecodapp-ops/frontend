const ProgressBar = ({ step, totalSteps }) => {
  const percent = Math.round((step / totalSteps) * 100)

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted font-medium">
          Step {step} of {totalSteps}
        </span>
        <span className="text-sm font-semibold text-primary">{percent}%</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
