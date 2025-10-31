import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('object nested generation', () => {
  it('should generate nested objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            email: { type: 'string' as const, format: 'email' as const },
          },
          required: ['name', 'email'],
        },
      },
      required: ['user'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(result).toHaveProperty('user')
    expect(typeof result.user).toBe('object')
    expect((result.user as ObjectValue).name).toBeDefined()
    expect((result.user as ObjectValue).email).toBeDefined()
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate object with array property', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ['tags'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(result).toHaveProperty('tags')
    expect(Array.isArray(result.tags)).toBe(true)
    expect((result.tags as unknown[]).length).toBeGreaterThanOrEqual(2)
    expect((result.tags as unknown[]).length).toBeLessThanOrEqual(4)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate object with mixed property types', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        id: { type: 'integer' as const, minimum: 1 },
        name: { type: 'string' as const, minLength: 3 },
        active: { type: 'boolean' as const },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const },
          minItems: 1,
          maxItems: 3,
        },
        metadata: {
          type: 'object' as const,
          properties: {
            created: { type: 'string' as const, format: 'date-time' as const },
          },
          required: ['created'],
        },
      },
      required: ['id', 'name', 'active', 'tags', 'metadata'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(typeof result.id).toBe('number')
    expect(Number.isInteger(result.id)).toBe(true)
    expect(typeof result.name).toBe('string')
    expect(typeof result.active).toBe('boolean')
    expect(Array.isArray(result.tags)).toBe(true)
    expect(typeof result.metadata).toBe('object')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate deeply nested objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        level1: {
          type: 'object' as const,
          properties: {
            level2: {
              type: 'object' as const,
              properties: {
                level3: {
                  type: 'object' as const,
                  properties: {
                    value: { type: 'string' as const },
                  },
                  required: ['value'],
                },
              },
              required: ['level3'],
            },
          },
          required: ['level2'],
        },
      },
      required: ['level1'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(result).toHaveProperty('level1')
    expect((result.level1 as ObjectValue)).toHaveProperty('level2')
    expect(((result.level1 as ObjectValue).level2 as ObjectValue)).toHaveProperty('level3')
    expect((((result.level1 as ObjectValue).level2 as ObjectValue).level3 as ObjectValue)).toHaveProperty('value')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle object with enum properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { enum: ['active', 'inactive', 'pending'] },
        priority: { type: 'integer' as const, enum: [1, 2, 3, 4, 5] },
      },
      required: ['status', 'priority'],
    }
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(['active', 'inactive', 'pending']).toContain(result.status)
    expect([1, 2, 3, 4, 5]).toContain(result.priority)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
