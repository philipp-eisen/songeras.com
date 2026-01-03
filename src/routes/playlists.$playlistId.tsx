import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  MusicNotesIcon,
  SpotifyLogoIcon,
  TrashIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { getPlaylistWithAllTracksQuery } from '@/lib/convex-queries'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/playlists/$playlistId')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getPlaylistWithAllTracksQuery(params.playlistId as Id<'playlists'>),
    )
  },
  component: PlaylistDetailPage,
})

function PlaylistDetailPage() {
  const { playlistId } = Route.useParams()
  const { data: playlist } = useSuspenseQuery(
    getPlaylistWithAllTracksQuery(playlistId as Id<'playlists'>),
  )

  if (!playlist) {
    return (
      <section className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Playlist Not Found</CardTitle>
            <CardDescription>
              This playlist doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link to="/playlists" />}>
              <ArrowLeftIcon weight="duotone" className="size-4" />
              Back to Playlists
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link to="/playlists" />}>
          <ArrowLeftIcon weight="duotone" className="size-5" />
        </Button>
        <div className="flex flex-1 items-center gap-4">
          {playlist.imageUrl ? (
            <img
              src={playlist.imageUrl}
              alt=""
              className="size-16 shrink-0 rounded-lg object-cover shadow-md"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted shadow-md">
              <MusicNotesIcon
                weight="duotone"
                className="size-8 text-muted-foreground"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{playlist.name}</h1>
            {playlist.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {playlist.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status summary */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Badge variant="outline" className="gap-1.5 text-sm">
            <MusicNotesIcon weight="duotone" className="size-4" />
            {playlist.totalTracks} total
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-sm text-primary">
            <CheckCircleIcon weight="duotone" className="size-4" />
            {playlist.readyTracks} playable
          </Badge>
          {playlist.unmatchedTracks > 0 && (
            <Badge variant="outline" className="gap-1.5 text-sm text-warning">
              <WarningIcon weight="duotone" className="size-4" />
              {playlist.unmatchedTracks} unmatched
            </Badge>
          )}
          {playlist.status === 'processing' && (
            <Badge variant="outline" className="gap-1.5 text-sm">
              <ClockIcon weight="duotone" className="size-4 animate-pulse" />
              Processing...
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Track list */}
      <Card>
        <CardHeader>
          <CardTitle>Tracks</CardTitle>
          <CardDescription>
            All tracks in this playlist. Playable tracks are matched to Apple
            Music for preview playback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {playlist.tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MusicNotesIcon
                weight="duotone"
                className="mb-4 size-12 text-muted-foreground/50"
              />
              <p className="text-muted-foreground">No tracks in this playlist</p>
            </div>
          ) : (
            <ul className="divide-y">
              {playlist.tracks.map((track) => (
                <TrackItem key={track._id} track={track} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

interface TrackData {
  _id: Id<'playlistTracks'>
  position: number
  status: 'pending' | 'ready' | 'unmatched'
  title: string
  artistNames: Array<string>
  releaseYear?: number
  previewUrl?: string
  imageUrl?: string
  spotifyTrackId?: string
  unmatchedReason?: string
}

function TrackItem({ track }: { track: TrackData }) {
  const [isRemoving, setIsRemoving] = useState(false)
  const removeTrack = useMutation(api.playlists.removeTrack)

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeTrack({ trackId: track._id })
    } catch (error) {
      console.error('Failed to remove track:', error)
      setIsRemoving(false)
    }
  }

  const isReady = track.status === 'ready'
  const isPending = track.status === 'pending'
  const isUnmatched = track.status === 'unmatched'

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {/* Track number */}
      <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
        {track.position + 1}
      </span>

      {/* Track artwork */}
      {track.imageUrl ? (
        <img
          src={track.imageUrl}
          alt=""
          className="size-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <MusicNotesIcon
            weight="duotone"
            className="size-5 text-muted-foreground"
          />
        </div>
      )}

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {track.artistNames.join(', ')}
        </p>
      </div>

      {/* Release year (if available) */}
      {track.releaseYear && (
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {track.releaseYear}
        </span>
      )}

      {/* Status badge */}
      {isReady && (
        <Badge variant="secondary" className="shrink-0 gap-1">
          <CheckCircleIcon weight="duotone" className="size-3 text-primary" />
          Matched
        </Badge>
      )}
      {isPending && (
        <Badge variant="outline" className="shrink-0 gap-1">
          <ClockIcon weight="duotone" className="size-3" />
          Pending
        </Badge>
      )}
      {isUnmatched && (
        <Badge variant="outline" className="shrink-0 gap-1 text-warning">
          <XCircleIcon weight="duotone" className="size-3" />
          Unmatched
        </Badge>
      )}

      {/* Spotify link */}
      {track.spotifyTrackId && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          render={
            <a
              href={`https://open.spotify.com/track/${track.spotifyTrackId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Spotify"
            />
          }
        >
          <SpotifyLogoIcon weight="duotone" className="size-4" />
        </Button>
      )}

      {/* Remove button */}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={isRemoving}
            />
          }
        >
          <TrashIcon weight="duotone" className="size-4" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove track?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{track.title}" by{' '}
              {track.artistNames.join(', ')} from this playlist? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              variant="destructive"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
