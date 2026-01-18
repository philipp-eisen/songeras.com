import { HeartIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface LivesDisplayProps {
  current: number
  max: number
  className?: string
}

export function LivesDisplay({ current, max, className }: LivesDisplayProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }).map((_, i) => (
        <HeartIcon
          key={i}
          weight={i < current ? 'fill' : 'regular'}
          className={cn(
            'size-6 transition-all',
            i < current ? 'text-red-500' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  )
}
