import { CardText } from './card-text'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GameCardProps {
  title: string
  artistName?: string
  imageUrl?: string | null
  className?: string
}

export function GameCard({
  title,
  artistName,
  imageUrl,
  className,
}: GameCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        'h-40 w-28 shrink-0 items-center gap-1 p-2 text-center',
        className,
      )}
    >
      <CardContent className="flex h-full flex-col items-center gap-1 overflow-hidden p-0">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        )}
        {/* Text container: fills remaining space, keeps artist anchored at bottom */}
        <div className="flex min-h-0 w-full flex-1 flex-col justify-between">
          <CardText
            text={title}
            className="line-clamp-2 w-full text-xs font-medium leading-tight"
          />
          {artistName && (
            <CardText
              text={artistName}
              className="mt-0.5 w-full truncate text-xs text-muted-foreground"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
