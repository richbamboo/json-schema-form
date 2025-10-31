import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('array basic generation', () => {
  it('should generate array with minItems and maxItems', () => {
    const schema = { type: 'array' as const, minItems: 2, maxItems: 5 }
    const result = generateFromSchema(schema, { seed: SEED })

    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBeGreaterThanOrEqual(2)
    expect((result as unknown[]).length).toBeLessThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate array with items schema', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'number' as const, minimum: 0, maximum: 10 },
      minItems: 3,
      maxItems: 3,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as number[]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
    result.forEach(item => {
      expect(typeof item).toBe('number')
      expect(item).toBeGreaterThanOrEqual(0)
      expect(item).toBeLessThanOrEqual(10)
    })
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate array with string items', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'string' as const, minLength: 2, maxLength: 5 },
      minItems: 2,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as string[]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
    result.forEach(item => {
      expect(typeof item).toBe('string')
      expect(item.length).toBeGreaterThanOrEqual(2)
      expect(item.length).toBeLessThanOrEqual(5)
    })
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate array with no items schema', () => {
    const schema = { type: 'array' as const, minItems: 2, maxItems: 4 }
    const result = generateFromSchema(schema, { seed: SEED })

    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBeGreaterThanOrEqual(2)
    expect((result as unknown[]).length).toBeLessThanOrEqual(4)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should be deterministic with same seed', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'number' as const },
      minItems: 3,
      maxItems: 3,
    }
    const result1 = generateFromSchema(schema, { seed: SEED }) as number[]
    const result2 = generateFromSchema(schema, { seed: SEED }) as number[]

    expect(result1).toEqual(result2)
  })

  it('should handle empty array (minItems: 0)', () => {
    const schema = { type: 'array' as const, minItems: 0, maxItems: 0 }
    const result = generateFromSchema(schema, { seed: SEED })

    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBe(0)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
