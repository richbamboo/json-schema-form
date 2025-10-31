import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('composition generation', () => {
  describe('allOf', () => {
    it('should generate value satisfying all allOf schemas', () => {
      const schema = {
        allOf: [
          { type: 'string' as const },
          { minLength: 5 },
          { maxLength: 10 },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED }) as string

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThanOrEqual(5)
      expect(result.length).toBeLessThanOrEqual(10)
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should generate number satisfying allOf constraints', () => {
      const schema = {
        allOf: [
          { type: 'number' as const },
          { minimum: 10 },
          { maximum: 20 },
          { multipleOf: 5 },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED }) as number

      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(10)
      expect(result).toBeLessThanOrEqual(20)
      expect(result % 5).toBe(0)
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should throw for unsupported allOf with multiple patterns', () => {
      const schema = {
        allOf: [
          { type: 'string' as const, pattern: '^[a-z]+$' },
          { pattern: '^[a-z]{5}$' },
        ],
      }

      expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('multiple pattern')
    })

    it('should handle allOf with object schemas', () => {
      const schema = {
        allOf: [
          {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
            },
            required: ['name'],
          },
          {
            type: 'object' as const,
            properties: {
              age: { type: 'number' as const },
            },
            required: ['age'],
          },
        ],
      } as const
      const result = generateFromSchema(schema as any, { seed: SEED, maxAttempts: 50 })

      expect(validateSchema(result, schema as any)).toEqual([])
    })
  })

  describe('anyOf', () => {
    it('should generate value matching one of anyOf schemas', () => {
      const schema = {
        anyOf: [
          { type: 'string' as const, minLength: 5 },
          { type: 'number' as const, minimum: 0 },
          { type: 'boolean' as const },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED })

      // Should match at least one schema
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should be deterministic with same seed', () => {
      const schema = {
        anyOf: [
          { type: 'string' as const },
          { type: 'number' as const },
        ],
      }
      const result1 = generateFromSchema(schema, { seed: SEED })
      const result2 = generateFromSchema(schema, { seed: SEED })

      expect(result1).toEqual(result2)
    })

    it('should handle anyOf with different types', () => {
      const schema = {
        anyOf: [
          { type: 'string' as const, format: 'email' as const },
          { type: 'integer' as const, minimum: 1, maximum: 100 },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED })

      expect(validateSchema(result, schema)).toEqual([])
      // Result should be either string or number
      expect(['string', 'number']).toContain(typeof result)
    })
  })

  describe('oneOf', () => {
    it('should generate value matching exactly one oneOf schema', () => {
      const schema = {
        oneOf: [
          { type: 'string' as const, minLength: 5 },
          { type: 'number' as const },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED })

      // Should match exactly one schema
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should handle oneOf with disjoint schemas', () => {
      const schema = {
        oneOf: [
          { type: 'string' as const },
          { type: 'number' as const },
          { type: 'boolean' as const },
        ],
      }
      const result = generateFromSchema(schema, { seed: SEED })

      expect(validateSchema(result, schema)).toEqual([])
      expect(['string', 'number', 'boolean']).toContain(typeof result)
    })

    it('should be deterministic with same seed', () => {
      const schema = {
        oneOf: [
          { const: 'option1' },
          { const: 'option2' },
          { const: 'option3' },
        ],
      }
      const result1 = generateFromSchema(schema, { seed: SEED })
      const result2 = generateFromSchema(schema, { seed: SEED })

      expect(result1).toEqual(result2)
    })
  })

  describe('not', () => {
    it('should generate value not matching not schema (via retry loop)', () => {
      const schema = {
        type: 'string' as const,
        not: { const: 'forbidden' },
      }
      const result = generateFromSchema(schema, { seed: SEED, maxAttempts: 50 }) as string

      expect(typeof result).toBe('string')
      expect(result).not.toBe('forbidden')
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
