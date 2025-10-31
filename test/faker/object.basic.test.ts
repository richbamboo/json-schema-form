import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('object basic generation', () => {
  it('should generate object with required properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const },
      },
      required: ['name', 'age'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('age')
    expect(typeof result.name).toBe('string')
    expect(typeof result.age).toBe('number')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate object with only required properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        optional: { type: 'string' as const },
      },
      required: ['id'],
    }
    const result = generateFromSchema(schema, { seed: SEED, includeOptionalProbability: 0 }) as ObjectValue

    expect(result).toHaveProperty('id')
    expect(result).not.toHaveProperty('optional')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate object with all properties when probability is 1', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        required: { type: 'string' as const },
        optional1: { type: 'string' as const },
        optional2: { type: 'number' as const },
      },
      required: ['required'],
    }
    const result = generateFromSchema(schema, { seed: SEED, includeOptionalProbability: 1 }) as ObjectValue

    expect(result).toHaveProperty('required')
    expect(result).toHaveProperty('optional1')
    expect(result).toHaveProperty('optional2')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate empty object when no properties defined', () => {
    const schema = { type: 'object' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(typeof result).toBe('object')
    expect(Object.keys(result)).toHaveLength(0)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should be deterministic with same seed', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        count: { type: 'integer' as const, minimum: 0, maximum: 100 },
      },
      required: ['name', 'count'],
    }
    const result1 = generateFromSchema(schema, { seed: SEED }) as ObjectValue
    const result2 = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(result1).toEqual(result2)
  })

  it('should handle object without type specified but with properties', () => {
    const schema = {
      properties: {
        field: { type: 'string' as const },
      },
      required: ['field'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('field')
    expect(validateSchema(result, schema)).toEqual([])
  })
})
