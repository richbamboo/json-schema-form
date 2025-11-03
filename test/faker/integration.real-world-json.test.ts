import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { JsfSchema, ObjectValue } from '../../src/types'

const SEED = 42

describe('real-world JSON schema files', () => {
  it('should load and parse Albania employment schema JSON file with conditionals', () => {
    // Demonstrates real-world usage: Load JSON file -> Parse -> Use
    // This schema has if/then/else conditionals (M12 feature)
    const jsonFilePath = join(__dirname, 'schemas', 'employment_basic_information_ALB.json')
    const jsonContent = readFileSync(jsonFilePath, 'utf-8')
    const schema = JSON.parse(jsonContent) as JsfSchema
    
    // Verify schema structure
    expect(schema).toHaveProperty('properties')
    expect(schema).toHaveProperty('required')
    expect(schema).toHaveProperty('allOf')
    
    // Verify required fields are defined in schema
    expect(schema.required).toContain('name')
    expect(schema.required).toContain('email')
    expect(schema.required).toContain('job_title')
    expect(schema.required).toContain('has_seniority_date')
    
    // Generate with full schema including if/then/else conditionals
    const result = generateFromSchema(schema, { 
      seed: SEED, 
      maxAttempts: 50,
      includeOptionalProbability: 0.3
    }) as ObjectValue

    // Verify basic structure
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('email')
    expect(result).toHaveProperty('job_title')
    expect(result).toHaveProperty('has_seniority_date')
    
    expect(typeof result.email).toBe('string')
    expect(result.email).toContain('@')
    
    // Verify conditional logic: if has_seniority_date === 'yes', then seniority_date is required
    if (result.has_seniority_date === 'yes') {
      expect(result).toHaveProperty('seniority_date')
    } else {
      // When has_seniority_date !== 'yes', seniority_date should not be present (false schema)
      expect(result.seniority_date).toBeUndefined()
    }
    
    // Validate against full schema
    const errors = validateSchema(result, schema)
    expect(errors).toEqual([])
  })

  it('should demonstrate typical usage pattern: JSON string -> parsed -> generated', () => {
    // Simulating receiving a JSON string (e.g., from API, file, etc.)
    const jsonString = JSON.stringify({
      type: 'object',
      properties: {
        username: { 
          type: 'string', 
          minLength: 3,
          maxLength: 20,
          pattern: '^[a-zA-Z0-9_]+$'
        },
        email: { type: 'string', format: 'email' },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'moderator']
        },
        settings: {
          type: 'object',
          properties: {
            notifications: { type: 'boolean' },
            theme: { type: 'string', enum: ['light', 'dark'] }
          },
          required: ['theme']
        }
      },
      required: ['username', 'email', 'role', 'settings']
    })

    // Parse JSON string
    const schema = JSON.parse(jsonString) as JsfSchema

    // Generate data
    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    // Verify
    expect(result).toHaveProperty('username')
    expect(result).toHaveProperty('email')
    expect(result).toHaveProperty('role')
    expect(result).toHaveProperty('settings')

    expect(result.username).toMatch(/^[a-zA-Z0-9_]+$/)
    expect(['admin', 'user', 'moderator']).toContain(result.role)

    const settings = result.settings as ObjectValue
    expect(settings).toHaveProperty('theme')
    expect(['light', 'dark']).toContain(settings.theme)

    // Validate
    expect(validateSchema(result, schema)).toEqual([])
  })
})
