import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixTypeError', () => {
  it('should fix null value when string is required', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: ['string', 'null'] as const },
      },
      allOf: [
        {
          if: {
            properties: { name: { type: 'null' as const } },
          },
          then: {},
          else: {
            properties: {
              name: { type: ['string'] as const },
            },
          },
        },
      ],
      required: ['name'],
    }

    // Generate multiple times - sometimes it will generate null, which should be fixed
    for (let i = 0; i < 10; i++) {
      const result = generateFromSchema(schema, { 
        seed: SEED + i,
        maxGenerations: 20,
        maxFixesPerGeneration: 10,
      }) as any

      const errors = validateSchema(result, schema)
      expect(errors).toEqual([])
      
      // The value should be a string (not null) after fixes
      if (result.name !== null) {
        expect(typeof result.name).toBe('string')
      }
    }
  })

  it('should fix type mismatch in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object' as const,
          properties: {
            value: { type: ['number', 'null'] as const },
          },
          required: ['value'],
        },
      },
      required: ['config'],
      allOf: [
        {
          properties: {
            config: {
              properties: {
                value: { type: ['number'] as const },
              },
            },
          },
        },
      ],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      maxGenerations: 20,
      maxFixesPerGeneration: 10,
    }) as any

    expect(validateSchema(result, schema)).toEqual([])
    expect(typeof result.config.value).toBe('number')
  })

  it('should regenerate with correct type when type array is violated', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { type: ['string', 'boolean'] as const },
      },
      allOf: [
        {
          if: {
            properties: { status: { type: 'boolean' as const } },
          },
          then: {},
          else: {
            properties: {
              status: { type: ['string'] as const, enum: ['active', 'inactive'] },
            },
          },
        },
      ],
      required: ['status'],
    }

    for (let i = 0; i < 5; i++) {
      const result = generateFromSchema(schema, { 
        seed: SEED + i,
        maxGenerations: 20,
        maxFixesPerGeneration: 10,
      }) as any

      expect(validateSchema(result, schema)).toEqual([])
      
      if (typeof result.status === 'string') {
        expect(['active', 'inactive']).toContain(result.status)
      }
    }
  })
})
