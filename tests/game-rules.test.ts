import { describe, expect, it } from 'vitest'
import {
  computeValidInsertionIndices,
  findCorrectInsertionIndex,
  isPlacementCorrect,
  isValidSlotIndex,
} from '../shared/game-rules'

const timeline = [1980, 1990, 1990, 2000].map((releaseYear) => ({
  releaseYear,
}))

describe('timeline placement', () => {
  it.each([
    [1970, [0]],
    [1980, [0, 1]],
    [1985, [1]],
    [1990, [1, 2, 3]],
    [2000, [3, 4]],
    [2010, [4]],
  ])('accepts all valid slots for %s', (year, expected) => {
    expect(computeValidInsertionIndices(timeline, year)).toEqual(expected)
    expect(expected).toContain(findCorrectInsertionIndex(timeline, year))
  })

  it('accepts an empty timeline and inserts purchased cards after equal years', () => {
    expect(computeValidInsertionIndices([], 1990)).toEqual([0])
    expect(findCorrectInsertionIndex([], 1990)).toBe(0)
    expect(findCorrectInsertionIndex(timeline, 1990)).toBe(3)
  })

  it('rejects an incorrect placement', () => {
    expect(isPlacementCorrect(timeline, 4, 1985)).toBe(false)
    expect(isPlacementCorrect(timeline, 1, 1985)).toBe(true)
  })

  it.each([-1, 0.5, 5, NaN, Infinity, -Infinity])(
    'rejects invalid slot %s',
    (slot) => {
      expect(isValidSlotIndex(slot, timeline.length)).toBe(false)
    },
  )

  it('accepts the first and last slots', () => {
    expect(isValidSlotIndex(0, timeline.length)).toBe(true)
    expect(isValidSlotIndex(timeline.length, timeline.length)).toBe(true)
  })
})
