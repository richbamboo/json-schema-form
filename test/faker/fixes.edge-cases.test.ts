import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('fixes edge cases - defensive programming tests', () => {
  // Note: These tests verify that the defensive fixes in Phase 6 work correctly
  // by testing through the public API rather than testing internal functions directly
  
  describe('enum edge cases', () => {
    it('should handle valid enum values', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          status: { type: 'string' as const, enum: ['active', 'inactive'] }
        },
        required: ['status']
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      expect(['active', 'inactive']).toContain(result.status)
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('oneOf edge cases', () => {
    it('should handle valid oneOf with const values', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          option: {
            oneOf: [
              { const: 'A' },
              { const: 'B' }
            ]
          }
        },
        required: ['option']
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      expect(['A', 'B']).toContain(result.option)
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('complex schemas with multiple constraints', () => {
    it('should handle schema with allOf and enum', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          level: { type: 'string' as const }
        },
        allOf: [
          {
            properties: {
              level: { enum: ['low', 'medium', 'high'] }
            }
          }
        ],
        required: ['level']
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      expect(['low', 'medium', 'high']).toContain(result.level)
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should handle deeply nested objects with constraints', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          config: {
            type: 'object' as const,
            properties: {
              settings: {
                type: 'object' as const,
                properties: {
                  value: { type: 'integer' as const, minimum: 10, maximum: 100 }
                },
                required: ['value']
              }
            },
            required: ['settings']
          }
        },
        required: ['config']
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      expect(result.config.settings.value).toBeGreaterThanOrEqual(10)
      expect(result.config.settings.value).toBeLessThanOrEqual(100)
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('error correction with valid schemas', () => {
    it('should successfully generate and fix values with retry mechanism', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const, minLength: 5 },
          age: { type: 'integer' as const, minimum: 18, maximum: 100 },
          status: { type: 'string' as const, enum: ['active', 'inactive'] }
        },
        required: ['name', 'age', 'status']
      }
      
      // Generate multiple times to ensure retry mechanism works
      for (let i = 0; i < 5; i++) {
        const result = generateFromSchema(schema, { seed: SEED + i }) as any
        
        expect(result.name.length).toBeGreaterThanOrEqual(5)
        expect(result.age).toBeGreaterThanOrEqual(18)
        expect(result.age).toBeLessThanOrEqual(100)
        expect(['active', 'inactive']).toContain(result.status)
        expect(validateSchema(result, schema)).toEqual([])
      }
    })
  })
})
