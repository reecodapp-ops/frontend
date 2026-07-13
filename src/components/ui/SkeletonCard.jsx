const SkeletonCard = ({ lines = 3, className = '' }) => (
  <div className={`card ${className}`}>
    <div className="skeleton h-5 w-1/3 mb-4" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`skeleton h-4 mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
)

export const SkeletonRow = ({ cols = 4 }) => (
  <div className="flex gap-4 px-6 py-4 border-b border-border">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="skeleton h-4 flex-1" />
    ))}
  </div>
)

export const SkeletonText = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`skeleton ${width} ${height} ${className}`} />
)

export default SkeletonCard
