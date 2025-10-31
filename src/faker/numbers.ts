import type { NonBooleanJsfSchema } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate a number or integer satisfying schema constraints.
 * Handles: minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf.
 * TODO: Implement in M2.
 */
export function generateNumber(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
  isInteger: boolean,
): number {
  throw new Error('generateNumber not yet implemented')
}
