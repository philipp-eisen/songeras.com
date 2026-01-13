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
        <CardText
          text={title}
          className="line-clamp-2 w-full text-xs font-medium leading-snug"
        />
        {artistName && (
          <CardText
            text={artistName}
            className="w-full shrink-0 truncate text-xs text-muted-foreground"
          />
        )}
      </CardContent>
    </Card>
  )
}
