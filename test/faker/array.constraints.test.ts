import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('array constraint validation', () => {
  it('should throw for negative minItems', () => {
    const schema = { type: 'array' as const, minItems: -1 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('minItems must be a non-negative integer')
  })

  it('should throw for negative maxItems', () => {
    const schema = { type: 'array' as const, maxItems: -5 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('maxItems must be a non-negative integer')
  })

  it('should throw when minItems > maxItems', () => {
    const schema = { type: 'array' as const, minItems: 10, maxItems: 5 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('minItems must be <= maxItems')
  })

  it('should throw for fractional minItems', () => {
    const schema = { type: 'array' as const, minItems: 2.5 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('minItems must be a non-negative integer')
  })

  it('should throw for fractional maxItems', () => {
    const schema = { type: 'array' as const, maxItems: 10.7 }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('maxItems must be a non-negative integer')
  })

  it('should handle minItems = 0', () => {
    const schema = { type: 'array' as const, minItems: 0, maxItems: 2 }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(0)
    expect(result.length).toBeLessThanOrEqual(2)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle minItems = maxItems', () => {
    const schema = { type: 'array' as const, minItems: 5, maxItems: 5, items: { type: 'string' as const } }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBe(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect minItems constraint', () => {
    const schema = { type: 'array' as const, minItems: 3, items: { type: 'number' as const } }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect maxItems constraint', () => {
    const schema = { type: 'array' as const, maxItems: 5, items: { type: 'string' as const } }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBeLessThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect both minItems and maxItems', () => {
    const schema = { type: 'array' as const, minItems: 2, maxItems: 4, items: { type: 'boolean' as const } }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.length).toBeLessThanOrEqual(4)
    expect(validateSchema(result, schema)).toEqual([])
  })

  // Phase 4 Round 2: items: false handling
  it('should throw when items is false and array needs more items than prefixItems', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [{ type: 'string' as const }],
      items: false,
      minItems: 2 // Requires 2 items but only 1 prefixItem
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('items schema is false')
  })

  it('should handle items: false when prefixItems satisfies minItems', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [
        { type: 'string' as const },
        { type: 'number' as const }
      ],
      items: false,
      minItems: 2,
      maxItems: 2
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBe(2)
    expect(typeof result[0]).toBe('string')
    expect(typeof result[1]).toBe('number')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle empty prefixItems array', () => {
    const schema = {
      type: 'array' as const,
      prefixItems: [],
      items: { type: 'string' as const },
      minItems: 2
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(validateSchema(result, schema)).toEqual([])
  })

  // Phase 4 Round 3: maxItems upper limit
  it('should throw when maxItems exceeds 10000', () => {
    const schema = {
      type: 'array' as const,
      maxItems: 100000
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('maxItems must be <= 10000')
  })

  it('should handle maxItems at the limit (10000)', () => {
    const schema = {
      type: 'array' as const,
      minItems: 10000,
      maxItems: 10000,
      items: { type: 'null' as const } // Use null for fast generation
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any[]
    
    expect(result.length).toBe(10000)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
