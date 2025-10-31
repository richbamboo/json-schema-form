import type { NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate an array satisfying schema constraints.
 * Handles: minItems, maxItems, uniqueItems, contains, minContains, maxContains, prefixItems, items.
 * TODO: Implement in M3.
 */
export function generateArray(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue[] {
  throw new Error('generateArray not yet implemented')
}
