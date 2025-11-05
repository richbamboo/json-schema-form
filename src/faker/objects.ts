import type { JsfSchema, NonBooleanJsfSchema, ObjectValue } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate an object value satisfying schema constraints.
 * Handles: properties, required.
 * Note: additionalProperties and patternProperties are not actively generated,
 * but won't cause validation errors if schema allows them.
 */
export function generateObject(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): ObjectValue {
  const { rng, options } = context
  const { generateValue } = require('./core')

  const result: ObjectValue = {}

  // No properties defined, return empty object
  if (!schema.properties || typeof schema.properties !== 'object') {
    return result
  }

  // Generate required properties first
  const requiredProps = Array.isArray(schema.required) ? schema.required : []
  for (const key of requiredProps) {
    const propertySchema = schema.properties[key]
    if (propertySchema === undefined) {
      // Required property not defined in properties - this is a schema error
      throw new Error(`Required property "${key}" is not defined in properties`)
    }
    // Skip if property schema is false (forbidden property)
    if (propertySchema !== false) {
      result[key] = generateValue(propertySchema as JsfSchema, context)
    }
  }

  // Generate optional properties based on includeOptionalProbability
  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    // Skip if already generated (required) or if property schema is false (forbidden property)
    if (key in result || propertySchema === false) {
      continue
    }

    // Include optional property based on probability
    if (rng.random() < options.includeOptionalProbability) {
      result[key] = generateValue(propertySchema as JsfSchema, context)
    }
  }

  return result
}
