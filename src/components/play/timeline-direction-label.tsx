import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

interface TimelineDirectionLabelProps {
  direction: 'earlier' | 'later'
}

export function TimelineDirectionLabel({
  direction,
}: TimelineDirectionLabelProps) {
  const isEarlier = direction === 'earlier'

  return (
    <div
      className={cn(
        'pointer-events-none shrink-0 z-10 flex items-center gap-1',
        'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
        // Align with the rail line on desktop (rail sits at bottom-[42px])
        'md:self-end md:mb-[34px]',
      )}
    >
      {isEarlier ? (
        <>
          <ArrowUpIcon weight="bold" className="size-3.5 md:hidden" />
          <ArrowLeftIcon weight="bold" className="hidden size-3.5 md:inline" />
          <span>Earlier</span>
        </>
      ) : (
        <>
          <span>Later</span>
          <ArrowDownIcon weight="bold" className="size-3.5 md:hidden" />
          <ArrowRightIcon weight="bold" className="hidden size-3.5 md:inline" />
        </>
      )}
    </div>
  )
}
