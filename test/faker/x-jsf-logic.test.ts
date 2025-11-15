import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import type { JsfSchema, ObjectValue } from '../../src/types'

const SEED = 42

describe('x-jsf-logic generation', () => {
  describe('validations', () => {
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

  describe('computedAttrs', () => {
    it('should skip computed field when defined in allOf then branch', () => {
      const schema: JsfSchema = {
        type: 'object',
        properties: {
          trigger_field: {
            type: 'string',
            enum: ['yes', 'no'],
          },
          computed_field: {
            type: 'integer',
            title: 'Computed Field',
          },
        },
        required: ['trigger_field'],
        allOf: [
          {
            if: {
              properties: {
                trigger_field: {
                  const: 'yes',
                },
              },
              required: ['trigger_field'],
            },
            then: {
              properties: {
                computed_field: {
                  'x-jsf-logic-computedAttrs': {
                    const: 'some_computed_value',
                    default: 'some_computed_value',
                  },
                },
              },
              required: ['computed_field'],
            },
            else: {
              properties: {
                computed_field: false,
              },
            },
          },
        ],
        'x-jsf-logic': {
          computedValues: {
            some_computed_value: {
              rule: { var: 'trigger_field' },
            },
          },
        },
      }

      // Generate with trigger_field: 'yes' which should activate the computed field
      const result = generateFromSchema(schema, { seed: 42 }) as any

      // computed_field should NOT be present since it has x-jsf-logic-computedAttrs
      expect(result).toHaveProperty('trigger_field')
      expect(result.computed_field).toBeUndefined()
    })

    it('should fail when computed field is unconditionally required', () => {
      // This schema is ungenerable because computed_field is both:
      // - required (from then branch which always applies)
      // - computed (has x-jsf-logic-computedAttrs)
      // We can't generate it (it's computed) but we can't skip validation (it's required)
      const schema: JsfSchema = {
        type: 'object',
        properties: {
          trigger_field: {
            type: 'string',
            const: 'yes',
          },
        },
        required: ['trigger_field'],
        if: {
          properties: {
            trigger_field: {
              const: 'yes',
            },
          },
          required: ['trigger_field'],
        },
        then: {
          properties: {
            computed_field: {
              type: 'integer',
              'x-jsf-logic-computedAttrs': {
                const: 'some_computed_value',
              },
            },
          },
          required: ['computed_field'],
        },
        'x-jsf-logic': {
          computedValues: {
            some_computed_value: {
              rule: { var: 'trigger_field' },
            },
          },
        },
      }

      // Should throw MaxAttemptsExceededError because the schema is ungenerable
      expect(() => generateFromSchema(schema, { seed: 42, maxAttempts: 50 })).toThrow('Failed to generate valid value')
    })

    it('should not generate computed field with metadata in nested conditionals (production case)', () => {
      // Real production schema pattern where property has type + metadata (title, description, x-jsf-*)
      // but no constraint keywords. The x-jsf-logic-computedAttrs is in deeply nested conditionals.
      const schema: JsfSchema = {
        type: 'object',
        properties: {
          working_hours_exemption: {
            type: 'string',
            enum: ['yes', 'no'],
          },
          maximum_working_hours_regime: {
            type: 'string',
            enum: ['yes', 'no'],
          },
          annual_gross_salary: {
            type: 'integer',
            minimum: 1218000,
          },
          work_hours_per_week: {
            type: 'number',
            minimum: 1,
            maximum: 40,
          },
          // Property with metadata but no constraints - looks safe to generate
          working_hours_exemption_allowance: {
            type: 'integer',
            title: 'Extended work hours allowance',
            description: '',
            'x-jsf-presentation': {
              currency: 'EUR',
              inputType: 'money',
            },
          },
        },
        required: ['working_hours_exemption', 'annual_gross_salary', 'work_hours_per_week'],
        allOf: [
          {
            if: {
              properties: {
                working_hours_exemption: { const: 'yes' },
              },
              required: ['working_hours_exemption'],
            },
            then: {
              required: ['maximum_working_hours_regime'],
            },
            else: {
              properties: {
                maximum_working_hours_regime: false,
              },
            },
          },
          {
            if: {
              properties: {
                annual_gross_salary: { minimum: 1 },
                maximum_working_hours_regime: { enum: ['yes', 'no'] },
                work_hours_per_week: { minimum: 1 },
                working_hours_exemption: { const: 'yes' },
              },
              required: ['working_hours_exemption', 'maximum_working_hours_regime', 'work_hours_per_week'],
            },
            then: {
              // Deeply nested conditional with computed attrs
              if: {
                properties: {
                  maximum_working_hours_regime: { const: 'yes' },
                },
                required: ['maximum_working_hours_regime'],
              },
              then: {
                properties: {
                  working_hours_exemption_allowance: {
                    'x-jsf-logic-computedAttrs': {
                      const: 'working_hours_exemption_allowance_with_max_hours_value_in_cents',
                      default: 'working_hours_exemption_allowance_with_max_hours_value_in_cents',
                    },
                  },
                },
                required: ['working_hours_exemption_allowance'],
              },
              else: {
                properties: {
                  working_hours_exemption_allowance: {
                    'x-jsf-logic-computedAttrs': {
                      const: 'working_hours_exemption_allowance_no_max_hours_value_in_cents',
                      default: 'working_hours_exemption_allowance_no_max_hours_value_in_cents',
                    },
                  },
                },
                required: ['working_hours_exemption_allowance'],
              },
            },
            else: {
              properties: {
                working_hours_exemption_allowance: false,
              },
            },
          },
        ],
        'x-jsf-logic': {
          computedValues: {
            working_hours_exemption_allowance_with_max_hours_value_in_cents: {
              rule: { '*': [{ var: 'annual_gross_salary' }, 0.05] },
            },
            working_hours_exemption_allowance_no_max_hours_value_in_cents: {
              rule: { '*': [{ var: 'annual_gross_salary' }, 0.03] },
            },
          },
        },
      }

      // Run multiple times to test different conditional branches
      for (let seed = 0; seed < 20; seed++) {
        const result = generateFromSchema(schema, { seed }) as any

        // If working_hours_exemption is 'yes', the allowance should NOT be generated
        // because it has x-jsf-logic-computedAttrs in the nested conditional
        if (result.working_hours_exemption === 'yes') {
          expect(result.working_hours_exemption_allowance).toBeUndefined()
        }
      }
    })
  })
})
