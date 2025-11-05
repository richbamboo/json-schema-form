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
  if (!Number.isFinite(minItems) || !Number.isInteger(minItems) || minItems < 0) {
    throw new Error(`minItems must be a non-negative finite integer, got ${minItems}`)
  }
  if (!Number.isFinite(maxItems) || !Number.isInteger(maxItems) || maxItems < 0) {
    throw new Error(`maxItems must be a non-negative finite integer, got ${maxItems}`)
  }
  if (minItems > maxItems) {
    throw new Error(`minItems must be <= maxItems, got minItems=${minItems}, maxItems=${maxItems}`)
  }
  // Prevent memory exhaustion from very large arrays
  if (maxItems > 10000) {
    throw new Error(`maxItems must be <= 10000, got ${maxItems}. For large arrays, use smaller maxItems.`)
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
  if (result.length < length) {
    if (schema.items === false) {
      // items: false means no additional items allowed beyond prefixItems
      // If we need more items, this is an error
      throw new Error(
        `Array requires ${length} items but items schema is false (only ${result.length} prefixItems allowed)`
      )
    } else if (schema.items) {
      // Generate items using the items schema
      for (let i = result.length; i < length; i++) {
        const value = generateValue(schema.items, context)
        result.push(value)
      }
    } else {
      // No items schema specified, generate simple values
      for (let i = result.length; i < length; i++) {
        const value = rng.pick(['string', 'number', 'boolean', 'null'])
        const generatedValue = generateSimpleValue(value, rng)
        result.push(generatedValue)
      }
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
