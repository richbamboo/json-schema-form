import seedrandom from 'seedrandom'

/**
 * Seedable PRNG wrapper for deterministic generation.
 * Wraps seedrandom and provides common random utilities.
 */
export class SeededRandom {
  private rng: seedrandom.PRNG

  constructor(seed?: string | number) {
    this.rng = seedrandom(seed !== undefined ? String(seed) : undefined)
  }

  /**
   * Generate a random number in [0, 1).
   */
  random(): number {
    return this.rng()
  }

  /**
   * Generate a random integer in [min, max] (inclusive).
   */
  integer(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  /**
   * Generate a random boolean.
   */
  boolean(): boolean {
    return this.random() < 0.5
  }

  /**
   * Pick a random element from an array.
   */
  pick<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)]
  }

  /**
   * Shuffle an array in place using Fisher-Yates.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.integer(0, i)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}
