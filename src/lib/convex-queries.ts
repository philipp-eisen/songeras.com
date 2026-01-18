import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// ===========================================
// Playlist queries
// ===========================================

export const listMyPlaylistsQuery = () =>
  convexQuery(api.playlists.listMine, {})

export const getPlaylistWithAllTracksQuery = (playlistId: Id<'playlists'>) =>
  convexQuery(api.playlists.get, { playlistId, includeAllTracks: true })

// ===========================================
// Game queries
// ===========================================

export const listMyGamesQuery = () => convexQuery(api.games.listMine, {})

export const getGameByJoinCodeQuery = (joinCode: string) =>
  convexQuery(api.games.getByJoinCode, { joinCode })

// ===========================================
// Timeline queries
// ===========================================

export const getAllTimelinesQuery = (gameId: Id<'games'>) =>
  convexQuery(api.timelines.getAllTimelines, { gameId })

export const getCurrentRoundCardQuery = (gameId: Id<'games'>) =>
  convexQuery(api.timelines.getCurrentRoundCard, { gameId })

export const getCurrentRoundSongPreviewQuery = (gameId: Id<'games'>) =>
  convexQuery(api.timelines.getCurrentRoundSongPreview, { gameId })
