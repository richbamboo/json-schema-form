import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixForbiddenError', () => {
  it('should remove forbidden property at root level', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        allowed: { type: 'string' as const },
        forbidden: false,
      },
    }

    const result = generateFromSchema(schema, { 
      seed: SEED, 
      includeOptionalProbability: 1  // Try to generate all properties
    }) as any

    expect(result).toHaveProperty('allowed')
    expect(result).not.toHaveProperty('forbidden')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should remove forbidden property in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object' as const,
          properties: {
            enabled: { type: 'boolean' as const },
            deprecated: false,
          },
        },
      },
      required: ['config'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      includeOptionalProbability: 1
    }) as any

    expect(result.config).toHaveProperty('enabled')
    expect(result.config).not.toHaveProperty('deprecated')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should remove forbidden property from conditional else branch', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        has_bonus: { type: 'boolean' as const },
        bonus_amount: { type: 'integer' as const },
      },
      allOf: [
        {
          if: {
            properties: { has_bonus: { const: true } },
            required: ['has_bonus'],
          },
          then: {
            required: ['bonus_amount'],
          },
          else: {
            properties: {
              bonus_amount: false,
            },
          },
        },
      ],
    }

    // Generate multiple times to test both branches
    for (let i = 0; i < 10; i++) {
      const result = generateFromSchema(schema, { 
        seed: SEED + i,
        includeOptionalProbability: 1
      }) as any
      
      const errors = validateSchema(result, schema)
      expect(errors).toEqual([])
      
      if (result.has_bonus === false) {
        expect(result).not.toHaveProperty('bonus_amount')
      }
    }
  })
})
