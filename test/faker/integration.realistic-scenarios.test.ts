import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('realistic form scenarios', () => {
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
