import { useDraggable } from '@dnd-kit/core'
import { SealQuestionIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const MYSTERY_CARD_ID = 'mystery-card'

interface MysteryCardStackProps {
  /** Number of cards remaining in the deck */
  cardsRemaining: number
  /** Whether dragging is disabled */
  disabled?: boolean
  /** Whether the card has been placed (hide the stack) */
  isPlaced?: boolean
}

export function MysteryCardStack({
  cardsRemaining,
  disabled,
  isPlaced,
}: MysteryCardStackProps) {
  // Don't show the stack if card is already placed
  if (isPlaced) {
    return (
      <div className="flex h-40 w-28 shrink-0 items-center justify-center">
        <p className="text-center text-xs text-muted-foreground">
          Card placed!
        </p>
      </div>
    )
  }

  return (
    <DraggableCardStack cardsRemaining={cardsRemaining} disabled={disabled} />
  )
}

function DraggableCardStack({
  cardsRemaining,
  disabled,
}: {
  cardsRemaining: number
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: MYSTERY_CARD_ID,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'relative shrink-0 touch-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Stack container with perspective */}
      <motion.div
        className="relative h-40 w-28"
        whileHover={disabled ? undefined : 'hover'}
        initial="idle"
        animate={isDragging ? 'dragging' : 'idle'}
      >
        {/* Back cards (stack effect) */}
        <motion.div
          className="absolute inset-0"
          variants={{
            idle: { rotate: -2, x: 4, y: 4 },
            hover: { rotate: -4, x: 6, y: 6 },
            dragging: { rotate: -2, x: 4, y: 4, opacity: 0.5 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <StackCard variant="back" />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          variants={{
            idle: { rotate: -1, x: 2, y: 2 },
            hover: { rotate: -2, x: 3, y: 3 },
            dragging: { rotate: -1, x: 2, y: 2, opacity: 0.7 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <StackCard variant="middle" />
        </motion.div>

        {/* Top card (main draggable card) */}
        <motion.div
          className="relative"
          variants={{
            idle: { y: 0, scale: 1 },
            hover: { y: -4, scale: 1.02 },
            dragging: { opacity: 0.3 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <TopCard disabled={disabled} />
        </motion.div>

        {/* Deck counter badge */}
        <motion.div
          className="absolute -right-2 -top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow-md"
          key={cardsRemaining}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        >
          {cardsRemaining}
        </motion.div>

        {/* Animated glow effect */}
        <motion.div
          className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl"
          variants={{
            idle: {
              boxShadow: '0 0 20px 4px rgba(var(--primary-rgb), 0.2)',
            },
            hover: {
              boxShadow: '0 0 30px 8px rgba(var(--primary-rgb), 0.4)',
            },
            dragging: {
              boxShadow: '0 0 10px 2px rgba(var(--primary-rgb), 0.1)',
            },
          }}
          animate={{
            boxShadow: [
              '0 0 20px 4px hsl(var(--primary) / 0.2)',
              '0 0 25px 6px hsl(var(--primary) / 0.3)',
              '0 0 20px 4px hsl(var(--primary) / 0.2)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </div>
  )
}

function StackCard({ variant }: { variant: 'back' | 'middle' }) {
  return (
    <Card
      size="sm"
      className={cn(
        'flex h-full w-full items-center justify-center',
        'bg-gradient-to-br from-primary/80 to-primary/50',
        variant === 'back' && 'opacity-40',
        variant === 'middle' && 'opacity-60',
      )}
    />
  )
}

function TopCard({ disabled }: { disabled?: boolean }) {
  return (
    <Card
      size="sm"
      className={cn(
        'flex h-40 w-28 shrink-0 items-center justify-center',
        'bg-gradient-to-br from-primary to-primary/70',
        'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
        'shadow-lg shadow-primary/30',
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-2 p-0">
        <motion.div
          animate={disabled ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SealQuestionIcon
            className="size-14 text-primary-foreground/90"
            weight="duotone"
          />
        </motion.div>
        <span className="text-xs font-medium text-primary-foreground/80">
          Drag to place
        </span>
      </CardContent>
    </Card>
  )
}
