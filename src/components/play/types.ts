import type { api } from '../../../convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'

// Type for the game query result
export type GameData = NonNullable<FunctionReturnType<typeof api.games.get>>
export type PlayerData = GameData['players'][0]
export type TimelineData = NonNullable<
  FunctionReturnType<typeof api.timelines.getAllTimelines>
>[0]
export type CardData = NonNullable<
  FunctionReturnType<typeof api.timelines.getCurrentRoundCard>
>
