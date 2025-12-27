import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useState } from 'react'
import { GameCard } from './game-card'
import { DraggableMysteryCard } from './round-timeline-card'
import type { DragEndEvent } from '@dnd-kit/core'
import type { TimelineData } from './types'
import { cn } from '@/lib/utils'

const MYSTERY_CARD_ID = 'mystery-card'

interface ActiveTimelineDropzoneProps {
  timeline: TimelineData
  onPlaceCard: (insertIndex: number) => void
  disabled?: boolean
}

export function ActiveTimelineDropzone({
  timeline,
  onPlaceCard,
  disabled,
}: ActiveTimelineDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    const { over } = event

    if (over && !disabled) {
      // Parse the drop target index from the droppable ID
      const dropId = String(over.id)
      if (dropId.startsWith('drop-slot-')) {
        const insertIndex = parseInt(dropId.replace('drop-slot-', ''), 10)
        if (!isNaN(insertIndex)) {
          onPlaceCard(insertIndex)
        }
      }
    }
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Timeline drop target area */}
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Drag the mystery card to your timeline
          </p>
          <TimelineDropArea
            cards={timeline.cards}
            isDragging={isDragging}
            disabled={disabled}
          />
        </div>

        {/* Draggable mystery card */}
        <div className="flex justify-center">
          <DraggableMysteryCardWrapper disabled={disabled} />
        </div>
      </div>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {isDragging && <DraggableMysteryCard className="opacity-80" />}
      </DragOverlay>
    </DndContext>
  )
}

interface DraggableMysteryCardWrapperProps {
  disabled?: boolean
}

function DraggableMysteryCardWrapper({
  disabled,
}: DraggableMysteryCardWrapperProps) {
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
        'touch-none',
        isDragging && 'opacity-30',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <DraggableMysteryCard />
    </div>
  )
}

interface TimelineDropAreaProps {
  cards: TimelineData['cards']
  isDragging: boolean
  disabled?: boolean
}

function TimelineDropArea({ cards, isDragging, disabled }: TimelineDropAreaProps) {
  // If no cards, show a single drop zone for index 0
  if (cards.length === 0) {
    return (
      <div className="flex justify-center">
        <DropSlot index={0} isActive={isDragging} disabled={disabled} isEmpty />
      </div>
    )
  }

  // Render cards with drop slots between them
  return (
    <div className="-m-1 flex items-center gap-1 overflow-x-auto p-1">
      {/* Drop slot before first card */}
      <DropSlot index={0} isActive={isDragging} disabled={disabled} />

      {cards.map((card, cardIndex) => (
        <div key={card._id} className="flex items-center">
          <GameCard
            title={card.title}
            releaseYear={card.releaseYear}
            artistName={card.artistNames[0]}
            albumImageUrl={card.albumImageUrl}
            className="pointer-events-none"
          />
          {/* Drop slot after this card */}
          <DropSlot
            index={cardIndex + 1}
            isActive={isDragging}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  )
}

interface DropSlotProps {
  index: number
  isActive: boolean
  disabled?: boolean
  isEmpty?: boolean
}

function DropSlot({ index, isActive, disabled, isEmpty }: DropSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-slot-${index}`,
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200',
        isEmpty ? 'h-40 w-28' : 'h-40 w-4',
        isActive
          ? 'border-primary/50 bg-primary/5'
          : 'border-transparent bg-transparent',
        isOver && 'border-primary bg-primary/10 scale-105',
        !isActive && !isEmpty && 'w-2',
      )}
    >
      {isEmpty && isActive && (
        <span className="text-xs text-muted-foreground">Drop here</span>
      )}
    </div>
  )
}

