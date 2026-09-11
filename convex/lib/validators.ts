import { v } from 'convex/values'

export const trackSnapshotValidator = v.object({
  title: v.string(),
  artistNames: v.array(v.string()),
  imageUrl: v.optional(v.string()),
  previewUrl: v.optional(v.string()),
  appleMusicId: v.optional(v.string()),
  spotifyTrackId: v.optional(v.string()),
})

// Game phases for the state machine
export const gamePhaseValidator = v.union(
  v.literal('lobby'),
  v.literal('awaitingPlacement'),
  v.literal('awaitingReveal'),
  v.literal('revealed'),
  v.literal('finished'),
)

// Game modes
export const gameModeValidator = v.union(
  v.literal('hostOnly'),
  v.literal('sidecars'),
)

// Card states in the deck
export const cardStateValidator = v.union(
  v.literal('deck'), // In the draw pile
  v.literal('inRound'), // Currently being played this round
  v.literal('timeline'), // Placed in a player's timeline
  v.literal('discarded'), // Removed from play
)

// Player seat types
export const playerKindValidator = v.union(
  v.literal('local'), // Host-controlled local seat
  v.literal('user'), // Authenticated user (Google or guest)
)

// Bet record for current round
export const betValidator = v.object({
  bettorPlayerId: v.id('gamePlayers'),
  slotIndex: v.number(), // Where the bettor thinks the card should go
  timestamp: v.number(), // For resolving ties (earliest wins)
})

// Current round state stored on the game
export const currentRoundValidator = v.object({
  cardId: v.id('gameCards'),
  activePlayerId: v.id('gamePlayers'),
  placementIndex: v.optional(v.number()), // Where the active player placed the card
  bets: v.array(betValidator),
  tokenClaimers: v.array(v.id('gamePlayers')), // Players who claimed a guess token this round
})

// Playlist source provider
export const playlistSourceValidator = v.union(
  v.literal('spotify'),
  v.literal('appleMusic'),
)

// Playlist processing status
export const playlistStatusValidator = v.union(
  v.literal('importing'), // Initial import in progress
  v.literal('processing'), // Matching tracks to Apple Music
  v.literal('ready'), // All tracks processed, ready for games
  v.literal('failed'), // Import or processing failed
)

// Track processing status
export const trackStatusValidator = v.union(
  v.literal('pending'), // Imported from Spotify, needs Apple match
  v.literal('ready'), // Matched to Apple Music, playable
  v.literal('unmatched'), // Couldn't be matched, excluded from games
)
