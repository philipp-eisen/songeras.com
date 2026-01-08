import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface TimelineCardWrapperProps {
  releaseYear: number
  children: ReactNode
  className?: string
  /** Whether the card has been revealed (for round cards) */
  isRevealed?: boolean
  /** Whether the placement was correct (only used when revealed) */
  isCorrect?: boolean
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
  isRevealed,
  isCorrect,
}: TimelineCardWrapperProps) {
  const showResult = isRevealed && isCorrect !== undefined
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
          'absolute z-10 flex items-center gap-3',
          // Mobile: to the left of card, vertically centered (mr-6 for 28px result indicator)
          'right-full top-1/2 -translate-y-1/2 mr-6',
          // Desktop: below card, horizontally centered (mt-4 for more space above timeline)
          'md:right-auto md:left-1/2 md:top-full md:-translate-x-1/2 md:translate-y-0 md:mr-0 md:mt-4 md:flex-col md:gap-0',
        )}
      >
        {/* Year label */}
        <span
          className={cn(
            'text-xs font-medium text-muted-foreground whitespace-nowrap',
            // Mobile: to the left of dot, right-aligned
            'w-9 text-right',
            // Desktop: below dot, centered (pt-3 for more space below timeline)
            'md:order-last md:w-auto md:text-center md:pt-3',
          )}
        >
          {releaseYear}
        </span>
        {/* Dot with result indicator overlay */}
        <div className="relative">
          {/* Base dot - always 10px, stays on the rail */}
          <div
            className={cn(
              'size-2.5 rounded-full border-2 border-background shadow-sm',
              showResult && isCorrect ? 'bg-success' : '',
              showResult && !isCorrect ? 'bg-destructive' : '',
              !showResult ? 'bg-primary' : '',
            )}
          />
          {/* Result indicator - absolutely positioned, centered on dot */}
          {showResult && (
            <motion.div
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'flex size-7 items-center justify-center rounded-full',
                isCorrect ? 'bg-success' : 'bg-destructive',
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.3,
                duration: 0.3,
                ease: 'easeOut',
              }}
            >
              {isCorrect ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    delay: 0.5,
                    duration: 0.4,
                    scale: { delay: 0.7, duration: 0.4, repeat: 2 },
                  }}
                >
                  <CheckCircleIcon className="size-5 text-white" weight="fill" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.5,
                    duration: 0.4,
                    type: 'spring',
                    stiffness: 200,
                  }}
                >
                  <XCircleIcon className="size-5 text-white" weight="fill" />
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="relative z-20">{children}</div>
    </div>
  )
}
