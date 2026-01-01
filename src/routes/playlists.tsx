import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { useState } from 'react'
import {
  AppleLogo,
  ArrowsClockwise,
  CheckCircle,
  MusicNotes,
  Playlist,
  Plus,
  SpotifyLogo,
  Warning,
} from '@phosphor-icons/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { listMyPlaylistsQuery } from '@/lib/convex-queries'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export const Route = createFileRoute('/playlists')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(listMyPlaylistsQuery())
  },
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const { data: session } = authClient.useSession()
  const { data: playlists } = useSuspenseQuery(listMyPlaylistsQuery())

  const isGuest = session?.user.email.includes('guest.songgame.local')

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Playlist weight="duotone" className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Playlists</h1>
          <p className="text-muted-foreground">
            Import Spotify playlists to use in your games
          </p>
        </div>
      </header>

      {isGuest ? (
        <GuestUpgradeCTA />
      ) : (
        <>
          <ImportPlaylistCard />
          <PlaylistsList playlists={playlists} />
        </>
      )}
    </section>
  )
}

function GuestUpgradeCTA() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-lg">
          Connect Spotify to Import Playlists
        </CardTitle>
        <CardDescription>
          Sign in with your Spotify account to import playlists and create games
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => authClient.signIn.social({ provider: 'spotify' })}
          className="bg-spotify text-spotify-foreground hover:bg-spotify/90"
        >
          <SpotifyLogo weight="fill" className="mr-2 h-4 w-4" />
          Connect Spotify
        </Button>
      </CardContent>
    </Card>
  )
}

function ImportPlaylistCard() {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const importPlaylist = useAction(api.spotify.importSpotifyPlaylist)

  const handleImport = async () => {
    if (!playlistUrl.trim()) return

    setError(null)
    setSuccess(null)
    setImporting(true)

    try {
      const result = await importPlaylist({
        playlistUrlOrId: playlistUrl.trim(),
      })
      setSuccess(`Imported ${result.trackCount} tracks!`)
      setPlaylistUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import playlist')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus weight="bold" className="size-5" />
          Import Playlist
        </CardTitle>
        <CardDescription>
          Paste a Spotify playlist URL or ID to import it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleImport()
          }}
        >
          <Input
            placeholder="https://open.spotify.com/playlist/... or playlist ID"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={importing || !playlistUrl.trim()}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-success" role="status">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface PlaylistData {
  _id: string
  name: string
  trackCount: number
  imageUrl?: string
  resolutionStatus?: 'pending' | 'inProgress' | 'completed' | 'failed' | null
  matchedTracks?: number | null
  unmatchedTracks?: number | null
}

interface PlaylistsListProps {
  playlists: Array<PlaylistData>
}

function PlaylistsList({ playlists }: PlaylistsListProps) {
  if (playlists.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MusicNotes
            weight="duotone"
            className="mb-4 size-16 text-muted-foreground/50"
          />
          <CardTitle className="mb-2 text-lg">No playlists yet</CardTitle>
          <CardDescription className="text-center">
            Import a Spotify playlist to get started creating games.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Playlists</CardTitle>
        <CardDescription>
          {playlists.length} playlist{playlists.length !== 1 && 's'} imported
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {playlists.map((playlist) => (
            <PlaylistItem key={playlist._id} playlist={playlist} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function PlaylistItem({ playlist }: { playlist: PlaylistData }) {
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    matchedTracks: number
    unmatchedTracks: number
  } | null>(null)

  const resolvePlaylist = useAction(
    api.playlistImport.resolvePlaylistToAppleMusic,
  )

  const handleResolve = async () => {
    setError(null)
    setResolving(true)

    try {
      const res = await resolvePlaylist({
        playlistId: playlist._id as Id<'spotifyPlaylists'>,
      })
      setResult({
        matchedTracks: res.matchedTracks,
        unmatchedTracks: res.unmatchedTracks,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to resolve playlist',
      )
    } finally {
      setResolving(false)
    }
  }

  // Determine current resolution state
  const isResolved =
    playlist.resolutionStatus === 'completed' ||
    (result && result.matchedTracks > 0)
  const matchedCount = result?.matchedTracks ?? playlist.matchedTracks ?? 0
  const unmatchedCount =
    result?.unmatchedTracks ?? playlist.unmatchedTracks ?? 0
  const totalTracks = playlist.trackCount
  const matchPercentage =
    totalTracks > 0 ? (matchedCount / totalTracks) * 100 : 0

  return (
    <li className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-3">
        {playlist.imageUrl ? (
          <img
            src={playlist.imageUrl}
            alt=""
            className="size-12 rounded object-cover shrink-0"
          />
        ) : (
          <figure className="flex size-12 items-center justify-center rounded bg-muted shrink-0">
            <MusicNotes
              weight="duotone"
              className="size-6 text-muted-foreground"
            />
          </figure>
        )}
        <article className="flex-1 min-w-0">
          <p className="font-medium truncate">{playlist.name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{totalTracks} tracks</span>
            {isResolved && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <AppleLogo weight="fill" className="size-3" />
                  {matchedCount} matched
                </span>
              </>
            )}
          </div>
        </article>

        {/* Resolution Status Badge */}
        {isResolved ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <CheckCircle weight="fill" className="size-3 text-green-500" />
            Resolved
          </Badge>
        ) : resolving || playlist.resolutionStatus === 'inProgress' ? (
          <Badge variant="outline" className="shrink-0 gap-1">
            <ArrowsClockwise className="size-3 animate-spin" />
            Resolving...
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleResolve}
            disabled={resolving}
            className="shrink-0 gap-1.5"
          >
            <AppleLogo weight="fill" className="size-3.5" />
            Resolve
          </Button>
        )}
      </div>

      {/* Resolution Progress/Results */}
      {resolving && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Matching tracks to Apple Music...</span>
          </div>
          <Progress value={null} className="h-1" />
        </div>
      )}

      {isResolved && matchedCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Apple Music match rate
            </span>
            <span className="font-medium">
              {matchedCount}/{totalTracks} ({matchPercentage.toFixed(0)}%)
            </span>
          </div>
          <Progress value={matchPercentage} className="h-1" />
          {unmatchedCount > 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Warning weight="fill" className="size-3" />
              {unmatchedCount} track{unmatchedCount !== 1 && 's'} couldn't be
              matched
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
