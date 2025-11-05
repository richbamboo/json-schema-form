import { describe, expect, it } from '@jest/globals'
import { 
  generateFromSchema, 
  generateFromSchemaWithMetadata,
  GenerationError,
  UnsupportedGenerationError,
  UnsatisfiableSchemaError,
  MaxAttemptsExceededError,
} from '../../src'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('end-to-end integration', () => {
  describe('public API', () => {
    it('should export all necessary functions and types', () => {
      expect(generateFromSchema).toBeDefined()
      expect(generateFromSchemaWithMetadata).toBeDefined()
      expect(GenerationError).toBeDefined()
      expect(UnsupportedGenerationError).toBeDefined()
      expect(UnsatisfiableSchemaError).toBeDefined()
      expect(MaxAttemptsExceededError).toBeDefined()
    })

    it('should generate simple values', () => {
      const schema = { type: 'string' as const }
      const result = generateFromSchema(schema, { seed: SEED })
      
      expect(typeof result).toBe('string')
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should generate with metadata', () => {
      const schema = { type: 'number' as const, minimum: 0, maximum: 100 }
      const result = generateFromSchemaWithMetadata(schema, { seed: SEED })
      
      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('attempts')
      expect(typeof (result as any).value).toBe('number')
      expect((result as any).attempts).toBeGreaterThan(0)
    })

    it('should generate multiple values', () => {
      const schema = { type: 'boolean' as const }
      const result = generateFromSchema(schema, { seed: SEED, count: 5 }) as any[]
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(5)
      result.forEach((val: any) => {
        expect(typeof val).toBe('boolean')
      })
    })
  })

  describe('complex schema generation', () => {
    it('should handle deeply nested schema with all features', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          // Primitives with constraints
          id: { type: 'string' as const, pattern: '^[A-Z]{3}-[0-9]{4}$' },
          name: { type: 'string' as const, minLength: 3, maxLength: 50 },
          age: { type: 'integer' as const, minimum: 18, maximum: 120 },
          score: { type: 'number' as const, minimum: 0, maximum: 100, multipleOf: 0.5 },
          active: { type: 'boolean' as const },
          
          // Formats
          email: { type: 'string' as const, format: 'email' as const },
          website: { type: 'string' as const, format: 'uri' as const },
          birthdate: { type: 'string' as const, format: 'date' as const },
          
          // Enums
          role: { type: 'string' as const, enum: ['admin', 'user', 'guest'] },
          
          // Arrays
          tags: {
            type: 'array' as const,
            items: { type: 'string' as const },
            minItems: 1,
            maxItems: 5,
            uniqueItems: true
          },
          
          // Nested objects
          address: {
            type: 'object' as const,
            properties: {
              street: { type: 'string' as const },
              city: { type: 'string' as const },
              zipCode: { type: 'string' as const, pattern: '^[0-9]{5}$' }
            },
            required: ['city']
          },
          
          // Array of objects
          contacts: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                type: { type: 'string' as const, enum: ['phone', 'email'] },
                value: { type: 'string' as const }
              },
              required: ['type', 'value']
            },
            minItems: 1,
            maxItems: 3
          }
        },
        required: ['id', 'name', 'email', 'role', 'tags'],
        
        // Conditionals
        allOf: [
          {
            if: {
              properties: { role: { const: 'admin' } }
            },
            then: {
              properties: {
                permissions: {
                  type: 'array' as const,
                  items: { type: 'string' as const },
                  minItems: 1
                }
              },
              required: ['permissions']
            }
          }
        ]
      }
      
      // Generate multiple times to test different branches
      for (let i = 0; i < 5; i++) {
        const result = generateFromSchema(schema, { 
          seed: SEED + i,
          maxGenerations: 50,
          maxFixesPerGeneration: 10
        }) as any
        
        // Validate the result
        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
        
        // Verify required fields
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('email')
        expect(result).toHaveProperty('role')
        expect(result).toHaveProperty('tags')
        
        // Verify types
        expect(typeof result.id).toBe('string')
        expect(result.id).toMatch(/^[A-Z]{3}-[0-9]{4}$/)
        expect(typeof result.name).toBe('string')
        expect(result.name.length).toBeGreaterThanOrEqual(3)
        expect(result.email).toContain('@')
        expect(['admin', 'user', 'guest']).toContain(result.role)
        expect(Array.isArray(result.tags)).toBe(true)
        
        // Verify conditional logic
        if (result.role === 'admin') {
          expect(result).toHaveProperty('permissions')
          expect(Array.isArray(result.permissions)).toBe(true)
        }
        
        // Verify nested structures
        if (result.address) {
          expect(result.address).toHaveProperty('city')
        }
        
        if (result.contacts) {
          expect(Array.isArray(result.contacts)).toBe(true)
          result.contacts.forEach((contact: any) => {
            expect(['phone', 'email']).toContain(contact.type)
            expect(typeof contact.value).toBe('string')
          })
        }
      }
    })
  })

  describe('error handling', () => {
    it('should throw UnsatisfiableSchemaError for contradictory constraints', () => {
      const schema = {
        type: 'string' as const,
        minLength: 10,
        maxLength: 5
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED }))
        .toThrow(/minLength.*must be <= maxLength/)
    })

    it('should throw MaxAttemptsExceededError when generation fails', () => {
      const schema = {
        type: 'string' as const,
        pattern: '^impossible-pattern-that-never-matches$',
        minLength: 100
      }
      
      expect(() => generateFromSchema(schema, { 
        seed: SEED, 
        maxAttempts: 10 
      })).toThrow(MaxAttemptsExceededError)
    })

    it('should handle invalid schema gracefully', () => {
      const schema = {
        type: 'number' as const,
        multipleOf: NaN
      }
      
      expect(() => generateFromSchema(schema, { seed: SEED }))
        .toThrow(/multipleOf must be/)
    })
  })

  describe('determinism', () => {
    it('should generate identical results with same seed', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          age: { type: 'integer' as const, minimum: 0, maximum: 100 },
          tags: {
            type: 'array' as const,
            items: { type: 'string' as const },
            minItems: 2,
            maxItems: 5
          }
        },
        required: ['name', 'age']
      }
      
      const result1 = generateFromSchema(schema, { seed: 12345 })
      const result2 = generateFromSchema(schema, { seed: 12345 })
      
      expect(result1).toEqual(result2)
    })

    it('should generate different results with different seeds', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          value: { type: 'integer' as const, minimum: 0, maximum: 1000000 }
        },
        required: ['value']
      }
      
      const result1 = generateFromSchema(schema, { seed: 111 }) as any
      const result2 = generateFromSchema(schema, { seed: 222 }) as any
      
      // With such a large range, different seeds should produce different values
      expect(result1.value).not.toEqual(result2.value)
    })
  })

  describe('performance', () => {
    it('should handle large schemas efficiently', () => {
      // Create schema with 100 properties
      const properties: any = {}
      for (let i = 0; i < 100; i++) {
        properties[`field${i}`] = { type: 'string' as const }
      }
      
      const schema = {
        type: 'object' as const,
        properties,
        required: Object.keys(properties).slice(0, 10)
      }
      
      const startTime = Date.now()
      const result = generateFromSchema(schema, { seed: SEED }) as any
      const endTime = Date.now()
      
      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      
      // Should have all required properties
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(10)
    })

    it('should handle large arrays efficiently', () => {
      const schema = {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'integer' as const },
            name: { type: 'string' as const }
          },
          required: ['id', 'name']
        },
        minItems: 100,
        maxItems: 100
      }
      
      const startTime = Date.now()
      const result = generateFromSchema(schema, { seed: SEED }) as any[]
      const endTime = Date.now()
      
      // Should complete in reasonable time (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000)
      
      expect(result).toHaveLength(100)
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
