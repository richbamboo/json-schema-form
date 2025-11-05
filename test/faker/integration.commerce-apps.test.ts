import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('commerce & application forms', () => {
  describe('4. E-commerce Product Form', () => {
    it('should generate product listing with arrays and numbers', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          productName: {
            type: 'string' as const,
            minLength: 3,
            maxLength: 100,
          },
          price: {
            type: 'number' as const,
            minimum: 1,
            maximum: 10000,
          },
          quantity: {
            type: 'integer' as const,
            minimum: 0,
            maximum: 10000,
          },
          category: {
            type: 'string' as const,
            enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
          },
          tags: {
            type: 'array' as const,
            items: {
              type: 'string' as const,
            },
            minItems: 1,
            maxItems: 5,
          },
          specifications: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                key: { type: 'string' as const },
                value: { type: 'string' as const },
              },
              required: ['key', 'value'],
            },
            minItems: 1,
            maxItems: 3,
          },
        },
        required: ['productName', 'price', 'quantity', 'category', 'tags'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('productName')
      expect(result).toHaveProperty('price')
      expect(result).toHaveProperty('quantity')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('tags')

      // Verify number constraints
      expect(typeof result.price).toBe('number')
      expect(result.price).toBeGreaterThanOrEqual(0.01)
      expect(result.price).toBeLessThanOrEqual(10000)
      
      expect(typeof result.quantity).toBe('number')
      expect(Number.isInteger(result.quantity)).toBe(true)

      // Verify enum
      expect(['Electronics', 'Clothing', 'Books', 'Home', 'Sports']).toContain(result.category)

      // Verify arrays
      expect(Array.isArray(result.tags)).toBe(true)
      expect((result.tags as unknown[]).length).toBeGreaterThanOrEqual(1)
      expect((result.tags as unknown[]).length).toBeLessThanOrEqual(5)

      // Verify specifications array of objects
      if (result.specifications) {
        expect(Array.isArray(result.specifications)).toBe(true)
        const specs = result.specifications as ObjectValue[]
        specs.forEach(spec => {
          expect(spec).toHaveProperty('key')
          expect(spec).toHaveProperty('value')
        })
      }

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('5. Multi-step Survey with Composition', () => {
    it('should generate survey using allOf composition', () => {
      const schema = {
        allOf: [
          {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const, minLength: 1 },
              email: { type: 'string' as const, format: 'email' as const },
              age: { type: 'integer' as const, minimum: 18, maximum: 100 },
            },
            required: ['name', 'email'],
          },
          {
            type: 'object' as const,
            properties: {
              experience: {
                type: 'string' as const,
                enum: ['beginner', 'intermediate', 'expert'],
              },
              interests: {
                type: 'array' as const,
                items: { type: 'string' as const },
                minItems: 1,
                maxItems: 3,
              },
            },
            required: ['experience'],
          },
        ],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify fields from both allOf schemas
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('experience')

      // Verify experience enum
      expect(['beginner', 'intermediate', 'expert']).toContain(result.experience)

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should generate form with anyOf payment options', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          customerName: { type: 'string' as const },
          paymentMethod: {
            anyOf: [
              {
                type: 'object' as const,
                properties: {
                  type: { const: 'credit_card' },
                  cardNumber: { type: 'string' as const, pattern: '^[0-9]{16}$' },
                },
                required: ['type', 'cardNumber'],
              },
              {
                type: 'object' as const,
                properties: {
                  type: { const: 'paypal' },
                  email: { type: 'string' as const, format: 'email' as const },
                },
                required: ['type', 'email'],
              },
            ],
          },
        },
        required: ['customerName', 'paymentMethod'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      expect(result).toHaveProperty('customerName')
      expect(result).toHaveProperty('paymentMethod')

      // Validate (anyOf will be satisfied by one option)
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('6. Job Application Form', () => {
    it('should generate complex job application with arrays of objects', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          applicantName: {
            type: 'string' as const,
            minLength: 1,
          },
          email: {
            type: 'string' as const,
            format: 'email' as const,
          },
          phone: {
            type: 'string' as const,
            pattern: '^\\d{10}$',
          },
          workHistory: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                company: { type: 'string' as const },
                position: { type: 'string' as const },
                years: { type: 'integer' as const, minimum: 0, maximum: 50 },
              },
              required: ['company', 'position', 'years'],
            },
            minItems: 1,
            maxItems: 3,
          },
          education: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                institution: { type: 'string' as const },
                degree: { type: 'string' as const },
                year: { type: 'integer' as const, minimum: 1950, maximum: 2024 },
              },
              required: ['institution', 'degree'],
            },
            minItems: 1,
            maxItems: 3,
          },
          skills: {
            type: 'array' as const,
            items: { type: 'string' as const },
            uniqueItems: true,
            minItems: 2,
            maxItems: 5,
          },
          desiredSalary: {
            type: 'integer' as const,
            minimum: 30000,
            maximum: 300000,
            multipleOf: 1000,
          },
        },
        required: ['applicantName', 'email', 'workHistory', 'education'],
      }

      const result = generateFromSchema(schema, { seed: SEED, maxAttempts: 50 }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('applicantName')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('workHistory')
      expect(result).toHaveProperty('education')

      // Verify work history array
      expect(Array.isArray(result.workHistory)).toBe(true)
      const workHistory = result.workHistory as ObjectValue[]
      expect(workHistory.length).toBeGreaterThanOrEqual(1)
      workHistory.forEach(job => {
        expect(job).toHaveProperty('company')
        expect(job).toHaveProperty('position')
        expect(job).toHaveProperty('years')
        expect(typeof job.years).toBe('number')
        expect(job.years).toBeGreaterThanOrEqual(0)
        expect(job.years).toBeLessThanOrEqual(50)
      })

      // Verify education array
      expect(Array.isArray(result.education)).toBe(true)
      const education = result.education as ObjectValue[]
      expect(education.length).toBeGreaterThanOrEqual(1)
      education.forEach(edu => {
        expect(edu).toHaveProperty('institution')
        expect(edu).toHaveProperty('degree')
      })

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
