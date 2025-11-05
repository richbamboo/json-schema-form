import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('string length generation', () => {
  it('should respect minLength', () => {
    const schema = { type: 'string' as const, minLength: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBeGreaterThanOrEqual(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect maxLength', () => {
    const schema = { type: 'string' as const, maxLength: 5 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBeLessThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect both minLength and maxLength', () => {
    const schema = { type: 'string' as const, minLength: 5, maxLength: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBeGreaterThanOrEqual(5)
    expect(result.length).toBeLessThanOrEqual(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle exact length (minLength === maxLength)', () => {
    const schema = { type: 'string' as const, minLength: 7, maxLength: 7 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBe(7)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle minLength of 0', () => {
    const schema = { type: 'string' as const, minLength: 0, maxLength: 5 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBeGreaterThanOrEqual(0)
    expect(result.length).toBeLessThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should count graphemes correctly for length constraints', () => {
    // Emoji are single graphemes but multiple code units
    const schema = { type: 'string' as const, minLength: 3, maxLength: 3 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    // Count graphemes using Intl.Segmenter (same as validator)
    const graphemeCount = [...new Intl.Segmenter().segment(result)].length
    expect(graphemeCount).toBe(3)
    expect(validateSchema(result, schema)).toEqual([])
  })

  // Phase 3 Fix Tests: Validation for invalid length constraints
  it('should handle very long strings efficiently (performance test)', () => {
    const schema = { type: 'string' as const, minLength: 1000, maxLength: 1000 }
    const start = Date.now()
    const result = generateFromSchema(schema, { seed: SEED }) as string
    const duration = Date.now() - start

    expect(result.length).toBe(1000)
    expect(duration).toBeLessThan(100) // Should be fast with array join optimization
    expect(validateSchema(result, schema)).toEqual([])
  })
})
