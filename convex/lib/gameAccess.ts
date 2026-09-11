import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'

export async function requireIdentity(ctx: Pick<QueryCtx, 'auth'>) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  return identity
}

export async function requireGame(ctx: QueryCtx, gameId: Id<'games'>) {
  const game = await ctx.db.get('games', gameId)
  if (!game) throw new Error('Game not found')
  return game
}

export async function verifyGameAccess(ctx: QueryCtx, gameId: Id<'games'>) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const game = await ctx.db.get('games', gameId)
  if (!game) return null
  if (game.hostUserId === identity.subject) return { identity, game }

  const player = await ctx.db
    .query('gamePlayers')
    .withIndex('by_gameId_and_userId', (q) =>
      q.eq('gameId', gameId).eq('userId', identity.subject),
    )
    .unique()

  return player?.kind === 'user' ? { identity, game } : null
}

export async function verifyCanActForPlayer(
  ctx: Pick<QueryCtx, 'auth'>,
  game: Doc<'games'>,
  player: Doc<'gamePlayers'>,
): Promise<void> {
  const identity = await requireIdentity(ctx)
  if (player.gameId !== game._id) {
    throw new Error('Player does not belong to this game')
  }

  if (player.kind === 'user') {
    if (player.userId !== identity.subject) {
      throw new Error('You cannot act for this player')
    }
  } else if (game.hostUserId !== identity.subject) {
    throw new Error('Only the host can act for local players')
  }
}
