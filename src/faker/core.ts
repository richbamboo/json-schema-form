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
 * Mapping from a const value to its title for a specific path.
 */
export interface ConstTitleMapping {
  constValue: unknown
  title: string
}

/**
 * Core generator context passed through recursive calls.
 */
export interface GeneratorContext {
  rng: SeededRandom
  options: NormalizedOptions
  attempt: number
  depth?: number
  /** Current JSON path (e.g., ['user', 'status']) */
  path?: string[]
  /** Map of JSON paths to const→title mappings for post-processing */
  constTitleMappings?: Map<string, ConstTitleMapping>
  /** Set of "property@path" keys for fields with x-jsf-logic-computedAttrs at specific conditional paths */
  computedFieldPaths?: Set<string>
  /** Current conditional path in schema hierarchy (e.g., "allOf.3.then.if.then") */
  conditionalPath?: string
}

/**
 * Maximum recursion depth to prevent stack overflow.
 */
const MAX_RECURSION_DEPTH = 100

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
  // Check recursion depth to prevent stack overflow
  const currentDepth = context.depth || 0
  if (currentDepth > MAX_RECURSION_DEPTH) {
    throw new Error(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded. Schema may be too deeply nested or contain circular references.`)
  }
  
  // Increment depth for recursive calls
  const nextContext = { ...context, depth: currentDepth + 1 }
  
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    if (schema === true) {
      // true schema: any value is valid; generate a simple string
      return 'valid'
    }
    // false schema: no value is valid - this is unsatisfiable, not unsupported
    const { UnsatisfiableSchemaError } = require('./errors')
    throw new UnsatisfiableSchemaError('false schema rejects all values - no valid data can be generated', schema)
  }

  // Check for const first (highest priority)
  if (schema.const !== undefined) {
    return schema.const
  }

  if (schema.value !== undefined) {
    return schema.value
  }

  // Handle composition keywords before enum to support const→title mappings
  // When enum exists with oneOf/anyOf, delegate to composition handler
  if (schema.allOf) {
    const { handleAllOf } = require('./composition')
    return handleAllOf(schema, context)
  }

  if (schema.anyOf) {
    const { handleAnyOf } = require('./composition')
    return handleAnyOf(schema, context)
  }

  if (schema.oneOf) {
    const { handleOneOf } = require('./composition')
    return handleOneOf(schema, context)
  }

  // Handle enum after composition to avoid bypassing const→title mappings
  if (schema.enum !== undefined) {
    if (schema.enum.length === 0) {
      const { UnsatisfiableSchemaError } = require('./errors')
      throw new UnsatisfiableSchemaError('enum array is empty - no valid values exist', schema)
    }
    return context.rng.pick(schema.enum)
  }

  // Check for default/examples if enabled
  if (context.options.useDefaults && schema.default !== undefined) {
    return schema.default
  }

  if (context.options.useExamples && schema.examples && schema.examples.length > 0) {
    return schema.examples[0]
  }

  // Handle if/then/else conditionals
  if (schema.if) {
    const { handleConditional } = require('./composition')
    return handleConditional(schema, context)
  }

  // Note: 'not' is not actively handled - would require generating complement
  // Trust retry loop to catch violations

  // Dispatch by type
  const type = getSchemaType(schema)

  switch (type) {
    case 'string':
      return generateString(schema, nextContext)

    case 'number':
    case 'integer':
      return generateNumber(schema, nextContext)

    case 'boolean':
      return nextContext.rng.boolean()

    case 'null':
      return null

    case 'array':
      return generateArray(schema, nextContext)

    case 'object':
      return generateObject(schema, nextContext)

    default:
      // No type specified; default to object if it has object-like keywords
      if (schema.properties || schema.required) {
        return generateObject(schema, nextContext)
      }
      // Fallback: generate a simple string
      return 'generated-value'
  }
}
