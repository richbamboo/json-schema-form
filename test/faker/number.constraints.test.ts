import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('number constraint generation', () => {
  it('should generate number within minimum and maximum', () => {
    const schema = { type: 'number' as const, minimum: 10, maximum: 20 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(10)
    expect(result).toBeLessThanOrEqual(20)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate integer within minimum and maximum', () => {
    const schema = { type: 'integer' as const, minimum: 5, maximum: 15 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThanOrEqual(5)
    expect(result).toBeLessThanOrEqual(15)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect exclusiveMinimum', () => {
    const schema = { type: 'number' as const, exclusiveMinimum: 0, maximum: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect exclusiveMaximum', () => {
    const schema = { type: 'number' as const, minimum: 0, exclusiveMaximum: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect both exclusive bounds', () => {
    const schema = { type: 'integer' as const, exclusiveMinimum: 0, exclusiveMaximum: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate multipleOf values', () => {
    const schema = { type: 'number' as const, multipleOf: 5, minimum: 0, maximum: 100 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result % 5).toBe(0)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate integer multipleOf values', () => {
    const schema = { type: 'integer' as const, multipleOf: 3, minimum: 0, maximum: 30 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(result % 3).toBe(0)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle decimal multipleOf', () => {
    const schema = { type: 'number' as const, multipleOf: 0.1, minimum: 0, maximum: 1 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    // Check multipleOf with floating point tolerance
    const remainder = (result / 0.1) % 1
    expect(remainder).toBeLessThan(0.0001)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate negative numbers', () => {
    const schema = { type: 'integer' as const, minimum: -50, maximum: -10 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThanOrEqual(-50)
    expect(result).toBeLessThanOrEqual(-10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle only minimum constraint', () => {
    const schema = { type: 'number' as const, minimum: 100 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeGreaterThanOrEqual(100)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle only maximum constraint', () => {
    const schema = { type: 'number' as const, maximum: -100 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(result).toBeLessThanOrEqual(-100)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle minimum greater than old default maximum (regression test)', () => {
    // This tests the bug fix where minimum > 1000 (old default max) would generate invalid values
    const schema = { type: 'integer' as const, minimum: 2500 }
    const result = generateFromSchema(schema, { seed: SEED }) as number

    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThanOrEqual(2500)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should be deterministic with same seed', () => {
    const schema = { type: 'number' as const, minimum: 0, maximum: 100 }
    const result1 = generateFromSchema(schema, { seed: SEED }) as number
    const result2 = generateFromSchema(schema, { seed: SEED }) as number

    expect(result1).toBe(result2)
  })

  it('should generate integer when type is array ["integer", "null"]', () => {
    const schema = { type: ['integer', 'null'] as const }
    const result = generateFromSchema(schema, { seed: SEED })

    // Should be either integer or null
    if (result !== null) {
      expect(Number.isInteger(result)).toBe(true)
    }
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect constraints with type array ["integer", "null"]', () => {
    const schema = { 
      type: ['integer', 'null'] as const,
      minimum: 0,
      maximum: 100,
    }
    const result = generateFromSchema(schema, { seed: SEED })

    if (result !== null) {
      expect(Number.isInteger(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    }
    expect(validateSchema(result, schema)).toEqual([])
  })

  // Phase 3 Fix Tests: Exclusive minimum for floats
  it('should never generate exactly exclusiveMinimum for floats', () => {
    const schema = { type: 'number' as const, exclusiveMinimum: 5.0, maximum: 5.1 }
    
    // Generate multiple times to ensure we never hit exactly 5.0
    for (let i = 0; i < 100; i++) {
      const result = generateFromSchema(schema, { seed: SEED + i }) as number
      expect(result).toBeGreaterThan(5.0)
      expect(result).toBeLessThanOrEqual(5.1)
      expect(validateSchema(result, schema)).toEqual([])
    }
  })

  // Phase 3 Fix Tests: multipleOf with no valid multiple in range
  it('should throw when no valid multiple exists in range', () => {
    const schema = { type: 'number' as const, minimum: 5, maximum: 6, multipleOf: 10 }
    
    // No multiple of 10 exists between 5 and 6
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('No valid multiple')
  })

  it('should handle multipleOf at exact boundaries', () => {
    const schema = { type: 'number' as const, minimum: 10, maximum: 10, multipleOf: 10 }
    const result = generateFromSchema(schema, { seed: SEED }) as number
    
    expect(result).toBe(10)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle multipleOf with tight range', () => {
    const schema = { type: 'integer' as const, minimum: 10, maximum: 20, multipleOf: 5 }
    const result = generateFromSchema(schema, { seed: SEED }) as number
    
    expect([10, 15, 20]).toContain(result)
    expect(result % 5).toBe(0)
    expect(validateSchema(result, schema)).toEqual([])
  })

  // Phase 3 Round 3 Fix Tests: multipleOf validation
  it('should throw for negative multipleOf', () => {
    const schema = { type: 'number' as const, multipleOf: -5 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multipleOf must be > 0')
  })

  it('should throw for zero multipleOf', () => {
    const schema = { type: 'number' as const, multipleOf: 0 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multipleOf must be > 0')
  })

  it('should throw for NaN multipleOf', () => {
    const schema = { type: 'number' as const, multipleOf: NaN }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multipleOf must be a finite number')
  })

  it('should throw for Infinity multipleOf', () => {
    const schema = { type: 'number' as const, multipleOf: Infinity }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multipleOf must be a finite number')
  })

  // Phase 3 Round 4 Fix Tests: min/max range validation
  it('should throw when exclusiveMinimum and exclusiveMaximum create invalid range for integers', () => {
    const schema = { type: 'integer' as const, exclusiveMinimum: 5, exclusiveMaximum: 6 }
    
    // After adjustment: min=6, max=5 which is invalid
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('Invalid range')
  })

  it('should throw when minimum > maximum', () => {
    const schema = { type: 'number' as const, minimum: 10, maximum: 5 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('Invalid range')
  })

  it('should handle exclusiveMinimum and exclusiveMaximum with valid range for integers', () => {
    const schema = { type: 'integer' as const, exclusiveMinimum: 5, exclusiveMaximum: 8 }
    const result = generateFromSchema(schema, { seed: SEED }) as number
    
    // Valid range is 6, 7
    expect([6, 7]).toContain(result)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
