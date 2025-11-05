import { describe, expect, it } from '@jest/globals'
import {
  GenerationError,
  MaxAttemptsExceededError,
  UnsatisfiableSchemaError,
  UnsupportedGenerationError,
} from '../../src/faker/errors'

describe('faker errors', () => {
  it('should create UnsupportedGenerationError', () => {
    const schema = { type: 'string' as const, pattern: 'a', allOf: [{ pattern: 'b' }] }
    const error = new UnsupportedGenerationError('unsupported composite pattern', schema)

    expect(error).toBeInstanceOf(GenerationError)
    expect(error.name).toBe('UnsupportedGenerationError')
    expect(error.message).toContain('unsupported')
    expect(error.schema).toBe(schema)
  })

  it('should create UnsatisfiableSchemaError', () => {
    const schema = { type: 'string' as const, minLength: 10, maxLength: 5 }
    const error = new UnsatisfiableSchemaError('minLength > maxLength', schema)

    expect(error).toBeInstanceOf(GenerationError)
    expect(error.name).toBe('UnsatisfiableSchemaError')
    expect(error.message).toContain('minLength')
    expect(error.schema).toBe(schema)
  })

  it('should create MaxAttemptsExceededError', () => {
    const error = new MaxAttemptsExceededError('failed after 30 attempts', 30, [{ validation: 'minLength' }])

    expect(error).toBeInstanceOf(GenerationError)
    expect(error.name).toBe('MaxAttemptsExceededError')
    expect(error.attempts).toBe(30)
    expect(error.lastErrors).toHaveLength(1)
  })

  it('should throw for empty enum array (unsatisfiable)', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const, enum: [] }
    
    // Empty enum is unsatisfiable - no valid values exist
    expect(() => generateFromSchema(schema, { seed: 42 })).toThrow(UnsatisfiableSchemaError)
  })

  it('should handle type array with only null', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: ['null'] as const }
    
    const result = generateFromSchema(schema, { seed: 42 })
    expect(result).toBe(null)
  })

  it('should handle type array with multiple types', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: ['null', 'string'] as const }
    
    // Should pick first non-null type (string)
    const result = generateFromSchema(schema, { seed: 42 })
    expect(typeof result).toBe('string')
  })

  it('should validate count option', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { count: 0 })).toThrow('count must be a finite integer >= 1')
    expect(() => generateFromSchema(schema, { count: -1 })).toThrow('count must be a finite integer >= 1')
  })

  it('should validate includeOptionalProbability option', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { includeOptionalProbability: -0.1 })).toThrow('includeOptionalProbability must be a finite number in [0, 1]')
    expect(() => generateFromSchema(schema, { includeOptionalProbability: 1.1 })).toThrow('includeOptionalProbability must be a finite number in [0, 1]')
  })

  it('should validate maxGenerations option', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { maxGenerations: 0 })).toThrow('maxGenerations must be a finite integer >= 1')
  })

  it('should validate maxAttempts option', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { maxAttempts: 0 })).toThrow('maxAttempts must be a finite integer >= 1')
  })

  it('should accept string seeds', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    const result1 = generateFromSchema(schema, { seed: 'test-seed' })
    const result2 = generateFromSchema(schema, { seed: 'test-seed' })
    
    // Same string seed should produce same result
    expect(result1).toBe(result2)
  })

  it('should reject NaN in numeric options', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { count: NaN })).toThrow('count must be a finite integer')
    expect(() => generateFromSchema(schema, { maxGenerations: NaN })).toThrow('maxGenerations must be a finite integer')
  })

  it('should reject Infinity in numeric options', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { count: Infinity })).toThrow('count must be a finite integer')
    expect(() => generateFromSchema(schema, { maxAttempts: Infinity })).toThrow('maxAttempts must be a finite integer')
  })

  it('should throw UnsatisfiableSchemaError for false schema', () => {
    const { generateFromSchema } = require('../../src/faker')
    
    expect(() => generateFromSchema(false, { seed: 42 })).toThrow(UnsatisfiableSchemaError)
  })

  it('should generate value for true schema', () => {
    const { generateFromSchema } = require('../../src/faker')
    
    const result = generateFromSchema(true, { seed: 42 })
    expect(result).toBeDefined()
  })

  it('should handle empty examples array gracefully', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const, examples: [] }
    
    // Should fall through to type-based generation
    const result = generateFromSchema(schema, { seed: 42, useExamples: true })
    expect(typeof result).toBe('string')
  })

  it('should reject fractional count', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { count: 5.7 })).toThrow('count must be a finite integer')
  })

  it('should reject fractional maxGenerations', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { maxGenerations: 10.5 })).toThrow('maxGenerations must be a finite integer')
  })

  it('should produce consistent hashes for long strings', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    // Test with a very long string seed to ensure no overflow issues
    const longSeed = 'a'.repeat(1000)
    const result1 = generateFromSchema(schema, { seed: longSeed })
    const result2 = generateFromSchema(schema, { seed: longSeed })
    
    expect(result1).toBe(result2)
  })

  it('should reject empty string seed', () => {
    const { generateFromSchema } = require('../../src/faker')
    const schema = { type: 'string' as const }
    
    expect(() => generateFromSchema(schema, { seed: '' })).toThrow('seed cannot be an empty string')
  })
})
