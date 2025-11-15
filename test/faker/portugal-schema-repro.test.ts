import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import type { JsfSchema } from '../../src/types'

describe('Portugal schema bug - working_hours_exemption_allowance', () => {
  it('should skip working_hours_exemption_allowance when computed in nested conditionals', () => {
    // Simplified version of the Portugal schema with the problematic pattern
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
        working_hours_exemption_allowance: {
          type: 'integer',
          title: 'Extended work hours allowance',
        },
      },
      required: ['working_hours_exemption', 'annual_gross_salary', 'work_hours_per_week'],
      allOf: [
        {
          if: {
            properties: {
              working_hours_exemption: {
                const: 'yes',
              },
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
            // NESTED CONDITIONAL!
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
            rule: {
              '*': [{ var: 'annual_gross_salary' }, 0.05],
            },
          },
          working_hours_exemption_allowance_no_max_hours_value_in_cents: {
            rule: {
              '*': [{ var: 'annual_gross_salary' }, 0.03],
            },
          },
        },
      },
    }

    // Run multiple times with different seeds to test different branches
    for (let seed = 0; seed < 20; seed++) {
      const result = generateFromSchema(schema, { seed }) as any

      console.log(`Seed ${seed}:`, {
        working_hours_exemption: result.working_hours_exemption,
        maximum_working_hours_regime: result.maximum_working_hours_regime,
        has_allowance: 'working_hours_exemption_allowance' in result,
        allowance_value: result.working_hours_exemption_allowance,
      })

      expect(result).toHaveProperty('working_hours_exemption')
      expect(result).toHaveProperty('annual_gross_salary')
      expect(result).toHaveProperty('work_hours_per_week')

      // If working_hours_exemption is 'yes', the allowance should NOT be generated (it's computed)
      if (result.working_hours_exemption === 'yes') {
        if (result.working_hours_exemption_allowance !== undefined) {
          console.error(
            `❌ FAIL at seed ${seed}: working_hours_exemption_allowance should be undefined when working_hours_exemption=yes`
          )
          console.error(`   Generated:`, result)
        }
        expect(result.working_hours_exemption_allowance).toBeUndefined()
      }
    }
  })

  it('should handle deeply nested conditional computed attrs', () => {
    // Even simpler test of nested conditionals
    const schema: JsfSchema = {
      type: 'object',
      properties: {
        trigger1: {
          type: 'string',
          enum: ['yes', 'no'],
        },
        trigger2: {
          type: 'string',
          enum: ['a', 'b'],
        },
        computed_field: {
          type: 'integer',
        },
      },
      required: ['trigger1'],
      allOf: [
        {
          if: {
            properties: { trigger1: { const: 'yes' } },
          },
          then: {
            required: ['trigger2'],
            // NESTED CONDITIONAL
            if: {
              properties: { trigger2: { const: 'a' } },
            },
            then: {
              properties: {
                computed_field: {
                  'x-jsf-logic-computedAttrs': {
                    const: 'formula_a',
                  },
                },
              },
              required: ['computed_field'],
            },
            else: {
              properties: {
                computed_field: {
                  'x-jsf-logic-computedAttrs': {
                    const: 'formula_b',
                  },
                },
              },
              required: ['computed_field'],
            },
          },
        },
      ],
      'x-jsf-logic': {
        computedValues: {
          formula_a: { rule: { var: 'trigger1' } },
          formula_b: { rule: { var: 'trigger2' } },
        },
      },
    }

    for (let seed = 0; seed < 10; seed++) {
      const result = generateFromSchema(schema, { seed }) as any

      if (result.trigger1 === 'yes') {
        expect(result.computed_field).toBeUndefined()
      }
    }
  })
})
