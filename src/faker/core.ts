import type { JsfSchema, NonBooleanJsfSchema, SchemaValue } from '../types'
import type { SeededRandom } from './rand'
import { UnsupportedGenerationError } from './errors'
import { generateString } from './strings'
import { generateNumber } from './numbers'
import { generateArray } from './arrays'
import { generateObject } from './objects'

/**
 * Normalized options with defaults applied.
 */
export type NormalizedOptions = Required<Omit<import('./index').GenerateOptions, 'seed'>> & Pick<import('./index').GenerateOptions, 'seed'>

/**
 * Core generator context passed through recursive calls.
 */
export interface GeneratorContext {
  rng: SeededRandom
  options: NormalizedOptions
  attempt: number
}

/**
 * Get the effective type from a schema, handling type arrays.
 */
function getSchemaType(schema: NonBooleanJsfSchema): string | undefined {
  if (typeof schema.type === 'string') {
    return schema.type
  }
  if (Array.isArray(schema.type) && schema.type.length > 0) {
    // For type arrays, pick the first non-null type
    const nonNullType = schema.type.find(t => t !== 'null')
    return nonNullType || schema.type[0]
  }
  return undefined
}

/**
 * Generate a value for a schema (recursive entry point).
 */
export function generateValue(
  schema: JsfSchema,
  context: GeneratorContext,
): SchemaValue {
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    if (schema === true) {
      // true schema: any value is valid; generate a simple string
      return 'valid'
    }
    // false schema: no value is valid
    throw new UnsupportedGenerationError('Cannot generate value for false schema', schema)
  }

  // Check for const/enum first (highest priority)
  if (schema.const !== undefined) {
    return schema.const
  }

  if (schema.value !== undefined) {
    return schema.value
  }

  if (schema.enum !== undefined && schema.enum.length > 0) {
    return context.rng.pick(schema.enum)
  }

  // Check for default/examples if enabled
  if (context.options.useDefaults && schema.default !== undefined) {
    return schema.default
  }

  if (context.options.useExamples && schema.examples && schema.examples.length > 0) {
    return schema.examples[0]
  }

  // Dispatch by type
  const type = getSchemaType(schema)

  switch (type) {
    case 'string':
      return generateString(schema, context)

    case 'number':
    case 'integer':
      return generateNumber(schema, context)

    case 'boolean':
      return context.rng.boolean()

    case 'null':
      return null

    case 'array':
      return generateArray(schema, context)

    case 'object':
      return generateObject(schema, context)

    default:
      // No type specified; default to object if it has object-like keywords
      if (schema.properties || schema.required) {
        return generateObject(schema, context)
      }
      // Fallback: generate a simple string
      return 'generated-value'
  }
}
