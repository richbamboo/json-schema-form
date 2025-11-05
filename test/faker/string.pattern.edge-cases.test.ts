import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'

const SEED = 42

describe('string pattern edge cases', () => {
  it('should throw for invalid regex pattern', () => {
    const schema = { type: 'string' as const, pattern: '[invalid(' }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('Invalid regex pattern')
  })

  it('should throw for unclosed character class', () => {
    const schema = { type: 'string' as const, pattern: '[a-z' }
    
    expect(() => generateFromSchema(schema, { seed: SEED })).toThrow('Invalid regex pattern')
  })

  it('should handle valid complex patterns', () => {
    const schema = { type: 'string' as const, pattern: '^[a-zA-Z0-9]{3,10}$' }
    const result = generateFromSchema(schema, { seed: SEED }) as string
    
    expect(result).toMatch(/^[a-zA-Z0-9]{3,10}$/)
  })
})
