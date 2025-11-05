import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'

const SEED = 42

describe('composition edge cases', () => {
  // allOf validation
  it('should throw when allOf is empty array', () => {
    const schema = {
      type: 'string' as const,
      allOf: []
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('allOf must be a non-empty array')
  })

  it('should throw when allOf is not an array', () => {
    const schema = {
      type: 'string' as const,
      allOf: { type: 'string' } as any
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('allOf must be a non-empty array')
  })

  // anyOf validation
  it('should throw when anyOf is empty array', () => {
    const schema = {
      type: 'string' as const,
      anyOf: []
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('anyOf must be a non-empty array')
  })

  it('should throw when anyOf is not an array', () => {
    const schema = {
      type: 'string' as const,
      anyOf: { type: 'string' } as any
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('anyOf must be a non-empty array')
  })

  // oneOf validation
  it('should throw when oneOf is empty array', () => {
    const schema = {
      type: 'string' as const,
      oneOf: []
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('oneOf must be a non-empty array')
  })

  it('should throw when oneOf is not an array', () => {
    const schema = {
      type: 'string' as const,
      oneOf: { type: 'string' } as any
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('oneOf must be a non-empty array')
  })

  // allOf with multiple patterns
  it('should throw when allOf has multiple pattern constraints', () => {
    const schema = {
      type: 'string' as const,
      allOf: [
        { pattern: '^[a-z]+$' },
        { pattern: '^[A-Z]+$' }
      ]
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multiple pattern constraints')
  })

  // Valid compositions
  it('should handle allOf with single subschema', () => {
    const schema = {
      type: 'string' as const,
      allOf: [
        { minLength: 5 }
      ]
    }
    const result = generateFromSchema(schema, { seed: SEED }) as string
    
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThanOrEqual(5)
  })

  it('should handle anyOf with single subschema', () => {
    const schema = {
      anyOf: [
        { type: 'string' as const }
      ]
    }
    const result = generateFromSchema(schema, { seed: SEED })
    
    expect(typeof result).toBe('string')
  })

  it('should handle oneOf with single subschema', () => {
    const schema = {
      oneOf: [
        { type: 'number' as const }
      ]
    }
    const result = generateFromSchema(schema, { seed: SEED })
    
    expect(typeof result).toBe('number')
  })

  // Boolean schemas in allOf
  it('should throw when allOf contains false schema', () => {
    const schema = {
      type: 'string' as const,
      allOf: [
        { minLength: 5 },
        false
      ]
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('unsatisfiable')
  })

  it('should ignore true schema in allOf', () => {
    const schema = {
      type: 'string' as const,
      allOf: [
        true,
        { minLength: 5 }
      ]
    }
    const result = generateFromSchema(schema, { seed: SEED }) as string
    
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThanOrEqual(5)
  })

  it('should handle allOf with only true schemas', () => {
    const schema = {
      type: 'number' as const,
      allOf: [true, true]
    }
    const result = generateFromSchema(schema, { seed: SEED })
    
    expect(typeof result).toBe('number')
  })

  // Boolean schemas in conditionals
  it('should handle then: true in conditional', () => {
    const schema = {
      type: 'string' as const,
      if: { minLength: 5 },
      then: true
    }
    const result = generateFromSchema(schema, { seed: SEED }) as string
    
    expect(typeof result).toBe('string')
  })

  it('should handle else: true in conditional', () => {
    const schema = {
      type: 'number' as const,
      if: { minimum: 100 },
      else: true
    }
    const result = generateFromSchema(schema, { seed: SEED })
    
    expect(typeof result).toBe('number')
  })

  it('should skip then: false and try else branch', () => {
    const schema = {
      type: 'string' as const,
      if: { minLength: 5 },
      then: false,
      else: { minLength: 3 }
    }
    const result = generateFromSchema(schema, { seed: SEED }) as string
    
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('should handle both then and else branches when one is false', () => {
    const schema = {
      type: 'number' as const,
      if: { minimum: 10 },
      then: { minimum: 10, maximum: 100 },
      else: { maximum: 9 }
    }
    const result = generateFromSchema(schema, { seed: SEED })
    
    // Will generate either a number >= 10 (then branch) or <= 9 (else branch)
    expect(typeof result).toBe('number')
  })

  // Property merging with boolean schemas in allOf
  it('should handle true schema in property merging', () => {
    const schema = {
      type: 'object' as const,
      allOf: [
        {
          properties: {
            name: true,
            age: { type: 'number' as const }
          }
        },
        {
          properties: {
            name: { type: 'string' as const }
          }
        }
      ]
    } as any
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    // name should use the more restrictive schema (string)
    expect(typeof result.name).toBe('string')
  })

  it('should handle false schema removing property in allOf', () => {
    const schema = {
      type: 'object' as const,
      allOf: [
        {
          properties: {
            name: { type: 'string' as const },
            forbidden: { type: 'number' as const }
          }
        },
        {
          properties: {
            forbidden: false
          }
        }
      ]
    } as any
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    expect(result).toHaveProperty('name')
    expect(result).not.toHaveProperty('forbidden')
  })
})
