import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'

const SEED = 42

describe('security & performance safeguards', () => {
  describe('ReDoS protection', () => {
    it('should limit pattern generation length to prevent memory exhaustion', () => {
      // Pattern that could generate very long strings
      const schema = {
        type: 'string' as const,
        pattern: '^a{1,50000}$',
        maxLength: 100
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as string
      
      // Should respect maxLength limit
      expect(result.length).toBeLessThanOrEqual(100)
    })

    it('should use default 10000 char limit when no maxLength specified', () => {
      // Pattern without maxLength - should still be limited
      const schema = {
        type: 'string' as const,
        pattern: '^[a-z]+$'
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as string
      
      // Should not generate extremely long strings
      expect(result.length).toBeLessThanOrEqual(10000)
    })
  })

  describe('recursion depth protection', () => {
    it('should prevent stack overflow from deeply nested schemas', () => {
      // Create a deeply nested schema (101 levels deep)
      let schema: any = { type: 'string' as const }
      for (let i = 0; i < 101; i++) {
        schema = {
          type: 'object' as const,
          properties: {
            nested: schema
          },
          required: ['nested']
        }
      }
      
      // Should throw error before stack overflow
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/Maximum recursion depth/)
    })

    it('should handle reasonable nesting depth', () => {
      // Create a reasonably nested schema (10 levels deep)
      let schema: any = { type: 'string' as const }
      for (let i = 0; i < 10; i++) {
        schema = {
          type: 'object' as const,
          properties: {
            nested: schema
          },
          required: ['nested']
        }
      }
      
      // Should generate successfully
      const result = generateFromSchema(schema, { seed: SEED })
      expect(result).toBeDefined()
    })

    it('should handle deep array nesting', () => {
      // Create deeply nested array schema
      let schema: any = { type: 'string' as const }
      for (let i = 0; i < 10; i++) {
        schema = {
          type: 'array' as const,
          items: schema,
          minItems: 1,
          maxItems: 1
        }
      }
      
      // Should generate successfully
      const result = generateFromSchema(schema, { seed: SEED })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('resource exhaustion protection', () => {
    it('should handle large array constraints reasonably', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 100,
        maxItems: 100
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as unknown[]
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(100)
    })

    it('should handle many object properties', () => {
      // Create schema with many properties
      const properties: any = {}
      for (let i = 0; i < 50; i++) {
        properties[`prop${i}`] = { type: 'string' as const }
      }
      
      const schema = {
        type: 'object' as const,
        properties,
        required: Object.keys(properties)
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      expect(Object.keys(result).length).toBe(50)
    })
  })

  describe('option limits protection', () => {
    it('should reject excessive count', () => {
      const schema = { type: 'string' as const }
      
      expect(() => generateFromSchema(schema, { count: 10001 })).toThrow(/count must be <= 10000/)
    })

    it('should reject excessive maxGenerations', () => {
      const schema = { type: 'string' as const }
      
      expect(() => generateFromSchema(schema, { maxGenerations: 10001 })).toThrow(/maxGenerations must be <= 10000/)
    })

    it('should reject excessive maxFixesPerGeneration', () => {
      const schema = { type: 'string' as const }
      
      expect(() => generateFromSchema(schema, { maxFixesPerGeneration: 1001 })).toThrow(/maxFixesPerGeneration must be <= 1000/)
    })

    it('should reject excessive maxAttempts', () => {
      const schema = { type: 'string' as const }
      
      expect(() => generateFromSchema(schema, { maxAttempts: 100001 })).toThrow(/maxAttempts must be <= 100000/)
    })

    it('should accept reasonable option values', () => {
      const schema = { type: 'string' as const }
      
      // Should not throw
      const result = generateFromSchema(schema, {
        seed: SEED,
        count: 10,
        maxGenerations: 100,
        maxFixesPerGeneration: 10,
        maxAttempts: 1000
      }) as unknown[]
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(10)
    })
  })

  describe('schema size limits', () => {
    it('should reject schemas with excessive properties', () => {
      // Create schema with too many properties
      const properties: any = {}
      for (let i = 0; i < 10001; i++) {
        properties[`prop${i}`] = { type: 'string' as const }
      }
      
      const schema = {
        type: 'object' as const,
        properties
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/maximum is 10000/)
    })

    it('should handle schemas with reasonable number of properties', () => {
      // Create schema with many but acceptable properties
      const properties: any = {}
      for (let i = 0; i < 100; i++) {
        properties[`prop${i}`] = { type: 'string' as const }
      }
      
      const schema = {
        type: 'object' as const,
        properties,
        required: Object.keys(properties).slice(0, 10) // Only require first 10
      }
      
      const result = generateFromSchema(schema, { seed: SEED }) as any
      
      // Should have at least the required properties
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(10)
    })

    it('should reject arrays with excessive maxItems', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'string' as const },
        maxItems: 10001
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/maxItems must be <= 10000/)
    })
  })

  describe('prototype pollution protection', () => {
    it('should not allow __proto__ pollution via allOf', () => {
      const maliciousSchema = {
        allOf: [
          {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const }
            },
            __proto__: { polluted: true } as any
          }
        ]
      }
      
      // Should generate without polluting Object.prototype
      const result = generateFromSchema(maliciousSchema, { seed: SEED })
      
      // Verify Object.prototype was not polluted
      expect((Object.prototype as any).polluted).toBeUndefined()
      expect(result).toBeDefined()
    })

    it('should not allow constructor pollution via if/then/else', () => {
      const maliciousSchema = {
        type: 'object' as const,
        properties: {
          value: { type: 'boolean' as const }
        },
        if: {
          properties: { value: { const: true } }
        },
        then: {
          properties: { result: { type: 'string' as const } },
          constructor: { polluted: true } as any
        }
      }
      
      // Should generate without polluting
      const result = generateFromSchema(maliciousSchema, { seed: SEED })
      
      // Verify no pollution occurred
      expect(result).toBeDefined()
      expect((result as any).constructor.polluted).toBeUndefined()
    })

    it('should not allow prototype pollution via property names', () => {
      const maliciousSchema = {
        type: 'object' as const,
        properties: {
          __proto__: { type: 'string' as const },
          constructor: { type: 'string' as const },
          normalProp: { type: 'string' as const }
        },
        required: ['normalProp']
      }
      
      // Should generate safely
      const result = generateFromSchema(maliciousSchema, { seed: SEED }) as any
      
      // Should have normal property
      expect(result.normalProp).toBeDefined()
      
      // Dangerous properties might be generated as data (that's ok),
      // but should not pollute prototypes
      expect((Object.prototype as any).type).toBeUndefined()
    })
  })

  describe('invalid constraint values', () => {
    it('should reject NaN in minLength', () => {
      const schema = {
        type: 'string' as const,
        minLength: NaN
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/minLength must be/)
    })

    it('should reject Infinity in maxLength', () => {
      const schema = {
        type: 'string' as const,
        maxLength: Infinity
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/maxLength must be/)
    })

    it('should reject negative minLength', () => {
      const schema = {
        type: 'string' as const,
        minLength: -5
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/minLength must be/)
    })

    it('should reject minLength > maxLength', () => {
      const schema = {
        type: 'string' as const,
        minLength: 10,
        maxLength: 5
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/minLength.*must be <= maxLength/)
    })

    it('should reject NaN in minItems', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: NaN
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/minItems must be/)
    })

    it('should reject Infinity in maxItems', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'string' as const },
        maxItems: Infinity
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/maxItems must be/)
    })

    it('should reject NaN in multipleOf', () => {
      const schema = {
        type: 'number' as const,
        multipleOf: NaN
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/multipleOf must be/)
    })

    it('should reject Infinity in multipleOf', () => {
      const schema = {
        type: 'number' as const,
        multipleOf: Infinity
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow(/multipleOf must be/)
    })
  })
})
