import type { ComponentProps } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type CardTextProps = {
  text: string
  className?: string
  tooltipClassName?: string
  tooltipSide?: ComponentProps<typeof TooltipContent>['side']
  tooltipAlign?: ComponentProps<typeof TooltipContent>['align']
}

/**
 * Card text that may be clamped/truncated, with a tooltip showing the full text.
 *
 * We always show the tooltip on hover (even if not truncated) to ensure the
 * full title/artist is accessible.
 */
export function CardText({
  text,
  className,
  tooltipClassName,
  tooltipSide = 'top',
  tooltipAlign = 'center',
}: CardTextProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'block w-full cursor-default appearance-none bg-transparent p-0 text-inherit outline-hidden',
          className,
        )}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent
        side={tooltipSide}
        align={tooltipAlign}
        className={cn('max-w-[18rem] text-pretty', tooltipClassName)}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
