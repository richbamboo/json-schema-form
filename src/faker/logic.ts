import type { NonBooleanJsfSchema } from '../types'
import type { GeneratorContext } from './core'

/**
 * Evaluate x-jsf-logic validations via the validator.
 * Solving deferred until M11.
 * TODO: Implement validation integration in M7.
 */
export function evaluateJsonLogic(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): boolean {
  throw new Error('evaluateJsonLogic not yet implemented')
}
