import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('guided retry fixes', () => {
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
})
