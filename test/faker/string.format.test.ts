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

  // Additional format types
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

  describe('date constraints', () => {
    it('should respect maxDate constraint', () => {
      const schema = {
        type: 'string' as const,
        format: 'date' as const,
        'x-jsf-presentation': {
          maxDate: '2007-06-11',
        },
      }
      const result = generateFromSchema(schema, { seed: SEED }) as string

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(result).getTime()).toBeLessThanOrEqual(new Date('2007-06-11').getTime())
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should respect minDate constraint', () => {
      const schema = {
        type: 'string' as const,
        format: 'date' as const,
        'x-jsf-presentation': {
          minDate: '2020-01-01',
        },
      }
      const result = generateFromSchema(schema, { seed: SEED }) as string

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(result).getTime()).toBeGreaterThanOrEqual(new Date('2020-01-01').getTime())
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should respect both minDate and maxDate constraints', () => {
      const schema = {
        type: 'string' as const,
        format: 'date' as const,
        'x-jsf-presentation': {
          minDate: '1990-01-01',
          maxDate: '2000-12-31',
        },
      }
      const result = generateFromSchema(schema, { seed: SEED }) as string

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const resultDate = new Date(result).getTime()
      expect(resultDate).toBeGreaterThanOrEqual(new Date('1990-01-01').getTime())
      expect(resultDate).toBeLessThanOrEqual(new Date('2000-12-31').getTime())
      expect(validateSchema(result, schema)).toEqual([])
    })

    it('should respect maxDate for date-time format', () => {
      const schema = {
        type: 'string' as const,
        format: 'date-time' as const,
        'x-jsf-presentation': {
          maxDate: '2010-12-31',
        },
      }
      const result = generateFromSchema(schema, { seed: SEED }) as string

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(new Date(result).getTime()).toBeLessThanOrEqual(new Date('2010-12-31').getTime())
      expect(validateSchema(result, schema)).toEqual([])
    })
  })
})
