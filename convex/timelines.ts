import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

// ===========================================
// Helpers
// ===========================================

type TimelineCard = {
  _id: Id<'gameCards'>
  position: number
  title: string
  artistNames: Array<string>
  releaseYear: number
  imageUrl?: string
}

/**
 * Verify user has access to a game (is host or a player)
 */
async function verifyGameAccess(
  ctx: QueryCtx,
  gameId: Id<'games'>,
): Promise<{ identity: { subject: string }; game: Doc<'games'> } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const game = await ctx.db.get('games', gameId)
  if (!game) return null

  const isHost = game.hostUserId === identity.subject
  if (isHost) return { identity, game }

  const playerSeat = await ctx.db
    .query('gamePlayers')
    .withIndex('by_gameId_and_userId', (q) =>
      q.eq('gameId', gameId).eq('userId', identity.subject),
    )
    .first()

  if (!playerSeat) return null
  return { identity, game }
}

/**
 * Fetch card and track details for timeline entries
 */
async function fetchTimelineCards(
  ctx: QueryCtx,
  playerId: Id<'gamePlayers'>,
): Promise<Array<TimelineCard>> {
  const entries = await ctx.db
    .query('timelineEntries')
    .withIndex('by_playerId', (q) => q.eq('playerId', playerId))
    .collect()

  entries.sort((a, b) => a.position - b.position)

  const cards: Array<TimelineCard> = []
  for (const entry of entries) {
    const card = await ctx.db.get('gameCards', entry.cardId)
    if (!card) continue

    const track = await ctx.db.get('playlistTracks', card.trackId)
    if (!track) continue

    cards.push({
      _id: card._id,
      position: entry.position,
      title: track.title,
      artistNames: track.artistNames,
      releaseYear: track.releaseYear!,
      imageUrl: track.imageUrl,
    })
  }

  return cards
}

// ===========================================
// Timeline Queries
// ===========================================

/**
 * Get a single player's timeline with card details
 */
export const getPlayerTimeline = query({
  args: {
    playerId: v.id('gamePlayers'),
  },
  returns: v.union(
    v.object({
      playerId: v.id('gamePlayers'),
      displayName: v.string(),
      cards: v.array(
        v.object({
          _id: v.id('gameCards'),
          position: v.number(),
          title: v.string(),
          artistNames: v.array(v.string()),
          releaseYear: v.number(),
          imageUrl: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const player = await ctx.db.get('gamePlayers', args.playerId)
    if (!player) return null

    // Verify access to this game
    const game = await ctx.db.get('games', player.gameId)
    if (!game) return null

    const isHost = game.hostUserId === identity.subject
    const isRequestedPlayer =
      player.kind === 'user' && player.userId === identity.subject

    // Check if caller is in this game
    if (!isHost && !isRequestedPlayer) {
      const callerSeat = await ctx.db
        .query('gamePlayers')
        .withIndex('by_gameId_and_userId', (q) =>
          q.eq('gameId', player.gameId).eq('userId', identity.subject),
        )
        .first()

      if (!callerSeat) return null
    }

    const cards = await fetchTimelineCards(ctx, args.playerId)

    return {
      playerId: player._id,
      displayName: player.displayName,
      cards,
    }
  },
})

/**
 * Get all player timelines for a game
 */
export const getAllTimelines = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.array(
      v.object({
        playerId: v.id('gamePlayers'),
        displayName: v.string(),
        seatIndex: v.number(),
        tokenBalance: v.number(),
        isCurrentUser: v.boolean(),
        cards: v.array(
          v.object({
            _id: v.id('gameCards'),
            position: v.number(),
            title: v.string(),
            artistNames: v.array(v.string()),
            releaseYear: v.number(),
            imageUrl: v.optional(v.string()),
          }),
        ),
      }),
    ),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const game = await ctx.db.get('games', args.gameId)
    if (!game) return null

    // Get all players and verify access
    const allPlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_gameId', (q) => q.eq('gameId', args.gameId))
      .collect()

    const isHost = game.hostUserId === identity.subject
    const isPlayer = allPlayers.some(
      (p) => p.kind === 'user' && p.userId === identity.subject,
    )

    if (!isHost && !isPlayer) return null

    // Sort players by seat index and build result
    allPlayers.sort((a, b) => a.seatIndex - b.seatIndex)

    const result = await Promise.all(
      allPlayers.map(async (player) => ({
        playerId: player._id,
        displayName: player.displayName,
        seatIndex: player.seatIndex,
        tokenBalance: player.tokenBalance,
        isCurrentUser:
          player.kind === 'user' && player.userId === identity.subject,
        cards: await fetchTimelineCards(ctx, player._id),
      })),
    )

    return result
  },
})

/**
 * Get the current round's song preview for playback
 * Available during awaitingPlacement, awaitingReveal phases (for active player to listen)
 * Does NOT reveal title/artist/year until revealed phase
 */
export const getCurrentRoundSongPreview = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.object({
      previewUrl: v.optional(v.string()),
      appleMusicId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const access = await verifyGameAccess(ctx, args.gameId)
    if (!access) return null

    const { game } = access

    // Available during placement and reveal phases
    if (
      game.phase !== 'awaitingPlacement' &&
      game.phase !== 'awaitingReveal' &&
      game.phase !== 'revealed'
    ) {
      return null
    }

    if (!game.currentRound) return null

    const card = await ctx.db.get('gameCards', game.currentRound.cardId)
    if (!card) return null

    const track = await ctx.db.get('playlistTracks', card.trackId)
    if (!track) return null

    return {
      previewUrl: track.previewUrl,
      appleMusicId: track.appleMusicId,
    }
  },
})

/**
 * Get the current round's card info (only available after reveal)
 * Includes artwork and preview URL, plus Spotify track ID for "Open in Spotify" link
 */
export const getCurrentRoundCard = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.object({
      _id: v.id('gameCards'),
      title: v.string(),
      artistNames: v.array(v.string()),
      releaseYear: v.number(),
      imageUrl: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
      spotifyTrackId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const access = await verifyGameAccess(ctx, args.gameId)
    if (!access) return null

    const { game } = access

    // Only show card after reveal
    if (game.phase !== 'revealed') return null
    if (!game.currentRound) return null

    const card = await ctx.db.get('gameCards', game.currentRound.cardId)
    if (!card) return null

    const track = await ctx.db.get('playlistTracks', card.trackId)
    if (!track) return null

    return {
      _id: card._id,
      title: track.title,
      artistNames: track.artistNames,
      releaseYear: track.releaseYear!,
      imageUrl: track.imageUrl,
      previewUrl: track.previewUrl,
      spotifyTrackId: track.spotifyTrackId,
    }
  },
})
