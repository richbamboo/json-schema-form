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

  describe('null handling', () => {
    it('should not generate null for required nested objects with conditionals', () => {
      // Complex nested object with conditionals - should generate an object, not null
      const schema = {
        type: 'object' as const,
        required: ['equity_compensation'],
        properties: {
          equity_compensation: {
            type: 'object' as const,
            required: ['offer_equity_compensation'],
            properties: {
              offer_equity_compensation: {
                type: 'string' as const,
                oneOf: [
                  { const: 'yes', title: 'Yes' },
                  { const: 'no', title: 'No' },
                ],
                title: 'Will this employee receive equity?',
              },
              number_of_stock_options: {
                type: ['string', 'null'] as const,
                title: 'Number of stock options',
              },
            },
            allOf: [
              {
                if: {
                  properties: {
                    offer_equity_compensation: { const: 'yes' },
                  },
                  required: ['offer_equity_compensation'],
                },
                then: {
                  required: ['number_of_stock_options'],
                },
                else: {
                  properties: {
                    number_of_stock_options: false,
                  },
                },
              },
            ],
          },
        },
      }

      const result = generateFromSchema(schema, { seed: 42 }) as any

      expect(result.equity_compensation).not.toBeNull()
      expect(result.equity_compensation).toHaveProperty('offer_equity_compensation')
      expect(['yes', 'no']).toContain(result.equity_compensation.offer_equity_compensation)
    })

    it('should not generate null for simple required nested objects', () => {
      const schema = {
        type: 'object' as const,
        required: ['nested'],
        properties: {
          nested: {
            type: 'object' as const,
            required: ['field'],
            properties: {
              field: {
                type: 'string' as const,
                enum: ['a', 'b'],
              },
            },
          },
        },
      }

      const result = generateFromSchema(schema, { seed: 42 }) as any

      expect(result.nested).not.toBeNull()
      expect(result.nested).toHaveProperty('field')
      expect(['a', 'b']).toContain(result.nested.field)
    })

    it('should handle nested object with nullable properties', () => {
      // Verify that nullable PROPERTIES don't make the OBJECT itself null
      const schema = {
        type: 'object' as const,
        required: ['container'],
        properties: {
          container: {
            type: 'object' as const,
            required: ['requiredField'],
            properties: {
              requiredField: {
                type: 'string' as const,
                const: 'value',
              },
              nullableField: {
                type: ['string', 'null'] as const,
              },
            },
          },
        },
      }

      const result = generateFromSchema(schema, { seed: 42 }) as any

      expect(result.container).not.toBeNull()
      expect(typeof result.container).toBe('object')
      expect(result.container.requiredField).toBe('value')
    })

    it('should handle optional nested objects correctly', () => {
      // Optional nested objects CAN be omitted (different from required)
      const schema = {
        type: 'object' as const,
        properties: {
          optionalNested: {
            type: 'object' as const,
            properties: {
              field: {
                type: 'string' as const,
                const: 'value',
              },
            },
          },
        },
      }

      const result = generateFromSchema(schema, { seed: 42, includeOptionalProbability: 0 }) as any

      // Since it's optional and probability is 0, it should be omitted (not generated)
      expect(result.optionalNested).toBeUndefined()
    })

    it('should generate deeply nested required objects without null values', () => {
      const schema = {
        type: 'object' as const,
        required: ['level1'],
        properties: {
          level1: {
            type: 'object' as const,
            required: ['level2'],
            properties: {
              level2: {
                type: 'object' as const,
                required: ['level3'],
                properties: {
                  level3: {
                    type: 'string' as const,
                    const: 'deep',
                  },
                },
              },
            },
          },
        },
      }

      const result = generateFromSchema(schema, { seed: 42 }) as any

      expect(result.level1).not.toBeNull()
      expect(result.level1.level2).not.toBeNull()
      expect(result.level1.level2.level3).toBe('deep')
    })
  })
})
