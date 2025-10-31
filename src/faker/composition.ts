import type { JsfSchema, NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'
import { UnsupportedGenerationError } from './errors'

/**
 * Handle allOf composition - generate value satisfying all subschemas.
 * Strategy: Merge constraints from all subschemas, then generate.
 * Note: Complex constraint intersections (e.g., multiple patterns) are unsupported.
 */
export function handleAllOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  
  if (!schema.allOf || schema.allOf.length === 0) {
    throw new Error('allOf must have at least one subschema')
  }

  // Check for unsupported cases: multiple patterns
  const patterns = schema.allOf.filter(
    (s): s is NonBooleanJsfSchema => typeof s === 'object' && 'pattern' in s
  )
  if (patterns.length > 1) {
    throw new UnsupportedGenerationError(
      'allOf with multiple pattern constraints is not supported',
      schema
    )
  }

  // Merge all subschemas into one
  // Handle special cases: properties and required need deep merging
  // Note: For conflicting constraints (e.g., multiple minimum values), last value wins.
  // Trust retry loop to catch invalid combinations.
  const mergedSchema: NonBooleanJsfSchema = {}
  const allProperties: Record<string, JsfSchema> = {}
  const allRequired: string[] = []
  
  for (const subSchema of schema.allOf) {
    if (typeof subSchema === 'object') {
      // Merge properties
      if (subSchema.properties) {
        Object.assign(allProperties, subSchema.properties)
      }
      
      // Collect required fields
      if (Array.isArray(subSchema.required)) {
        allRequired.push(...subSchema.required)
      }
      
      // Copy other properties (last one wins for conflicts)
      Object.assign(mergedSchema, subSchema)
    }
  }
  
  // Set merged properties and required
  if (Object.keys(allProperties).length > 0) {
    mergedSchema.properties = allProperties
  }
  if (allRequired.length > 0) {
    mergedSchema.required = [...new Set(allRequired)] // Deduplicate
  }

  return generateValue(mergedSchema as JsfSchema, context)
}

/**
 * Handle anyOf composition - pick one viable subschema.
 * Strategy: Pick a random subschema and generate from it.
 */
export function handleAnyOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  const { rng } = context
  
  if (!schema.anyOf || schema.anyOf.length === 0) {
    throw new Error('anyOf must have at least one subschema')
  }

  // Pick a random subschema
  const chosenSchema = rng.pick(schema.anyOf) as JsfSchema
  return generateValue(chosenSchema, context)
}

/**
 * Handle oneOf composition - pick exactly one viable subschema.
 * Strategy: Pick a random subschema (similar to anyOf).
 * Note: Disjointness checking is complex, trust retry loop to validate.
 */
export function handleOneOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  const { rng } = context
  
  if (!schema.oneOf || schema.oneOf.length === 0) {
    throw new Error('oneOf must have at least one subschema')
  }

  // Pick a random subschema
  // The retry loop will validate that it matches exactly one
  const chosenSchema = rng.pick(schema.oneOf) as JsfSchema
  return generateValue(chosenSchema, context)
}
