import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface TimelineCardWrapperProps {
  releaseYear: number
  children: ReactNode
  className?: string
}

/**
 * Wraps a card with a year marker dot positioned on the timeline rail.
 * - Desktop: Card above rail, dot centered under card, year below dot
 * - Mobile: Flexbox row with [year] [dot] [card]
 */
export function TimelineCardWrapper({
  releaseYear,
  children,
  className,
}: TimelineCardWrapperProps) {
  return (
    <div
      className={cn(
        'relative shrink-0',
        className,
      )}
    >
      {/* Year marker container - absolutely positioned on both mobile and desktop */}
      <div
        className={cn(
          'absolute z-10 flex items-center gap-1.5',
          // Mobile: to the left of card, vertically centered
          'right-full top-1/2 -translate-y-1/2 mr-3',
          // Desktop: below card, horizontally centered
          'md:right-auto md:left-1/2 md:top-full md:-translate-x-1/2 md:translate-y-0 md:mr-0 md:mt-2 md:flex-col md:gap-0',
        )}
      >
        {/* Year label */}
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground whitespace-nowrap',
            // Mobile: to the left of dot, right-aligned
            'w-9 text-right',
            // Desktop: below dot, centered
            'md:order-last md:w-auto md:text-center md:pt-0.5',
          )}
        >
          {releaseYear}
        </span>
        {/* Dot */}
        <div className="size-2.5 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm" />
      </div>

      {/* Card content */}
      <div className="relative z-20">{children}</div>
    </div>
  )
}
