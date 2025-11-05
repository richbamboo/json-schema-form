import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixUniqueItemsError', () => {
  it('should regenerate array when value is wrong type', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const },
          uniqueItems: true,
        },
      },
      required: ['tags'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      maxGenerations: 20,
      maxFixesPerGeneration: 10,
    }) as any

    expect(Array.isArray(result.tags)).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
    
    // Check uniqueness
    const uniqueTags = new Set(result.tags)
    expect(uniqueTags.size).toBe(result.tags.length)
  })

  it('should handle uniqueItems with enum items', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        days: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          },
          uniqueItems: true,
        },
      },
      required: ['days'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      maxGenerations: 20,
      maxFixesPerGeneration: 10,
    }) as any

    expect(Array.isArray(result.days)).toBe(true)
    expect(validateSchema(result, schema)).toEqual([])
    
    // Check uniqueness
    const uniqueDays = new Set(result.days)
    expect(uniqueDays.size).toBe(result.days.length)
    
    // Check all are valid enum values
    for (const day of result.days) {
      expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).toContain(day)
    }
  })
})
