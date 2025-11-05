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

  it('should throw when picking from empty array', () => {
    const rng = new SeededRandom(SEED)
    expect(() => rng.pick([])).toThrow('Cannot pick from empty array')
  })

  it('should throw when min > max in integer()', () => {
    const rng = new SeededRandom(SEED)
    expect(() => rng.integer(10, 5)).toThrow('min must be <= max')
  })

  it('should throw when integer() receives non-integer values', () => {
    const rng = new SeededRandom(SEED)
    expect(() => rng.integer(1.5, 10)).toThrow('min and max must be integers')
    expect(() => rng.integer(1, 10.5)).toThrow('min and max must be integers')
  })

  it('should throw when integer() receives non-finite values', () => {
    const rng = new SeededRandom(SEED)
    expect(() => rng.integer(NaN, 10)).toThrow('min and max must be finite numbers')
    expect(() => rng.integer(1, Infinity)).toThrow('min and max must be finite numbers')
  })

  it('should handle single-element range in integer()', () => {
    const rng = new SeededRandom(SEED)
    expect(rng.integer(5, 5)).toBe(5)
  })

  it('should handle empty array in shuffle()', () => {
    const rng = new SeededRandom(SEED)
    const arr: number[] = []
    expect(rng.shuffle(arr)).toEqual([])
  })

  it('should handle single-element array in shuffle()', () => {
    const rng = new SeededRandom(SEED)
    const arr = [42]
    expect(rng.shuffle(arr)).toEqual([42])
  })

  it('should accept string seeds', () => {
    const rng1 = new SeededRandom('test-seed')
    const rng2 = new SeededRandom('test-seed')
    expect(rng1.random()).toBe(rng2.random())
  })

  it('should produce different results for different string seeds', () => {
    const rng1 = new SeededRandom('seed1')
    const rng2 = new SeededRandom('seed2')
    expect(rng1.random()).not.toBe(rng2.random())
  })

  it('should handle very large ranges (with potential precision loss)', () => {
    const rng = new SeededRandom(SEED)
    // This may have slight precision loss but should not throw
    const val = rng.integer(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    expect(Number.isInteger(val)).toBe(true)
    expect(val).toBeGreaterThanOrEqual(Number.MIN_SAFE_INTEGER)
    expect(val).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  })

  it('should handle negative ranges correctly', () => {
    const rng = new SeededRandom(SEED)
    for (let i = 0; i < 100; i++) {
      const val = rng.integer(-10, -5)
      expect(val).toBeGreaterThanOrEqual(-10)
      expect(val).toBeLessThanOrEqual(-5)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('should handle ranges crossing zero', () => {
    const rng = new SeededRandom(SEED)
    for (let i = 0; i < 100; i++) {
      const val = rng.integer(-5, 5)
      expect(val).toBeGreaterThanOrEqual(-5)
      expect(val).toBeLessThanOrEqual(5)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('should throw when constructing with empty string seed', () => {
    expect(() => new SeededRandom('')).toThrow('seed cannot be an empty string')
  })

  it('should handle zero as seed', () => {
    const rng1 = new SeededRandom(0)
    const rng2 = new SeededRandom(0)
    expect(rng1.random()).toBe(rng2.random())
  })

  it('should handle negative number seeds', () => {
    const rng1 = new SeededRandom(-42)
    const rng2 = new SeededRandom(-42)
    expect(rng1.random()).toBe(rng2.random())
  })

  it('should throw when constructing with NaN seed', () => {
    expect(() => new SeededRandom(NaN)).toThrow('seed must be a finite number')
  })

  it('should throw when constructing with Infinity seed', () => {
    expect(() => new SeededRandom(Infinity)).toThrow('seed must be a finite number')
    expect(() => new SeededRandom(-Infinity)).toThrow('seed must be a finite number')
  })

  it('should produce consistent distribution for boolean()', () => {
    const rng = new SeededRandom(SEED)
    const results = []
    for (let i = 0; i < 1000; i++) {
      results.push(rng.boolean())
    }
    const trueCount = results.filter(x => x).length
    const falseCount = results.filter(x => !x).length
    
    // Should be roughly 50/50 (allow some variance)
    expect(trueCount).toBeGreaterThan(400)
    expect(trueCount).toBeLessThan(600)
    expect(falseCount).toBeGreaterThan(400)
    expect(falseCount).toBeLessThan(600)
  })
})
