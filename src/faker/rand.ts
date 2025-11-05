import seedrandom from 'seedrandom'

/**
 * Seedable PRNG wrapper for deterministic generation.
 * Wraps seedrandom and provides common random utilities.
 */
export class SeededRandom {
  private rng: seedrandom.PRNG

  constructor(seed?: string | number) {
    if (seed !== undefined) {
      if (typeof seed === 'string' && seed.length === 0) {
        throw new Error('seed cannot be an empty string')
      }
      if (typeof seed === 'number' && !Number.isFinite(seed)) {
        throw new Error('seed must be a finite number')
      }
    }
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
   * @throws {Error} If min > max or if values are not finite integers
   */
  integer(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error(`min and max must be finite numbers, got min=${min}, max=${max}`)
    }
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error(`min and max must be integers, got min=${min}, max=${max}`)
    }
    if (min > max) {
      throw new Error(`min must be <= max, got min=${min}, max=${max}`)
    }
    
    // Note: For very large ranges (close to 2 * MAX_SAFE_INTEGER), there may be
    // slight precision loss, but this is acceptable for the use case
    const range = max - min
    return Math.floor(this.random() * (range + 1)) + min
  }

  /**
   * Generate a random boolean.
   */
  boolean(): boolean {
    return this.random() < 0.5
  }

  /**
   * Pick a random element from an array.
   * @throws {Error} If array is empty
   */
  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array')
    }
    return array[this.integer(0, array.length - 1)]
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm.
   * @param array - Array to shuffle (modified in place)
   * @returns The same array, shuffled
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.integer(0, i)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}
