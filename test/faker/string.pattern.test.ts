import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('string pattern generation', () => {
  it('should generate string matching simple pattern', () => {
    const schema = { type: 'string' as const, pattern: '^[a-z]+$' }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[a-z]+$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate string matching digit pattern', () => {
    const schema = { type: 'string' as const, pattern: '^\\d{3}-\\d{4}$' }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\d{3}-\d{4}$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate string matching email-like pattern', () => {
    const schema = { type: 'string' as const, pattern: '^[a-z]+@[a-z]+\\.[a-z]+$' }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[a-z]+@[a-z]+\.[a-z]+$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate deterministically with pattern', () => {
    const schema = { type: 'string' as const, pattern: '^[A-Z]{5}$' }
    const result1 = generateFromSchema(schema, { seed: SEED }) as string
    const result2 = generateFromSchema(schema, { seed: SEED }) as string

    expect(result1).toBe(result2)
    expect(validateSchema(result1, schema)).toEqual([])
  })

  it('should respect minLength with pattern', () => {
    const schema = { type: 'string' as const, pattern: '^[a-z]+$', minLength: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[a-z]+$/)
    expect(result.length).toBeGreaterThanOrEqual(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect maxLength with pattern', () => {
    const schema = { type: 'string' as const, pattern: '^[a-z]+$', maxLength: 5 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[a-z]+$/)
    expect(result.length).toBeLessThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
