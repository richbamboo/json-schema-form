import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixConstError', () => {
  it('should fix value to match const requirement', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { type: 'string' as const },
      },
      allOf: [
        {
          properties: {
            status: { const: 'active' },
          },
        },
      ],
      required: ['status'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      maxGenerations: 20,
      maxFixesPerGeneration: 10,
    }) as any

    expect(result.status).toBe('active')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should fix const in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object' as const,
          properties: {
            version: { type: 'number' as const },
          },
          required: ['version'],
        },
      },
      required: ['config'],
      allOf: [
        {
          properties: {
            config: {
              properties: {
                version: { const: 2 },
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

    expect(result.config.version).toBe(2)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
