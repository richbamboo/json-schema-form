import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('object edge cases', () => {
  it('should throw when required property is not in properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const }
      },
      required: ['name', 'age'] // 'age' not in properties
    }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('Required property "age" is not defined in properties')
  })

  it('should handle optional property with false schema', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        forbidden: false
      },
      required: ['name']
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    // Should generate 'name' but never 'forbidden' (false schema means forbidden)
    expect(result).toHaveProperty('name')
    expect(result).not.toHaveProperty('forbidden')
  })

  it('should handle empty properties object', () => {
    const schema = {
      type: 'object' as const,
      properties: {}
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    expect(result).toEqual({})
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle no properties defined', () => {
    const schema = {
      type: 'object' as const
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    expect(result).toEqual({})
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate all required properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const },
        active: { type: 'boolean' as const }
      },
      required: ['name', 'age', 'active']
    }
    const result = generateFromSchema(schema, { seed: SEED }) as any
    
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('age')
    expect(result).toHaveProperty('active')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should respect includeOptionalProbability for optional properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        required: { type: 'string' as const },
        optional: { type: 'string' as const }
      },
      required: ['required']
    }
    
    // With probability 0, optional should never be included
    const result1 = generateFromSchema(schema, { seed: SEED, includeOptionalProbability: 0 }) as any
    expect(result1).toHaveProperty('required')
    expect(result1).not.toHaveProperty('optional')
    
    // With probability 1, optional should always be included
    const result2 = generateFromSchema(schema, { seed: SEED, includeOptionalProbability: 1 }) as any
    expect(result2).toHaveProperty('required')
    expect(result2).toHaveProperty('optional')
  })
})
