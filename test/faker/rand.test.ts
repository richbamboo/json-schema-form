import { describe, expect, it } from '@jest/globals'
import { SeededRandom } from '../../src/faker/rand'

const SEED = 42

describe('SeededRandom', () => {
  it('should produce deterministic results with same seed', () => {
    const rng1 = new SeededRandom(SEED)
    const rng2 = new SeededRandom(SEED)

    expect(rng1.random()).toBe(rng2.random())
    expect(rng1.integer(1, 100)).toBe(rng2.integer(1, 100))
    expect(rng1.boolean()).toBe(rng2.boolean())
  })

  it('should produce different results with different seeds', () => {
    const rng1 = new SeededRandom(SEED)
    const rng2 = new SeededRandom(SEED + 1)

    expect(rng1.random()).not.toBe(rng2.random())
  })

  it('should generate integers in range', () => {
    const rng = new SeededRandom(SEED)
    for (let i = 0; i < 100; i++) {
      const val = rng.integer(5, 10)
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(10)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('should pick from array', () => {
    const rng = new SeededRandom(SEED)
    const arr = ['a', 'b', 'c']
    const picked = rng.pick(arr)
    expect(arr).toContain(picked)
  })

  it('should shuffle array deterministically', () => {
    const rng1 = new SeededRandom(SEED)
    const rng2 = new SeededRandom(SEED)
    const arr1 = [1, 2, 3, 4, 5]
    const arr2 = [1, 2, 3, 4, 5]

    rng1.shuffle(arr1)
    rng2.shuffle(arr2)

    expect(arr1).toEqual(arr2)
    expect(arr1).not.toEqual([1, 2, 3, 4, 5]) // Should be shuffled
  })
})
