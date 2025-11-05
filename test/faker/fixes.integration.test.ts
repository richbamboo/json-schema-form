import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('path extraction', () => {
  it('should extract data path from schema path with allOf', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        field: { type: 'string' as const },
      },
      allOf: [
        {
          properties: {
            field: { minLength: 5 },
          },
        },
      ],
      required: ['field'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.field.length).toBeGreaterThanOrEqual(5)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should extract data path from schema path with if/then', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['A', 'B'] },
        value: { type: 'integer' as const },
      },
      allOf: [
        {
          if: {
            properties: { type: { const: 'A' } },
            required: ['type'],
          },
          then: {
            properties: {
              value: { minimum: 100 },
            },
          },
        },
      ],
      required: ['type', 'value'],
    }

    // Generate multiple times to test both branches
    for (let i = 0; i < 5; i++) {
      const result = generateFromSchema(schema, { seed: SEED + i }) as any
      expect(validateSchema(result, schema)).toEqual([])
      
      if (result.type === 'A') {
        expect(result.value).toBeGreaterThanOrEqual(100)
      }
    }
  })

  it('should handle deeply nested paths', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        level1: {
          type: 'object' as const,
          properties: {
            level2: {
              type: 'object' as const,
              properties: {
                value: { type: 'integer' as const, minimum: 50 },
              },
              required: ['value'],
            },
          },
          required: ['level2'],
        },
      },
      required: ['level1'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as any

    expect(result.level1.level2.value).toBeGreaterThanOrEqual(50)
    expect(validateSchema(result, schema)).toEqual([])
  })
})

describe('hybrid retry strategy', () => {
  it('should succeed with multiple errors requiring fixes', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, minLength: 3 },
        age: { type: 'integer' as const, minimum: 18, maximum: 100 },
        status: { type: 'string' as const, enum: ['active', 'inactive'] },
        forbidden: false,
      },
      required: ['name', 'age', 'status'],
    }

    const result = generateFromSchema(schema, { 
      seed: SEED,
      includeOptionalProbability: 1,
      maxGenerations: 10,
      maxFixesPerGeneration: 10,
    }) as any

    expect(result.name.length).toBeGreaterThanOrEqual(3)
    expect(result.age).toBeGreaterThanOrEqual(18)
    expect(result.age).toBeLessThanOrEqual(100)
    expect(['active', 'inactive']).toContain(result.status)
    expect(result).not.toHaveProperty('forbidden')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle complex conditional with multiple fixes', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        employment_type: { type: 'string' as const, enum: ['full_time', 'part_time'] },
        hours_per_week: { type: 'integer' as const },
        overtime_eligible: { type: 'boolean' as const },
      },
      required: ['employment_type'],
      allOf: [
        {
          if: {
            properties: { employment_type: { const: 'part_time' } },
            required: ['employment_type'],
          },
          then: {
            properties: {
              hours_per_week: { type: 'integer' as const, minimum: 1, maximum: 35 },
              overtime_eligible: false,
            },
            required: ['hours_per_week'],
          },
          else: {
            properties: {
              hours_per_week: { type: 'integer' as const, minimum: 36, maximum: 60 },
            },
            required: ['hours_per_week', 'overtime_eligible'],
          },
        },
      ],
    }

    // Test multiple times to cover both branches
    for (let i = 0; i < 10; i++) {
      const result = generateFromSchema(schema, { 
        seed: SEED + i,
        includeOptionalProbability: 1,
        maxGenerations: 20,
        maxFixesPerGeneration: 10,
      }) as any

      const errors = validateSchema(result, schema)
      expect(errors).toEqual([])

      if (result.employment_type === 'part_time') {
        expect(result.hours_per_week).toBeGreaterThanOrEqual(1)
        expect(result.hours_per_week).toBeLessThanOrEqual(35)
        expect(result).not.toHaveProperty('overtime_eligible')
      } else {
        expect(result.hours_per_week).toBeGreaterThanOrEqual(36)
        expect(result.hours_per_week).toBeLessThanOrEqual(60)
        expect(result).toHaveProperty('overtime_eligible')
      }
    }
  })
})
