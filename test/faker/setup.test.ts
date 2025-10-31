import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

describe('faker setup', () => {
  it('should export generateFromSchema', () => {
    expect(generateFromSchema).toBeDefined()
    expect(typeof generateFromSchema).toBe('function')
  })

  it('should generate a valid string', () => {
    const schema = { type: 'string' as const }
    const result = generateFromSchema(schema, { seed: 42 }) as string

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)

    // Verify it validates
    const errors = validateSchema(result, schema)
    expect(errors).toEqual([])
  })

  it('should generate deterministically with same seed', () => {
    const schema = { type: 'string' as const, minLength: 5, maxLength: 10 }
    const result1 = generateFromSchema(schema, { seed: 42 }) as string
    const result2 = generateFromSchema(schema, { seed: 42 }) as string

    expect(result1).toBe(result2)
  })
})
