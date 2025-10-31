import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'

const SEED = 42

describe('complete format coverage', () => {
  it('should generate valid time', () => {
    const schema = { type: 'string' as const, format: 'time' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(typeof result).toBe('string')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid duration', () => {
    const schema = { type: 'string' as const, format: 'duration' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^PT\d+H\d+M$/)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid idn-email', () => {
    const schema = { type: 'string' as const, format: 'idn-email' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toContain('@')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid idn-hostname', () => {
    const schema = { type: 'string' as const, format: 'idn-hostname' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(typeof result).toBe('string')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid uri-reference', () => {
    const schema = { type: 'string' as const, format: 'uri-reference' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(typeof result).toBe('string')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid iri', () => {
    const schema = { type: 'string' as const, format: 'iri' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^https?:\/\//)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid iri-reference', () => {
    const schema = { type: 'string' as const, format: 'iri-reference' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(typeof result).toBe('string')
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid regex', () => {
    const schema = { type: 'string' as const, format: 'regex' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    // Should be a valid regex pattern
    expect(() => new RegExp(result)).not.toThrow()
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid json-pointer', () => {
    const schema = { type: 'string' as const, format: 'json-pointer' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\//)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid json-pointer-uri-fragment', () => {
    const schema = { type: 'string' as const, format: 'json-pointer-uri-fragment' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^#\//)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid relative-json-pointer', () => {
    const schema = { type: 'string' as const, format: 'relative-json-pointer' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toMatch(/^\d+\//)
    expect(validateSchema(result, schema)).toEqual([])
  })

  it('should generate valid uri-template', () => {
    const schema = { type: 'string' as const, format: 'uri-template' as const }
    const result = generateFromSchema(schema, { seed: SEED }) as string

    expect(result).toContain('{')
    expect(validateSchema(result, schema)).toEqual([])
  })
})
