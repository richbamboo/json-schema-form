import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('number edge cases', () => {
  it('should handle exact value (min === max)', () => {
    const schema = { type: 'integer' as const, minimum: 42, maximum: 42 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBe(42)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle zero bounds', () => {
    const schema = { type: 'integer' as const, minimum: 0, maximum: 0 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBe(0)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle very small range', () => {
    const schema = { type: 'integer' as const, minimum: 5, maximum: 7 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThanOrEqual(5)
    expect(result).toBeLessThanOrEqual(7)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle large numbers', () => {
    const schema = { type: 'integer' as const, minimum: 1000000, maximum: 2000000 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThanOrEqual(1000000)
    expect(result).toBeLessThanOrEqual(2000000)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle fractional bounds', () => {
    const schema = { type: 'number' as const, minimum: 0.5, maximum: 1.5 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThanOrEqual(0.5)
    expect(result).toBeLessThanOrEqual(1.5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle multipleOf with tight bounds', () => {
    const schema = { type: 'integer' as const, multipleOf: 10, minimum: 20, maximum: 30 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result % 10).toBe(0)
    expect(result).toBeGreaterThanOrEqual(20)
    expect(result).toBeLessThanOrEqual(30)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle no constraints (default range)', () => {
    const schema = { type: 'number' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(typeof result).toBe('number')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle integer with no constraints', () => {
    const schema = { type: 'integer' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
