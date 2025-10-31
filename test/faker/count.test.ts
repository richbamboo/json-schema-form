import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('count parameter', () => {
  it('should generate multiple unique values with same base seed', () => {
    const schema = { type: 'string' as const, minLength: 5, maxLength: 10 }
    const results = generateFromSchema(schema, { seed: SEED, count: 3 }) as string[]

    expect(results).toHaveLength(3)

    // All values should be different (seeded uniquely per index)
    expect(new Set(results).size).toBe(3)

    // All values should be valid
    results.forEach(result => {
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  it('should be deterministic across multiple calls with same seed', () => {
    const schema = { type: 'string' as const, minLength: 5, maxLength: 10 }
    const results1 = generateFromSchema(schema, { seed: SEED, count: 3 }) as string[]
    const results2 = generateFromSchema(schema, { seed: SEED, count: 3 }) as string[]

    expect(results1).toEqual(results2)
  })

  it('should generate different values with different base seeds', () => {
    const schema = { type: 'string' as const }
    const results1 = generateFromSchema(schema, { seed: SEED, count: 2 }) as string[]
    const results2 = generateFromSchema(schema, { seed: SEED + 100, count: 2 }) as string[]

    expect(results1).not.toEqual(results2)
  })

  it('should work with count: 1 (returns single value not array)', () => {
    const schema = { type: 'string' as const }
    const result = generateFromSchema(schema, { seed: SEED, count: 1 })

    expect(typeof result).toBe('string')
    expect(Array.isArray(result)).toBe(false)
  })
})
