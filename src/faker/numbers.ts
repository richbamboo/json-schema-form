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

  // Determine bounds - use exclusive if specified, otherwise inclusive, otherwise safe integer limits
  // For exclusive bounds with integers, adjust by 1 since integers can't be "slightly more"
  const hasExclusiveMin = schema.exclusiveMinimum !== undefined
  const hasExclusiveMax = schema.exclusiveMaximum !== undefined
  
  const min = hasExclusiveMin
    ? schema.exclusiveMinimum! + (isInteger ? 1 : 0)
    : schema.minimum ?? Number.MIN_SAFE_INTEGER
  
  const max = hasExclusiveMax
    ? schema.exclusiveMaximum! - (isInteger ? 1 : 0)
    : schema.maximum ?? Number.MAX_SAFE_INTEGER

  // Validate that min <= max after adjustments
  if (min > max) {
    throw new Error(
      `Invalid range: minimum (${min}) > maximum (${max}). ` +
      `Check exclusiveMinimum=${schema.exclusiveMinimum}, exclusiveMaximum=${schema.exclusiveMaximum}, ` +
      `minimum=${schema.minimum}, maximum=${schema.maximum}`
    )
  }

  // Generate base value
  let value: number
  if (isInteger) {
    value = rng.integer(Math.ceil(min), Math.floor(max))
  } else {
    // For floats, random() returns [0, 1), so min + random() * (max - min) gives [min, max)
    // This is correct for exclusive max, but for exclusive min we need to ensure value > min
    value = min + rng.random() * (max - min)
    
    // For exclusive minimum with floats, add a tiny epsilon if we hit exactly min
    // This is extremely rare due to floating point precision, but handle it for correctness
    if (hasExclusiveMin && value === schema.exclusiveMinimum) {
      value += Number.EPSILON
    }
  }

  // Handle multipleOf constraint
  if (schema.multipleOf !== undefined) {
    if (schema.multipleOf <= 0) {
      throw new Error(`multipleOf must be > 0, got ${schema.multipleOf}`)
    }
    if (!Number.isFinite(schema.multipleOf)) {
      throw new Error(`multipleOf must be a finite number, got ${schema.multipleOf}`)
    }
    value = roundToMultiple(value, schema.multipleOf, min, max, isInteger)
  }

  return value
}

/**
 * Round a value to the nearest multiple of a given number within bounds.
 * @throws {Error} If no valid multiple exists within the bounds
 * 
 * Note: For decimal multipleOf values, floating-point precision limitations may cause
 * slight inaccuracies. The validator should use appropriate tolerance when checking.
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

  // Verify the result is actually within bounds
  // This can fail if no valid multiple exists in the range
  if (result < min || result > max) {
    throw new Error(
      `No valid multiple of ${multipleOf} exists between ${min} and ${max}`
    )
  }

  // For integers, ensure result is an integer
  if (isInteger) {
    result = Math.round(result)
  }

  return result
}
