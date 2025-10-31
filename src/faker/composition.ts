import type { JsfSchema, NonBooleanJsfSchema } from '../types'
import type { GeneratorContext } from './core'

/**
 * Merge constraints from allOf subschemas.
 * Throws UnsupportedGenerationError for composite patterns.
 * Throws UnsatisfiableSchemaError for contradictory constraints.
 * TODO: Implement in M6.
 */
export function mergeAllOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): JsfSchema {
  throw new Error('mergeAllOf not yet implemented')
}

/**
 * Pick a viable branch from anyOf.
 * Prefers disjoint branches by type.
 * TODO: Implement in M6.
 */
export function pickAnyOfBranch(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): JsfSchema {
  throw new Error('pickAnyOfBranch not yet implemented')
}

/**
 * Pick a disjoint branch from oneOf.
 * Throws UnsupportedGenerationError if ambiguous.
 * TODO: Implement in M6.
 */
export function pickOneOfBranch(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): JsfSchema {
  throw new Error('pickOneOfBranch not yet implemented')
}

/**
 * Generate a value that does NOT match the not schema.
 * Handles simple complements (const, enum, simple type).
 * Throws UnsupportedGenerationError for complex not.
 * TODO: Implement in M6.
 */
export function generateNotComplement(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): JsfSchema {
  throw new Error('generateNotComplement not yet implemented')
}
