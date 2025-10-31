import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('array advanced generation', () => {
  it('should generate array with prefixItems (tuple)', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [
        { type: 'string' as const },
        { type: 'number' as const },
        { type: 'boolean' as const },
      ],
      minItems: 3,
      maxItems: 3,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as [string, number, boolean]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
    expect(typeof result[0]).toBe('string')
    expect(typeof result[1]).toBe('number')
    expect(typeof result[2]).toBe('boolean')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate array with prefixItems and items', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [
        { type: 'string' as const },
        { type: 'number' as const },
      ],
      items: { type: 'boolean' as const },
      minItems: 4,
      maxItems: 4,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as [string, number, boolean, boolean]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(4)
    expect(typeof result[0]).toBe('string')
    expect(typeof result[1]).toBe('number')
    expect(typeof result[2]).toBe('boolean')
    expect(typeof result[3]).toBe('boolean')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate array with uniqueItems (via retry loop)', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'number' as const, minimum: 0, maximum: 100 },
      uniqueItems: true,
      minItems: 3,
      maxItems: 3,
    }
    const result = generateFromSchema(schema, { seed: SEED, maxAttempts: 50 }) as number[]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
    
    // Generator doesn't enforce uniqueItems, but retry loop + validator will
    // eventually produce a valid array (large value range helps)
    const errors = validateSchema(result, schema)
    expect(errors).toEqual([])
    
    // Verify uniqueness
    const unique = new Set(result)
    expect(unique.size).toBe(3)
  })

  it('should handle nested arrays', () => {
    const schema = {
      type: 'array' as const,
      items: {
        type: 'array' as const,
        items: { type: 'number' as const },
        minItems: 2,
        maxItems: 2,
      },
      minItems: 2,
      maxItems: 2,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as number[][]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
    result.forEach(subArray => {
      expect(Array.isArray(subArray)).toBe(true)
      expect(subArray.length).toBe(2)
      subArray.forEach(item => {
        expect(typeof item).toBe('number')
      })
    })
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle array with mixed types', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [
        { type: 'string' as const, format: 'email' as const },
        { type: 'integer' as const, minimum: 1, maximum: 100 },
        { type: 'array' as const, items: { type: 'string' as const }, minItems: 1, maxItems: 2 },
      ],
      minItems: 3,
      maxItems: 3,
    }
    const result = generateFromSchema(schema, { seed: SEED }) as [string, number, string[]]

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
    expect(typeof result[0]).toBe('string')
    expect(result[0]).toContain('@')
    expect(typeof result[1]).toBe('number')
    expect(Number.isInteger(result[1])).toBe(true)
    expect(Array.isArray(result[2])).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
