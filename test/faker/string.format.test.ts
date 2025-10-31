import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('string format generation', () => {
  it('should generate valid email', () => {
    const schema = { type: 'string' as const, format: 'email' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toContain('@')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid uuid', () => {
    const schema = { type: 'string' as const, format: 'uuid' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid uri', () => {
    const schema = { type: 'string' as const, format: 'uri' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^https?:\/\//)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid ipv4', () => {
    const schema = { type: 'string' as const, format: 'ipv4' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid ipv6', () => {
    const schema = { type: 'string' as const, format: 'ipv6' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[0-9a-f:]+$/i)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid date-time', () => {
    const schema = { type: 'string' as const, format: 'date-time' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid date', () => {
    const schema = { type: 'string' as const, format: 'date' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid hostname', () => {
    const schema = { type: 'string' as const, format: 'hostname' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^[a-z0-9.-]+$/i)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate deterministically with format', () => {
    const schema = { type: 'string' as const, format: 'email' as const }
    const result1 = generateFromSchema(schema, { seed: SEED }) as string
    const result2 = generateFromSchema(schema, { seed: SEED }) as string

    expect(result1).toBe(result2)
  })

  it('should respect minLength with format', () => {
    const schema = { type: 'string' as const, format: 'email' as const, minLength: 20 }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result.length).toBeGreaterThanOrEqual(20)
    expect(validateSchema(result, schema)).toEqual([])
  })
})
