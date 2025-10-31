import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { ObjectValue } from '../../src/types'

const SEED = 42

describe('x-jsf-logic generation', () => {
  it('should generate values that pass x-jsf-logic validations via retry loop', () => {
    const schema = {
      type: 'object' as const,
      'x-jsf-logic': {
        validations: {
          ageCheck: {
            rule: { '>=': [{ var: 'age' }, 18] } as const,
            errorMessage: 'Must be 18 or older',
          },
        },
      },
      properties: {
        name: { type: 'string' as const },
        age: {
          type: 'integer' as const,
          minimum: 10,
          maximum: 100,
          'x-jsf-logic-validations': ['ageCheck'],
        },
      },
      required: ['name', 'age'],
    }

    const result = generateFromSchema(schema as any, { seed: SEED, maxAttempts: 50 }) as ObjectValue

    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('age')
    expect(typeof result.age).toBe('number')
    expect(result.age).toBeGreaterThanOrEqual(18)
    expect(validateSchema(result, schema as any)).toEqual([])
  })

  it.skip('should handle cross-field validations via retry loop - KNOWN LIMITATION', () => {
    // This test demonstrates a known limitation of the retry-only approach.
    // Cross-field equality constraints (like password === confirmPassword) are
    // nearly impossible to satisfy by random generation + retry.
    // 
    // This would require guided generation (M11) to solve properly.
    // For MVP, we accept that some x-jsf-logic rules may be unsatisfiable.
    
    const schema = {
      type: 'object' as const,
      'x-jsf-logic': {
        validations: {
          passwordMatch: {
            rule: { '===': [{ var: 'password' }, { var: 'confirmPassword' }] } as const,
            errorMessage: 'Passwords must match',
          },
        },
      },
      properties: {
        password: {
          type: 'string' as const,
          minLength: 8,
          maxLength: 8,
          'x-jsf-logic-validations': ['passwordMatch'],
        },
        confirmPassword: {
          type: 'string' as const,
          minLength: 8,
          maxLength: 8,
        },
      },
      required: ['password', 'confirmPassword'],
    }

    // This will almost certainly fail after maxAttempts
    expect(() => generateFromSchema(schema as any, { seed: SEED, maxAttempts: 100 }))
      .toThrow('Failed to generate valid value')
  })

  it('should generate objects without x-jsf-logic normally', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        email: { type: 'string' as const, format: 'email' as const },
        count: { type: 'integer' as const, minimum: 1, maximum: 10 },
      },
      required: ['email', 'count'],
    }

    const result = generateFromSchema(schema, { seed: SEED }) as ObjectValue

    expect(result).toHaveProperty('email')
    expect(result).toHaveProperty('count')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should handle simple relational x-jsf-logic rules', () => {
    const schema = {
      type: 'object' as const,
      'x-jsf-logic': {
        validations: {
          minMaxCheck: {
            rule: { '<': [{ var: 'min' }, { var: 'max' }] } as const,
            errorMessage: 'Min must be less than max',
          },
        },
      },
      properties: {
        min: {
          type: 'integer' as const,
          minimum: 0,
          maximum: 50,
          'x-jsf-logic-validations': ['minMaxCheck'],
        },
        max: {
          type: 'integer' as const,
          minimum: 0,
          maximum: 100,
        },
      },
      required: ['min', 'max'],
    }

    const result = generateFromSchema(schema as any, { seed: SEED, maxAttempts: 100 }) as ObjectValue

    expect(result).toHaveProperty('min')
    expect(result).toHaveProperty('max')
    expect(typeof result.min).toBe('number')
    expect(typeof result.max).toBe('number')
    
    // Validation must pass
    expect(validateSchema(result, schema as any)).toEqual([])
    
    // And the constraint must hold
    expect(result.min as number).toBeLessThan(result.max as number)
  })
})
