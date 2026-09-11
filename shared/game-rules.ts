/**
 * Compute valid insertion indices for a card with the given year.
 * Returns all valid indices where the card can be placed.
 *
 * Rules:
 * - Timeline is sorted by release year (ascending)
 * - A card can go before any card with year >= its year
 * - A card can go after any card with year <= its year
 * - If years are equal, adjacent placement is valid
 */
export function computeValidInsertionIndices(
  timeline: ReadonlyArray<{ releaseYear: number }>,
  newCardYear: number,
): Array<number> {
  const validIndices: Array<number> = []

  // Check each possible insertion point (0 to timeline.length inclusive)
  for (let i = 0; i <= timeline.length; i++) {
    const yearBefore = i > 0 ? timeline[i - 1].releaseYear : -Infinity
    const yearAfter = i < timeline.length ? timeline[i].releaseYear : Infinity

    // Valid if: yearBefore <= newCardYear <= yearAfter
    if (yearBefore <= newCardYear && newCardYear <= yearAfter) {
      validIndices.push(i)
    }
  }

  return validIndices
}

/**
 * Check if a placement is correct for the given timeline and card year.
 *
 * @param timeline - Array of cards in the timeline (must be sorted by position)
 * @param placementIndex - Where the card was placed
 * @param cardYear - The release year of the placed card
 * @returns true if the placement is valid, false otherwise
 */
export function isPlacementCorrect(
  timeline: ReadonlyArray<{ releaseYear: number }>,
  placementIndex: number,
  cardYear: number,
): boolean {
  const validIndices = computeValidInsertionIndices(timeline, cardYear)
  return validIndices.includes(placementIndex)
}

/** Place purchased cards after existing cards from the same year. */
export function findCorrectInsertionIndex(
  timeline: ReadonlyArray<{ releaseYear: number }>,
  newCardYear: number,
): number {
  let low = 0
  let high = timeline.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (timeline[mid].releaseYear <= newCardYear) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

export function isValidSlotIndex(
  index: number,
  timelineLength: number,
): boolean {
  return Number.isInteger(index) && index >= 0 && index <= timelineLength
}
