import type { Id } from '../convex/_generated/dataModel'
import type { GameData, TimelineData } from '../src/components/play/types'

export function createGameData(): GameData {
  const playerId = 'player' as Id<'gamePlayers'>
  return {
    _id: 'game' as Id<'games'>,
    hostUserId: 'host',
    isCurrentUserHost: true,
    joinCode: 'ABC123',
    mode: 'hostOnly',
    playlistId: 'playlist' as Id<'playlists'>,
    playlistName: 'Songs',
    useTokens: true,
    startingTokens: 2,
    maxTokens: 5,
    winCondition: 10,
    phase: 'awaitingPlacement',
    currentTurnSeatIndex: 0,
    createdAt: 1,
    winnerId: undefined,
    startedAt: 1,
    finishedAt: undefined,
    deckRemaining: 10,
    players: [
      {
        _id: playerId,
        seatIndex: 0,
        displayName: 'Host',
        kind: 'local',
        userId: undefined,
        tokenBalance: 2,
        isHostSeat: true,
        isCurrentUser: false,
      },
    ],
    currentRound: {
      cardId: 'round-card' as Id<'gameCards'>,
      activePlayerId: playerId,
      bets: [],
      tokenClaimers: [],
    },
  }
}

export function createTimelines(game: GameData): Array<TimelineData> {
  return [
    {
      playerId: game.players[0]._id,
      displayName: 'Host',
      seatIndex: 0,
      tokenBalance: 2,
      isCurrentUser: false,
      cards: [
        {
          _id: 'starting-card' as Id<'gameCards'>,
          position: 0,
          title: 'Song',
          artistNames: ['Artist'],
          releaseYear: 1990,
        },
      ],
    },
  ]
}
