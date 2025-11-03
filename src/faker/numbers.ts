import type { NonBooleanJsfSchema } from '../types'
import type { GeneratorContext } from './core'

/**
 * Generate a number value satisfying schema constraints.
 * Handles: minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf.
 */
export function generateNumber(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): number {
  const { rng } = context
  const isInteger = schema.type === 'integer' || 
    (Array.isArray(schema.type) && schema.type.includes('integer'))

  // Determine bounds - use exclusive if specified, otherwise inclusive, otherwise defaults
  // For exclusive bounds with integers, adjust by 1 since integers can't be "slightly more"
  // For exclusive bounds with floats, trust the validator to check > / < instead of adjusting
  const min = schema.exclusiveMinimum !== undefined
    ? schema.exclusiveMinimum + (isInteger ? 1 : 0)
    : schema.minimum ?? -1000
  
  const max = schema.exclusiveMaximum !== undefined
    ? schema.exclusiveMaximum - (isInteger ? 1 : 0)
    : schema.maximum ?? 1000

  // Generate base value
  let value: number
  if (isInteger) {
    value = rng.integer(Math.ceil(min), Math.floor(max))
  } else {
    value = min + rng.random() * (max - min)
  }

  // Handle multipleOf constraint
  if (schema.multipleOf !== undefined) {
    value = roundToMultiple(value, schema.multipleOf, min, max, isInteger)
  }

  return value
}

/**
 * Round a value to the nearest multiple of a given number within bounds.
 */
function roundToMultiple(
  value: number,
  multipleOf: number,
  min: number,
  max: number,
  isInteger: boolean,
): number {
  // Find the nearest multiple
  const quotient = Math.round(value / multipleOf)
  let result = quotient * multipleOf

  // Ensure result is within bounds
  if (result < min) {
    result = Math.ceil(min / multipleOf) * multipleOf
  }
  if (result > max) {
    result = Math.floor(max / multipleOf) * multipleOf
  }

  // For integers, ensure result is an integer
  if (isInteger) {
    result = Math.round(result)
  }

  return result
}
