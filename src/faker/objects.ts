import type { NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate an object satisfying schema constraints.
 * Handles: properties, required, additionalProperties: false.
 * TODO: Implement in M4.
 */
export function generateObject(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): Record<string, SchemaValue> {
  throw new Error('generateObject not yet implemented')
}
