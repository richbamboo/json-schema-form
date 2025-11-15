import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import type { JsfSchema } from '../../src/types'

describe('Nested object generation bug', () => {
  it('should not generate null for required nested objects', () => {
    const schema: JsfSchema = {
      type: 'object',
      required: ['equity_compensation'],
      properties: {
        equity_compensation: {
          type: 'object',
          required: ['offer_equity_compensation'],
          properties: {
            offer_equity_compensation: {
              type: 'string',
              oneOf: [
                { const: 'yes', title: 'Yes' },
                { const: 'no', title: 'No' },
              ],
              title: 'Will this employee receive equity?',
            },
            number_of_stock_options: {
              type: ['string', 'null'],
              title: 'Number of stock options',
            },
          },
          allOf: [
            {
              if: {
                properties: {
                  offer_equity_compensation: { const: 'yes' },
                },
                required: ['offer_equity_compensation'],
              },
              then: {
                required: ['number_of_stock_options'],
              },
              else: {
                properties: {
                  number_of_stock_options: false,
                },
              },
            },
          ],
        },
      },
    }

    const generated = generateFromSchema(schema, { seed: 42 }) as any

    // The nested object should NOT be null
    expect(generated.equity_compensation).not.toBeNull()
    expect(generated.equity_compensation).toHaveProperty('offer_equity_compensation')
    expect(['yes', 'no']).toContain(generated.equity_compensation.offer_equity_compensation)
  })

  it('should generate simpler required nested object', () => {
    const schema: JsfSchema = {
      type: 'object',
      required: ['nested'],
      properties: {
        nested: {
          type: 'object',
          required: ['field'],
          properties: {
            field: {
              type: 'string',
              enum: ['a', 'b'],
            },
          },
        },
      },
    }

    const generated = generateFromSchema(schema, { seed: 42 }) as any

    expect(generated.nested).not.toBeNull()
    expect(generated.nested).toHaveProperty('field')
    expect(['a', 'b']).toContain(generated.nested.field)
  })

  it('should handle nested object with nullable properties', () => {
    // Verify that nullable PROPERTIES don't make the OBJECT null
    const schema: JsfSchema = {
      type: 'object',
      required: ['container'],
      properties: {
        container: {
          type: 'object',
          required: ['requiredField'],
          properties: {
            requiredField: {
              type: 'string',
              const: 'value',
            },
            nullableField: {
              type: ['string', 'null'],
            },
          },
        },
      },
    }

    const generated = generateFromSchema(schema, { seed: 42 }) as any

    // Container should be an object, not null
    expect(generated.container).not.toBeNull()
    expect(typeof generated.container).toBe('object')
    expect(generated.container.requiredField).toBe('value')
  })

  it('should handle optional nested object correctly', () => {
    // Optional nested objects CAN be omitted (different from required)
    const schema: JsfSchema = {
      type: 'object',
      properties: {
        optionalNested: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              const: 'value',
            },
          },
        },
      },
    }

    const generated = generateFromSchema(schema, { seed: 42, includeOptionalProbability: 0 }) as any

    // Since it's optional and probability is 0, it should be omitted (not generated)
    expect(generated.optionalNested).toBeUndefined()
  })

  it('should generate deeply nested required objects', () => {
    const schema: JsfSchema = {
      type: 'object',
      required: ['level1'],
      properties: {
        level1: {
          type: 'object',
          required: ['level2'],
          properties: {
            level2: {
              type: 'object',
              required: ['level3'],
              properties: {
                level3: {
                  type: 'string',
                  const: 'deep',
                },
              },
            },
          },
        },
      },
    }

    const generated = generateFromSchema(schema, { seed: 42 }) as any

    expect(generated.level1).not.toBeNull()
    expect(generated.level1.level2).not.toBeNull()
    expect(generated.level1.level2.level3).toBe('deep')
  })
})
