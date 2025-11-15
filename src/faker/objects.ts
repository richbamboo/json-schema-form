import type { JsfSchema, NonBooleanJsfSchema, ObjectValue } from '../types'
import type { GeneratorContext } from './core'

/**
 * Check if a property has computed attributes and should be skipped during generation.
 * Properties with x-jsf-logic-computedAttrs will have their values computed at runtime
 * by the application based on other form values, so we don't generate them.
 */
function hasComputedAttrs(propertySchema: JsfSchema): boolean {
  return typeof propertySchema === 'object' && 
         propertySchema !== null &&
         'x-jsf-logic-computedAttrs' in propertySchema
}

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

  // Prevent memory exhaustion from schemas with excessive properties
  const propertyCount = Object.keys(schema.properties).length
  if (propertyCount > 10000) {
    throw new Error(`Schema has ${propertyCount} properties, but maximum is 10000. Reduce the number of properties to prevent memory exhaustion.`)
  }

  // Generate required properties first
  const requiredProps = Array.isArray(schema.required) ? schema.required : []
  for (const key of requiredProps) {
    const propertySchema = schema.properties[key]
    if (propertySchema === undefined) {
      // Required property not defined in properties
      // This can happen with conditional schemas where properties are defined in then/else branches
      // Skip it - the retry loop will handle it if needed
      continue
    }
    // Skip if property schema is false (forbidden property)
    if (propertySchema === false) {
      continue
    }
    // Skip if property has computed attributes - these will be computed at runtime
    if (hasComputedAttrs(propertySchema)) {
      continue
    }
    // Create child context with updated path
    const childPath = context.path ? [...context.path, key] : [key]
    const childContext = { ...context, path: childPath }
    result[key] = generateValue(propertySchema as JsfSchema, childContext)
  }

  // Generate optional properties based on includeOptionalProbability
  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    // Skip if already generated (required) or if property schema is false (forbidden property)
    if (key in result || propertySchema === false) {
      continue
    }
    // Skip if property has computed attributes - these will be computed at runtime
    if (hasComputedAttrs(propertySchema)) {
      continue
    }

    // On first attempt, be conservative: skip optional properties that have type + metadata
    // but NO JSON Schema constraint keywords. These are suspicious and might have conditional
    // computed attrs that were lost during merging. Simple schemas like {type: 'string'} are OK.
    if (context.attempt === 1 && typeof propertySchema === 'object' && propertySchema !== null) {
      const keys = Object.keys(propertySchema)
      const hasType = keys.includes('type')
      
      // Metadata fields that don't affect generation
      const metadataFields = ['title', 'description', 'default', 'examples', 'readOnly', 'writeOnly', 'deprecated']
      const xJsfFields = keys.filter(k => k.startsWith('x-jsf-'))
      const hasMetadata = keys.some(k => metadataFields.includes(k)) || xJsfFields.length > 0
      
      // Constraint keywords that guide generation
      const constraintKeywords = [
        'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
        'minLength', 'maxLength', 'pattern', 'format',
        'minItems', 'maxItems', 'uniqueItems', 'items',
        'minProperties', 'maxProperties', 'required', 'properties', 'additionalProperties',
        'enum', 'const', 'multipleOf',
        'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
      ]
      const hasConstraints = keys.some(key => constraintKeywords.includes(key))
      
      // Skip if it has type + metadata but NO constraints (suspicious pattern)
      // Don't skip simple schemas like {type: 'string'} which have no metadata
      if (hasType && hasMetadata && !hasConstraints) {
        continue
      }
    }

    // Include optional property based on probability
    if (rng.random() < options.includeOptionalProbability) {
      // Create child context with updated path
      const childPath = context.path ? [...context.path, key] : [key]
      const childContext = { ...context, path: childPath }
      result[key] = generateValue(propertySchema as JsfSchema, childContext)
    }
  }

  return result
}
