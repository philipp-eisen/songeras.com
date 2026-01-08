import { cn } from '@/lib/utils'

interface TimelineRailProps {
  className?: string
}

/**
 * Visual timeline rail line that connects cards.
 * - Desktop: Horizontal line centered vertically
 * - Mobile: Vertical line on the left side
 */
export function TimelineRail({ className }: TimelineRailProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-0 bg-border',
        // Mobile: vertical line positioned where dots are (relative to centered cards)
        // Card is w-28 (112px), centered. Dot is at card_left - mr-6 (24px) - half_dot (5px) = card_left - 29px
        // Card left = 50% - 56px, so dot center = 50% - 56px - 29px = 50% - 85px
        // Rail is 2px wide, so left edge at 50% - 86px
        'left-[calc(50%-86px)] top-0 bottom-0 w-0.5',
        // Desktop: horizontal line through dots
        'md:left-0 md:right-0 md:bottom-[42px] md:h-0.5 md:w-auto md:top-auto',
        className,
      )}
    />
  )
}
