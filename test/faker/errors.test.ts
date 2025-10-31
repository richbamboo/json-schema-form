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
})
