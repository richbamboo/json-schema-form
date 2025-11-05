import type { JsfSchema, NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate an array value satisfying schema constraints.
 * Handles: minItems, maxItems, items, prefixItems.
 * Note: uniqueItems and contains/minContains/maxContains constraints rely on 
 * the retry loop and validator for enforcement.
 */
export function generateArray(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue[] {
  const { rng } = context
  const { generateValue } = require('./core')

  // Determine array length
  const minItems = schema.minItems ?? 0
  const maxItems = schema.maxItems ?? Math.max(minItems + 5, 10)
  
  // Validate constraints
  if (!Number.isInteger(minItems) || minItems < 0) {
    throw new Error(`minItems must be a non-negative integer, got ${minItems}`)
  }
  if (!Number.isInteger(maxItems) || maxItems < 0) {
    throw new Error(`maxItems must be a non-negative integer, got ${maxItems}`)
  }
  if (minItems > maxItems) {
    throw new Error(`minItems must be <= maxItems, got minItems=${minItems}, maxItems=${maxItems}`)
  }
  
  const length = rng.integer(minItems, maxItems)

  const result: SchemaValue[] = []

  // Generate prefixItems first (tuple-style with specific schemas per position)
  if (schema.prefixItems && Array.isArray(schema.prefixItems)) {
    for (let i = 0; i < Math.min(length, schema.prefixItems.length); i++) {
      const itemSchema = schema.prefixItems[i] as JsfSchema
      const value = generateValue(itemSchema, context)
      result.push(value)
    }
  }

  // Generate remaining items using 'items' schema
  if (result.length < length && schema.items) {
    for (let i = result.length; i < length; i++) {
      const value = generateValue(schema.items, context)
      result.push(value)
    }
  } else if (result.length < length && !schema.items) {
    // No items schema specified, generate simple values
    for (let i = result.length; i < length; i++) {
      const value = rng.pick(['string', 'number', 'boolean', 'null'])
      const generatedValue = generateSimpleValue(value, rng)
      result.push(generatedValue)
    }
  }

  return result
}

/**
 * Generate a simple value of a given type.
 */
function generateSimpleValue(type: string, rng: import('./rand').SeededRandom): SchemaValue {
  switch (type) {
    case 'string':
      return rng.pick(['a', 'b', 'c', 'd', 'e'])
    case 'number':
      return rng.integer(0, 100)
    case 'boolean':
      return rng.boolean()
    case 'null':
      return null
    default:
      return null
  }
}
