interface SkeletonProps {
  className?: string
  rows?: number
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="skeleton h-6 w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-3/5" />
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="glass-card p-6">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-10 w-32 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: SkeletonProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/4" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
