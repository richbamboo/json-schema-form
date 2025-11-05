import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('user & contact forms', () => {
  describe('1. Simple Registration Form', () => {
    it('should generate complete registration form data', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string' as const,
            format: 'email' as const,
          },
          password: {
            type: 'string' as const,
            minLength: 8,
            maxLength: 128,
          },
          firstName: {
            type: 'string' as const,
            minLength: 1,
            maxLength: 50,
          },
          lastName: {
            type: 'string' as const,
            minLength: 1,
            maxLength: 50,
          },
          age: {
            type: 'integer' as const,
            minimum: 18,
            maximum: 120,
          },
          agreeToTerms: {
            type: 'boolean' as const,
          },
        },
        required: ['email', 'password', 'firstName', 'lastName', 'agreeToTerms'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify all required fields present
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('password')
      expect(result).toHaveProperty('firstName')
      expect(result).toHaveProperty('lastName')
      expect(result).toHaveProperty('agreeToTerms')

      // Verify types and constraints
      expect(typeof result.email).toBe('string')
      expect(result.email).toContain('@')
      expect(typeof result.password).toBe('string')
      expect((result.password as string).length).toBeGreaterThanOrEqual(8)
      expect((result.password as string).length).toBeLessThanOrEqual(128)
      expect(typeof result.firstName).toBe('string')
      expect(typeof result.lastName).toBe('string')
      expect(typeof result.agreeToTerms).toBe('boolean')

      // Validate against schema
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('2. Contact Form with Enum', () => {
    it('should generate contact form with dropdown selections', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string' as const,
            minLength: 1,
            maxLength: 100,
          },
          email: {
            type: 'string' as const,
            format: 'email' as const,
          },
          subject: {
            type: 'string' as const,
            enum: ['General Inquiry', 'Support', 'Sales', 'Feedback'],
          },
          message: {
            type: 'string' as const,
            minLength: 10,
            maxLength: 1000,
          },
          priority: {
            type: 'string' as const,
            enum: ['low', 'medium', 'high'],
          },
        },
        required: ['name', 'email', 'subject', 'message'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('subject')
      expect(result).toHaveProperty('message')

      // Verify enum selections
      expect(['General Inquiry', 'Support', 'Sales', 'Feedback']).toContain(result.subject)
      
      if (result.priority) {
        expect(['low', 'medium', 'high']).toContain(result.priority)
      }

      // Verify message length
      expect((result.message as string).length).toBeGreaterThanOrEqual(10)
      expect((result.message as string).length).toBeLessThanOrEqual(1000)

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('3. User Profile with Nested Objects', () => {
    it('should generate user profile with nested structure', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          username: {
            type: 'string' as const,
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9_]+$',
          },
          email: {
            type: 'string' as const,
            format: 'email' as const,
          },
          profile: {
            type: 'object' as const,
            properties: {
              bio: {
                type: 'string' as const,
                maxLength: 500,
              },
              website: {
                type: 'string' as const,
                format: 'uri' as const,
              },
              avatar: {
                type: 'string' as const,
                format: 'uri' as const,
              },
            },
            required: ['bio'],
          },
          address: {
            type: 'object' as const,
            properties: {
              street: {
                type: 'string' as const,
              },
              city: {
                type: 'string' as const,
              },
              country: {
                type: 'string' as const,
                enum: ['US', 'CA', 'UK', 'AU'],
              },
              postalCode: {
                type: 'string' as const,
                pattern: '^[0-9]{5}$',
              },
            },
            required: ['city', 'country'],
          },
        },
        required: ['username', 'email', 'profile'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('username')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('profile')

      // Verify username pattern
      expect(result.username).toMatch(/^[a-zA-Z0-9_]+$/)

      // Verify nested profile object
      const profile = result.profile as ObjectValue
      expect(profile).toHaveProperty('bio')
      expect(typeof profile.bio).toBe('string')
      
      if (profile.website) {
        expect(profile.website).toMatch(/^https?:\/\//)
      }

      // Verify optional nested address
      if (result.address) {
        const address = result.address as ObjectValue
        expect(address).toHaveProperty('city')
        expect(address).toHaveProperty('country')
        expect(['US', 'CA', 'UK', 'AU']).toContain(address.country)
      }

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
