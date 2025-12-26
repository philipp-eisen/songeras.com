'use node'

import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

// ===========================================
// Types for Spotify API responses
// ===========================================

interface SpotifyArtist {
  name: string
}

interface SpotifyAlbum {
  name: string
  release_date: string // YYYY or YYYY-MM or YYYY-MM-DD
  images: Array<{ url: string; width: number; height: number }>
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<SpotifyArtist>
  album: SpotifyAlbum
  preview_url: string | null
  uri: string
}

interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null
}

interface SpotifyPlaylistTracksResponse {
  items: Array<SpotifyPlaylistTrackItem>
  next: string | null
  total: number
}

interface SpotifyPlaylistResponse {
  id: string
  name: string
  description: string | null
  images: Array<{ url: string }>
  tracks: {
    total: number
  }
  snapshot_id: string
}

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

// ===========================================
// Helper functions
// ===========================================

/**
 * Extract release year from Spotify's release_date string
 * Handles: "YYYY", "YYYY-MM", "YYYY-MM-DD"
 */
function extractReleaseYear(releaseDate: string): number {
  const year = parseInt(releaseDate.substring(0, 4), 10)
  return isNaN(year) ? 2000 : year // Fallback to 2000 if parsing fails
}

/**
 * Parse a Spotify playlist URL/ID to extract just the playlist ID
 * Handles:
 * - "spotify:playlist:xxxxx"
 * - "https://open.spotify.com/playlist/xxxxx"
 * - "https://open.spotify.com/playlist/xxxxx?si=yyyyy"
 * - "xxxxx" (raw ID)
 */
function parseSpotifyPlaylistId(input: string): string {
  // URI format
  if (input.startsWith('spotify:playlist:')) {
    return input.replace('spotify:playlist:', '')
  }

  // URL format
  const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)/)
  if (urlMatch) {
    return urlMatch[1]
  }

  // Assume it's already just the ID
  return input
}

/**
 * Refresh Spotify access token using the refresh token
 */
async function refreshSpotifyToken(
  refreshToken: string,
): Promise<SpotifyTokenResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify client credentials in environment')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to refresh Spotify token: ${response.status} ${errorText}`,
    )
  }

  return response.json()
}

/**
 * Fetch playlist metadata from Spotify API
 */
async function fetchPlaylistMetadata(
  accessToken: string,
  playlistId: string,
): Promise<SpotifyPlaylistResponse> {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,images,tracks(total),snapshot_id`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch playlist: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Fetch all tracks from a Spotify playlist (handles pagination)
 */
async function fetchAllPlaylistTracks(
  accessToken: string,
  playlistId: string,
): Promise<Array<SpotifyTrack>> {
  const tracks: Array<SpotifyTrack> = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(name),album(name,release_date,images),preview_url,uri)),next,total&limit=100`

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch tracks: ${response.status} ${errorText}`)
    }

    const data: SpotifyPlaylistTracksResponse = await response.json()

    for (const item of data.items) {
      // Skip null tracks (can happen with local files or unavailable tracks)
      if (item.track && item.track.id) {
        tracks.push(item.track)
      }
    }

    url = data.next
  }

  return tracks
}

// ===========================================
// Public action: Import Spotify Playlist
// ===========================================

export const importSpotifyPlaylist = action({
  args: {
    playlistUrlOrId: v.string(),
  },
  returns: v.object({
    playlistId: v.id('spotifyPlaylists'),
    trackCount: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ playlistId: Id<'spotifyPlaylists'>; trackCount: number }> => {
    // Get the current user
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const userId = identity.subject

    // Get the Spotify account tokens
    const account = await ctx.runQuery(
      internal.spotifyInternal.getSpotifyAccount,
      { userId },
    )
    if (!account || !account.accessToken || !account.refreshToken) {
      throw new Error('No Spotify account linked. Please sign in with Spotify.')
    }

    let accessToken = account.accessToken

    // Check if token is expired and refresh if needed
    const now = Date.now()
    if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < now) {
      console.log('Spotify token expired, refreshing...')
      const newTokens = await refreshSpotifyToken(account.refreshToken)

      accessToken = newTokens.access_token
      const expiresAt = now + newTokens.expires_in * 1000

      // Update stored tokens
      await ctx.runMutation(internal.spotifyInternal.updateSpotifyTokens, {
        userId,
        accessToken: newTokens.access_token,
        accessTokenExpiresAt: expiresAt,
        refreshToken: newTokens.refresh_token,
      })
    }

    // Parse the playlist ID from the input
    const spotifyPlaylistId = parseSpotifyPlaylistId(args.playlistUrlOrId)

    // Fetch playlist metadata
    const playlistMeta = await fetchPlaylistMetadata(
      accessToken,
      spotifyPlaylistId,
    )

    // Fetch all tracks
    const tracks = await fetchAllPlaylistTracks(accessToken, spotifyPlaylistId)

    // Upsert the playlist
    const playlistId = await ctx.runMutation(
      internal.spotifyInternal.upsertPlaylist,
      {
        ownerUserId: userId,
        spotifyPlaylistId: playlistMeta.id,
        name: playlistMeta.name,
        description: playlistMeta.description ?? undefined,
        imageUrl: playlistMeta.images[0]?.url,
        trackCount: tracks.length,
        snapshotId: playlistMeta.snapshot_id,
      },
    )

    // Upsert each song and create playlist mappings
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]

      const songId = await ctx.runMutation(
        internal.spotifyInternal.upsertSong,
        {
          spotifyTrackId: track.id,
          title: track.name,
          artistNames: track.artists.map((a) => a.name),
          releaseYear: extractReleaseYear(track.album.release_date),
          previewUrl: track.preview_url ?? undefined,
          spotifyUri: track.uri,
          albumName: track.album.name,
          albumImageUrl: track.album.images[0]?.url,
        },
      )

      await ctx.runMutation(internal.spotifyInternal.addPlaylistSong, {
        playlistId,
        songId,
        position: i,
      })
    }

    return {
      playlistId,
      trackCount: tracks.length,
    }
  },
})
