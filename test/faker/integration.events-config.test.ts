import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('events, settings & configuration forms', () => {
  describe('7. Event Registration with Attendees', () => {
    it('should generate event registration with array of attendee objects', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          eventName: {
            type: 'string' as const,
            minLength: 1,
          },
          eventDate: {
            type: 'string' as const,
            format: 'date' as const,
          },
          attendees: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                name: { type: 'string' as const, minLength: 1 },
                email: { type: 'string' as const, format: 'email' as const },
                dietaryRestrictions: {
                  type: 'string' as const,
                  enum: ['none', 'vegetarian', 'vegan', 'gluten-free', 'other'],
                },
                ticketType: {
                  type: 'string' as const,
                  enum: ['general', 'vip', 'student'],
                },
              },
              required: ['name', 'email', 'dietaryRestrictions'],
            },
            minItems: 1,
            maxItems: 4,
          },
          specialRequests: {
            type: 'string' as const,
            maxLength: 500,
          },
        },
        required: ['eventName', 'eventDate', 'attendees'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('eventName')
      expect(result).toHaveProperty('eventDate')
      expect(result).toHaveProperty('attendees')

      // Verify attendees array
      expect(Array.isArray(result.attendees)).toBe(true)
      const attendees = result.attendees as ObjectValue[]
      expect(attendees.length).toBeGreaterThanOrEqual(1)
      expect(attendees.length).toBeLessThanOrEqual(4)

      // Verify each attendee
      attendees.forEach(attendee => {
        expect(attendee).toHaveProperty('name')
        expect(attendee).toHaveProperty('email')
        expect(attendee).toHaveProperty('dietaryRestrictions')
        expect(['none', 'vegetarian', 'vegan', 'gluten-free', 'other']).toContain(
          attendee.dietaryRestrictions
        )
        if (attendee.ticketType) {
          expect(['general', 'vip', 'student']).toContain(attendee.ticketType)
        }
      })

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('8. Settings/Preferences Form', () => {
    it('should generate settings with many booleans and enums', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          emailNotifications: { type: 'boolean' as const },
          smsNotifications: { type: 'boolean' as const },
          pushNotifications: { type: 'boolean' as const },
          newsletter: { type: 'boolean' as const },
          theme: {
            type: 'string' as const,
            enum: ['light', 'dark', 'auto'],
          },
          language: {
            type: 'string' as const,
            enum: ['en', 'es', 'fr', 'de', 'ja'],
          },
          fontSize: {
            type: 'string' as const,
            enum: ['small', 'medium', 'large'],
          },
          updateFrequency: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 24,
          },
          autoSave: { type: 'boolean' as const },
          twoFactorAuth: { type: 'boolean' as const },
        },
        required: ['theme', 'language'],
      }

      const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('theme')
      expect(result).toHaveProperty('language')

      // Verify enums
      expect(['light', 'dark', 'auto']).toContain(result.theme)
      expect(['en', 'es', 'fr', 'de', 'ja']).toContain(result.language)

      // Check optional booleans exist
      const booleanFields = [
        'emailNotifications', 'smsNotifications', 'pushNotifications',
        'newsletter', 'autoSave', 'twoFactorAuth'
      ]
      booleanFields.forEach(field => {
        if (result[field] !== undefined) {
          expect(typeof result[field]).toBe('boolean')
        }
      })

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('9. Address Form with International Support', () => {
    it('should generate international address with country-specific fields', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          fullName: {
            type: 'string' as const,
            minLength: 1,
          },
          addressLine1: {
            type: 'string' as const,
            minLength: 1,
          },
          addressLine2: {
            type: 'string' as const,
          },
          city: {
            type: 'string' as const,
            minLength: 1,
          },
          state: {
            type: 'string' as const,
          },
          country: {
            type: 'string' as const,
            enum: ['US', 'CA', 'UK', 'AU', 'DE', 'FR', 'JP'],
          },
          postalCode: {
            type: 'string' as const,
            pattern: '^[A-Z0-9\\s-]{3,10}$',
          },
          phone: {
            type: 'string' as const,
            pattern: '^\\+?[0-9\\s-()]{10,20}$',
          },
        },
        required: ['fullName', 'addressLine1', 'city', 'country'],
      }

      const result = generateFromSchema(schema, { seed: SEED, maxAttempts: 50 }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('fullName')
      expect(result).toHaveProperty('addressLine1')
      expect(result).toHaveProperty('city')
      expect(result).toHaveProperty('country')

      // Verify country enum
      expect(['US', 'CA', 'UK', 'AU', 'DE', 'FR', 'JP']).toContain(result.country)

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })

  describe('10. API Configuration Form', () => {
    it('should generate technical API configuration', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          apiName: {
            type: 'string' as const,
            minLength: 1,
          },
          endpoint: {
            type: 'string' as const,
            format: 'uri' as const,
          },
          apiKey: {
            type: 'string' as const,
            pattern: '^[a-zA-Z0-9_-]{32,64}$',
          },
          timeout: {
            type: 'integer' as const,
            minimum: 100,
            maximum: 30000,
          },
          retries: {
            type: 'integer' as const,
            minimum: 0,
            maximum: 5,
          },
          headers: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                key: { type: 'string' as const },
                value: { type: 'string' as const },
              },
              required: ['key', 'value'],
            },
            minItems: 0,
            maxItems: 5,
          },
          retryConfig: {
            type: 'object' as const,
            properties: {
              initialDelay: { type: 'integer' as const, minimum: 100 },
              maxDelay: { type: 'integer' as const, minimum: 1000 },
              backoffMultiplier: { type: 'number' as const, minimum: 1, maximum: 3 },
            },
            required: ['initialDelay'],
          },
        },
        required: ['apiName', 'endpoint', 'timeout'],
      }

      const result = generateFromSchema(schema, { seed: SEED, maxAttempts: 50 }) as ObjectValue

      // Verify required fields
      expect(result).toHaveProperty('apiName')
      expect(result).toHaveProperty('endpoint')
      expect(result).toHaveProperty('timeout')

      // Verify endpoint format
      expect(result.endpoint).toMatch(/^https?:\/\//)

      // Verify timeout constraints
      expect(typeof result.timeout).toBe('number')
      expect(result.timeout).toBeGreaterThanOrEqual(100)
      expect(result.timeout).toBeLessThanOrEqual(30000)

      // Verify optional headers array
      if (result.headers) {
        expect(Array.isArray(result.headers)).toBe(true)
        const headers = result.headers as ObjectValue[]
        headers.forEach(header => {
          expect(header).toHaveProperty('key')
          expect(header).toHaveProperty('value')
        })
      }

      // Verify optional nested retryConfig
      if (result.retryConfig) {
        const retryConfig = result.retryConfig as ObjectValue
        expect(retryConfig).toHaveProperty('initialDelay')
        expect(typeof retryConfig.initialDelay).toBe('number')
      }

      // Validate
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
