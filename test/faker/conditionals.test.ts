import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('if/then/else conditionals', () => {
  describe('basic if/then', () => {
    it('should apply then branch when condition is true', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          hasAccount: { type: 'boolean' as const },
          accountId: { type: 'string' as const },
        },
        required: ['hasAccount'],
        if: {
          properties: {
            hasAccount: { const: true },
          },
        },
        then: {
          required: ['accountId'],
        },
      }

      // Generate multiple times to test both branches
      for (let i = 0; i < 10; i++) {
        const result = generateFromSchema(schema, { seed: SEED + i }) as ObjectValue

        expect(result).toHaveProperty('hasAccount')
        expect(typeof result.hasAccount).toBe('boolean')

        // If hasAccount is true, accountId must be present
        if (result.hasAccount === true) {
          expect(result).toHaveProperty('accountId')
          expect(typeof result.accountId).toBe('string')
        }

        // Validate
        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
      }
    })

    it('should not require field when condition is false', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          hasAccount: { type: 'boolean' as const },
          accountId: { type: 'string' as const },
        },
        required: ['hasAccount'],
        if: {
          properties: {
            hasAccount: { const: true },
          },
        },
        then: {
          required: ['accountId'],
        },
      }

      // Force hasAccount to false
      const schemaWithFalse = {
        ...schema,
        properties: {
          ...schema.properties,
          hasAccount: { const: false },
        },
      }

      const result = generateFromSchema(schemaWithFalse, { seed: SEED }) as ObjectValue

      expect(result.hasAccount).toBe(false)
      // accountId is optional when hasAccount is false
      // May or may not be present

      const errors = validateSchema(result, schemaWithFalse)
      expect(errors).toEqual([])
    })
  })

  describe('if/then/else', () => {
    it('should apply then branch when condition is true', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          country: { type: 'string' as const, enum: ['US', 'CA', 'UK'] },
          state: { type: 'string' as const },
          province: { type: 'string' as const },
        },
        required: ['country'],
        if: {
          properties: {
            country: { const: 'US' },
          },
        },
        then: {
          required: ['state'],
        },
        else: {
          required: ['province'],
        },
      }

      for (let i = 0; i < 10; i++) {
        const result = generateFromSchema(schema, { seed: SEED + i }) as ObjectValue

        expect(result).toHaveProperty('country')
        expect(['US', 'CA', 'UK']).toContain(result.country)

        if (result.country === 'US') {
          expect(result).toHaveProperty('state')
        } else {
          expect(result).toHaveProperty('province')
        }

        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
      }
    })

    it('should apply else branch when condition is false', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          country: { type: 'string' as const },
          zipCode: { type: 'string' as const },
          postalCode: { type: 'string' as const },
        },
        required: ['country'],
        if: {
          properties: {
            country: { const: 'US' },
          },
        },
        then: {
          required: ['zipCode'],
        },
        else: {
          required: ['postalCode'],
        },
      }

      // Force non-US country
      const schemaWithCA = {
        ...schema,
        properties: {
          ...schema.properties,
          country: { const: 'CA' },
        },
      }

      const result = generateFromSchema(schemaWithCA, { seed: SEED }) as ObjectValue

      expect(result.country).toBe('CA')
      expect(result).toHaveProperty('postalCode')
      // Note: zipCode might be present as optional field, but postalCode is required

      const errors = validateSchema(result, schemaWithCA)
      expect(errors).toEqual([])
    })
  })

  describe('nested conditionals', () => {
    it('should handle conditional within then branch', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          hasAccount: { type: 'boolean' as const },
          accountType: { type: 'string' as const, enum: ['personal', 'business'] },
          personalId: { type: 'string' as const },
          businessId: { type: 'string' as const },
        },
        required: ['hasAccount'],
        if: {
          properties: {
            hasAccount: { const: true },
          },
        },
        then: {
          required: ['accountType'],
          if: {
            properties: {
              accountType: { const: 'personal' },
            },
          },
          then: {
            required: ['personalId'],
          },
          else: {
            required: ['businessId'],
          },
        },
      }

      for (let i = 0; i < 10; i++) {
        const result = generateFromSchema(schema, { seed: SEED + i, maxAttempts: 50 }) as ObjectValue

        expect(result).toHaveProperty('hasAccount')

        if (result.hasAccount === true) {
          expect(result).toHaveProperty('accountType')
          
          if (result.accountType === 'personal') {
            expect(result).toHaveProperty('personalId')
          } else if (result.accountType === 'business') {
            expect(result).toHaveProperty('businessId')
          }
        }

        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
      }
    })
  })

  describe('conditional with property constraints', () => {
    it('should apply property constraints from then branch', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          age: { type: 'integer' as const, minimum: 0, maximum: 120 },
          driversLicense: { type: 'string' as const },
        },
        required: ['age'],
        if: {
          properties: {
            age: { minimum: 16 },
          },
        },
        then: {
          properties: {
            driversLicense: { minLength: 5, maxLength: 20 },
          },
        },
      }

      for (let i = 0; i < 10; i++) {
        const result = generateFromSchema(schema, { 
          seed: SEED + i,
          includeOptionalProbability: 0.8,
        }) as ObjectValue

        expect(result).toHaveProperty('age')
        expect(typeof result.age).toBe('number')

        if (result.driversLicense) {
          expect(typeof result.driversLicense).toBe('string')
          if (typeof result.age === 'number' && result.age >= 16) {
            const license = result.driversLicense as string
            expect(license.length).toBeGreaterThanOrEqual(5)
            expect(license.length).toBeLessThanOrEqual(20)
          }
        }

        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
      }
    })
  })

  describe('real-world: seniority date example', () => {
    it('should handle seniority date conditional like Albania schema', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          has_seniority_date: {
            type: 'string' as const,
            enum: ['yes', 'no'],
          },
          seniority_date: {
            type: 'string' as const,
            format: 'date' as const,
          },
        },
        required: ['has_seniority_date'],
        if: {
          properties: {
            has_seniority_date: { const: 'yes' },
          },
          required: ['has_seniority_date'],
        },
        then: {
          required: ['seniority_date'],
        },
        else: {
          properties: {
            seniority_date: false,
          },
        },
      }

      for (let i = 0; i < 10; i++) {
        const result = generateFromSchema(schema, { seed: SEED + i }) as ObjectValue

        expect(result).toHaveProperty('has_seniority_date')
        expect(['yes', 'no']).toContain(result.has_seniority_date)

        if (result.has_seniority_date === 'yes') {
          expect(result).toHaveProperty('seniority_date')
          expect(typeof result.seniority_date).toBe('string')
        }

        const errors = validateSchema(result, schema)
        expect(errors).toEqual([])
      }
    })
  })

  describe('edge cases', () => {
    it('should handle if with no then/else', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          value: { type: 'string' as const },
        },
        if: {
          properties: {
            value: { minLength: 5 },
          },
        },
        // No then or else - just validates
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue
      const errors = validateSchema(result, schema)
      expect(errors).toEqual([])
    })

    it('should handle boolean if condition', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          email: { type: 'string' as const, format: 'email' as const },
        },
        required: ['name'],
        if: true, // Always true
        then: {
          required: ['email'],
        },
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('email')

      const errors = validateSchema(result, schema)
      expect(errors).toEqual([])
    })
  })
})
