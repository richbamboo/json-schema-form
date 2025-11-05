import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixNumberBoundsError', () => {
  it('should fix minimum violation', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        amount: { type: 'integer' as const, minimum: 1000 },
      },
      required: ['amount'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.amount).toBeGreaterThanOrEqual(1000)
    expect(Number.isInteger(result.amount)).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should fix maximum violation', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        percentage: { type: 'integer' as const, maximum: 100 },
      },
      required: ['percentage'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.percentage).toBeLessThanOrEqual(100)
    expect(Number.isInteger(result.percentage)).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should preserve integer type when fixing bounds', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        count: { type: 'integer' as const },
      },
      allOf: [
        {
          properties: {
            count: { minimum: 5000 },
          },
        },
      ],
      required: ['count'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(Number.isInteger(result.count)).toBe(true)
    expect(result.count).toBeGreaterThanOrEqual(5000)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should fix bounds in nested object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        pricing: {
          type: 'object' as const,
          properties: {
            amount: { type: 'integer' as const, minimum: 100, maximum: 10000 },
          },
          required: ['amount'],
        },
      },
      required: ['pricing'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.pricing.amount).toBeGreaterThanOrEqual(100)
    expect(result.pricing.amount).toBeLessThanOrEqual(10000)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
