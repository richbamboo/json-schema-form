import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixOneOfError', () => {
  it('should pick valid const value from oneOf branches', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        option: { type: 'string' as const },
      },
      allOf: [
        {
          properties: {
            option: {
              oneOf: [
                { const: 'option_a', title: 'Option A' },
                { const: 'option_b', title: 'Option B' },
                { const: 'option_c', title: 'Option C' },
              ],
            },
          },
        },
      ],
      required: ['option'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      maxGenerations: 20,
      maxFixesPerGeneration: 10,
    }) as any

    expect(['option_a', 'option_b', 'option_c']).toContain(result.option)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should fix oneOf in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object' as const,
          properties: {
            mode: { type: 'string' as const },
          },
          required: ['mode'],
        },
      },
      required: ['config'],
      allOf: [
        {
          properties: {
            config: {
              properties: {
                mode: {
                  oneOf: [
                    { const: 'auto' },
                    { const: 'manual' },
                  ],
                },
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

    expect(['auto', 'manual']).toContain(result.config.mode)
    expect(validateSchema(result, schema)).toEqual([])
  })
})

describe('fixEnumError', () => {
  it('should pick valid enum value', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        status: { type: 'string' as const, enum: ['active', 'inactive', 'pending'] },
      },
      required: ['status'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(['active', 'inactive', 'pending']).toContain(result.status)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should fix enum in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object' as const,
          properties: {
            level: { type: 'string' as const, enum: ['low', 'medium', 'high'] },
          },
          required: ['level'],
        },
      },
      required: ['config'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(['low', 'medium', 'high']).toContain(result.config.level)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
