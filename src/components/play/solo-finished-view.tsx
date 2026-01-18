import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import {
  ArrowClockwiseIcon,
  HouseIcon,
  TrophyIcon,
} from '@phosphor-icons/react'

import { api } from '../../../convex/_generated/api'
import { GameCard } from './game-card'
import { LivesDisplay } from './lives-display'
import type { GameData } from './types'
import { getAllTimelinesQuery } from '@/lib/convex-queries'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SoloFinishedViewProps {
  game: GameData
}

export function SoloFinishedView({ game }: SoloFinishedViewProps) {
  const navigate = useNavigate()
  const { data: timelines } = useSuspenseQuery(getAllTimelinesQuery(game._id))
  const timeline = timelines?.[0]

  const createGame = useMutation(api.games.create)
  const [replaying, setReplaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlayAgain = async () => {
    setReplaying(true)
    setError(null)
    try {
      const result = await createGame({
        playlistId: game.playlistId,
        mode: 'solo',
      })
      navigate({ to: '/play/$joinCode', params: { joinCode: result.joinCode } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
      setReplaying(false)
    }
  }

  const finalScore = game.finalScore ?? timeline?.cards.length ?? 0

  return (
    <div className="space-y-6 p-4">
      {/* Score Card */}
      <Card className="border-2 border-primary text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <TrophyIcon weight="duotone" className="size-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Game Over!</CardTitle>
          <CardDescription className="text-lg">
            {(game.lives ?? 0) === 0
              ? 'You ran out of lives'
              : 'No more songs in the deck'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Final Score */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Final Score</p>
            <p className="text-5xl font-bold text-primary">{finalScore}</p>
            <p className="text-sm text-muted-foreground">songs placed</p>
          </div>

          {/* Lives remaining (if deck ran out) */}
          {(game.lives ?? 0) > 0 && (
            <div className="flex justify-center">
              <LivesDisplay
                current={game.lives ?? 0}
                max={game.startingLives ?? 3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handlePlayAgain}
          disabled={replaying}
          className="flex-1"
          size="lg"
        >
          <ArrowClockwiseIcon weight="duotone" className="mr-2 size-5" />
          {replaying ? 'Starting...' : 'Play Again'}
        </Button>
        <Button variant="outline" size="lg" render={<Link to="/" />}>
          <HouseIcon weight="duotone" className="mr-2 size-5" />
          Home
        </Button>
      </div>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {/* Final Timeline */}
      {timeline && timeline.cards.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Your Timeline</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="-m-1 flex gap-2 overflow-x-auto p-1">
              {timeline.cards.map((card) => (
                <GameCard
                  key={card._id}
                  title={card.title}
                  artistName={card.artistNames[0]}
                  imageUrl={card.imageUrl}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
