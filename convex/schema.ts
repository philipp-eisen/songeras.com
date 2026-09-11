import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  cardStateValidator,
  currentRoundValidator,
  gameModeValidator,
  gamePhaseValidator,
  playerKindValidator,
  playlistSourceValidator,
  playlistStatusValidator,
  trackSnapshotValidator,
  trackStatusValidator,
} from './lib/validators'

export default defineSchema({
  // ============================================
  // Playlist Tables (provider-agnostic)
  // ============================================

  // User-owned playlists, imported from any supported provider
  playlists: defineTable({
    ownerUserId: v.string(), // Better Auth user ID
    source: playlistSourceValidator, // Where the playlist came from
    sourcePlaylistId: v.string(), // ID from the source provider
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    importedAt: v.number(),

    // Processing status
    status: playlistStatusValidator,
    totalTracks: v.number(), // Total tracks imported
    readyTracks: v.number(), // Tracks ready to play
    unmatchedTracks: v.number(), // Tracks that couldn't be matched
  })
    .index('by_ownerUserId', ['ownerUserId'])
    .index('by_ownerUserId_and_sourcePlaylistId', [
      'ownerUserId',
      'sourcePlaylistId',
    ])
    .index('by_ownerUserId_and_source_and_sourcePlaylistId', [
      'ownerUserId',
      'source',
      'sourcePlaylistId',
    ]),

  // Tracks belonging to a playlist (one playlist owns each track)
  playlistTracks: defineTable({
    playlistId: v.id('playlists'),
    position: v.number(), // Order in the playlist

    // Processing status
    status: trackStatusValidator,

    // Core metadata (always set on import)
    title: v.string(),
    artistNames: v.array(v.string()),

    // Set when status is 'ready'
    releaseYear: v.optional(v.number()),
    previewUrl: v.optional(v.string()), // Apple Music 30s preview
    imageUrl: v.optional(v.string()), // Artwork URL

    // Provider IDs for matching and linking
    appleMusicId: v.optional(v.string()), // Apple Music catalog ID
    spotifyTrackId: v.optional(v.string()), // For "Open in Spotify" links
    isrc: v.optional(v.string()), // International Standard Recording Code

    // Set when status is 'unmatched'
    unmatchedReason: v.optional(v.string()),
  })
    .index('by_playlistId', ['playlistId'])
    .index('by_playlistId_and_position', ['playlistId', 'position'])
    .index('by_playlistId_and_status', ['playlistId', 'status']),

  // ============================================
  // Game Engine Tables
  // ============================================

  // Game sessions (lobby + in-progress)
  games: defineTable({
    // Ownership
    hostUserId: v.string(), // Better Auth user ID of the host

    // Game configuration
    joinCode: v.string(), // 6-char code for joining
    mode: gameModeValidator,
    playlistId: v.id('playlists'),

    // Game options
    useTokens: v.boolean(), // Whether HITSTER tokens are enabled
    startingTokens: v.number(), // Tokens each player starts with (default 2)
    maxTokens: v.number(), // Max tokens a player can hold (default 5)
    winCondition: v.number(), // Timeline cards needed to win (default 10)

    // Game state
    phase: gamePhaseValidator,
    currentTurnSeatIndex: v.number(), // Which seat is active (0-indexed)
    currentRound: v.optional(currentRoundValidator),
    winnerId: v.optional(v.id('gamePlayers')), // Set when game is finished

    // Metadata
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index('by_joinCode', ['joinCode'])
    .index('by_hostUserId', ['hostUserId'])
    .index('by_hostUserId_and_phase', ['hostUserId', 'phase']),

  // Player seats in a game
  gamePlayers: defineTable({
    gameId: v.id('games'),
    seatIndex: v.number(), // 0-indexed seat position (turn order)
    displayName: v.string(),
    kind: playerKindValidator,
    userId: v.optional(v.string()), // Better Auth user ID (for kind: "user")
    tokenBalance: v.number(),
    isHostSeat: v.boolean(), // First seat is always the host's
  })
    .index('by_gameId', ['gameId'])
    .index('by_gameId_and_seatIndex', ['gameId', 'seatIndex'])
    .index('by_gameId_and_userId', ['gameId', 'userId'])
    .index('by_userId', ['userId']),

  // Card instances for a game (materialized from playlist tracks)
  gameCards: defineTable({
    gameId: v.id('games'),
    trackId: v.id('playlistTracks'), // Reference to the playlist track
    trackSnapshot: v.optional(trackSnapshotValidator),
    releaseYear: v.number(), // Denormalized for fast validation
    state: cardStateValidator,
    ownerPlayerId: v.optional(v.id('gamePlayers')), // Set when in timeline
    deckOrder: v.optional(v.number()), // Order in draw pile (for deterministic shuffling)
  })
    .index('by_gameId', ['gameId'])
    .index('by_gameId_and_state', ['gameId', 'state'])
    .index('by_trackId', ['trackId'])
    .index('by_gameId_and_state_and_deckOrder', [
      'gameId',
      'state',
      'deckOrder',
    ])
    .index('by_gameId_and_ownerPlayerId', ['gameId', 'ownerPlayerId']),

  // Timeline entries: ordered cards in a player's timeline
  timelineEntries: defineTable({
    gameId: v.id('games'),
    playerId: v.id('gamePlayers'),
    cardId: v.id('gameCards'),
    position: v.number(), // 0-indexed position in the timeline
  })
    .index('by_playerId', ['playerId'])
    .index('by_playerId_and_position', ['playerId', 'position'])
    .index('by_cardId', ['cardId']),
})
