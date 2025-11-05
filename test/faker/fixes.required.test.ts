import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixRequiredError', () => {
  it('should add missing required property at root level', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'integer' as const },
      },
      required: ['name', 'age'],
    }

    const result = generateFromSchema(schema, { seed: SEED })

    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('age')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should add missing required property in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            email: { type: 'string' as const },
          },
          required: ['name', 'email'],
        },
      },
      required: ['user'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.user).toHaveProperty('name')
    expect(result.user).toHaveProperty('email')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should add required property with const value', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { type: 'string' as const, const: 'active' },
      },
      required: ['status'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.status).toBe('active')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should add required property from conditional then branch', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['full_time', 'part_time'] },
        hours: { type: 'integer' as const },
      },
      allOf: [
        {
          if: {
            properties: { type: { const: 'part_time' } },
            required: ['type'],
          },
          then: {
            properties: {
              hours: { type: 'integer' as const, maximum: 30 },
            },
            required: ['hours'],
          },
        },
      ],
    }

    // Generate multiple times to test both branches
    for (let i = 0; i < 5; i++) {
      const result = generateFromSchema(schema, { seed: SEED + i }) as any
      expect(validateSchema(result, schema)).toEqual([])
      
      if (result.type === 'part_time') {
        expect(result).toHaveProperty('hours')
        expect(result.hours).toBeLessThanOrEqual(30)
      }
    }
  })
})
