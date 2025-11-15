import type { JsfSchema, SchemaValue } from '../types'

/**
 * Options for generating fake data from a JSON Schema.
 */
export interface GenerateOptions {
  /** Seed for deterministic generation. If omitted, generation is non-deterministic. */
  seed?: string | number
  /** Number of instances to generate. Default: 1. When >1, returns an array. */
  count?: number
  /** Probability of including optional properties (0-1). Default: 0.3. */
  includeOptionalProbability?: number
  /** Maximum number of fresh random generations. Default: 100. */
  maxGenerations?: number
  /** Maximum fixes per generation (resets on progress). Default: 5. */
  maxFixesPerGeneration?: number
  /** Absolute maximum attempts (generations + fixes). Default: 1000. */
  maxAttempts?: number
  /** Use `default` values from schema when present. Default: false. */
  useDefaults?: boolean
  /** Use `examples` values from schema when present. Default: false. */
  useExamples?: boolean
  /** Generation mode. Default: 'random'. Other modes deferred. */
  mode?: 'random' | 'faker' | 'ai'
  /** 
   * Replace 'const' values with their 'title' in the final output.
   * Only applies to oneOf/anyOf options with both const and title.
   * Generated value validates before substitution occurs.
   * 
   * - boolean: Apply to all oneOf/anyOf with const+title
   * - function: Conditionally apply based on field path and schema
   * 
   * Default: false
   * 
   * @example
   * // Apply to all fields
   * useConstTitles: true
   * 
   * @example
   * // Apply only to select fields
   * useConstTitles: (path, schema) => 
   *   schema['x-jsf-presentation']?.inputType === 'select'
   */
  useConstTitles?: boolean | ((fieldPath: string, fieldSchema: import('../types').NonBooleanJsfSchema) => boolean)
}

/**
 * Result of generation including metadata about the process.
 */
export interface GenerationResult {
  /** The generated value */
  value: SchemaValue
  /** Number of attempts required to generate valid data */
  attempts: number
}

/**
 * Generate fake data that validates against the provided JSON Schema.
 *
 * @param schema - The JSON Schema to generate data for
 * @param options - Generation options
 * @returns Generated value(s) that validate against the schema
 * @throws {UnsupportedGenerationError} When schema contains unsupported features
 * @throws {UnsatisfiableSchemaError} When schema constraints are contradictory
 * @throws {MaxAttemptsExceededError} When generation fails after maxAttempts
 *
 * @example
 * ```ts
 * const schema = { type: 'string', format: 'email' }
 * const email = generateFromSchema(schema, { seed: 42 })
 * ```
 */
export function generateFromSchema(
  schema: JsfSchema,
  options?: GenerateOptions,
): SchemaValue | SchemaValue[] {
  const result = generateFromSchemaWithMetadata(schema, options)
  
  // Extract just the values, discarding metadata
  if (Array.isArray(result)) {
    return result.map(r => r.value)
  }
  return result.value
}

/**
 * Generate fake data with metadata about the generation process.
 * Use this when you need to know how many attempts were required.
 *
 * @param schema - The JSON Schema to generate data for
 * @param options - Generation options
 * @returns Generated value(s) with metadata
 */
export function generateFromSchemaWithMetadata(
  schema: JsfSchema,
  options?: GenerateOptions,
): GenerationResult | GenerationResult[] {
  const normalizedOptions = normalizeOptions(options)
  const count = normalizedOptions.count
  const { SeededRandom } = require('./rand')
  const { faker } = require('@faker-js/faker')

  // Setup: create RNG and seed faker once for all generations
  const rng = new SeededRandom(normalizedOptions.seed)
  if (normalizedOptions.seed !== undefined) {
    // faker.seed() expects a number or number array
    // Use simple hash for string seeds to ensure better distribution
    const numericSeed = typeof normalizedOptions.seed === 'string' 
      ? stringToSeed(normalizedOptions.seed)
      : normalizedOptions.seed
    faker.seed(numericSeed)
  }

  if (count === 1) {
    return generateSingle(schema, normalizedOptions, rng)
  }

  const results: GenerationResult[] = []
  for (let i = 0; i < count; i++) {
    results.push(generateSingle(schema, normalizedOptions, rng))
  }
  return results
}

/**
 * Normalized options with defaults applied.
 */
type NormalizedOptions = Required<Omit<GenerateOptions, 'seed'>> & Pick<GenerateOptions, 'seed'>

/**
 * Convert a string to a numeric seed using a simple hash function.
 * Uses djb2 algorithm for better distribution than simple character code sum.
 * Applies >>> 0 after each iteration to keep hash within 32-bit integer range.
 */
function stringToSeed(str: string): number {
  if (str.length === 0) {
    throw new Error('seed cannot be an empty string')
  }
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    // Apply >>> 0 after each step to prevent overflow and ensure 32-bit integer
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Normalize and validate generation options.
 */
function normalizeOptions(options?: GenerateOptions): NormalizedOptions {
  const count = options?.count ?? 1
  const includeOptionalProbability = options?.includeOptionalProbability ?? 0.3
  const maxGenerations = options?.maxGenerations ?? 100
  const maxFixesPerGeneration = options?.maxFixesPerGeneration ?? 5
  const maxAttempts = options?.maxAttempts ?? 1000

  // Validate inputs
  if (!Number.isFinite(count) || count < 1 || !Number.isInteger(count)) {
    throw new Error(`count must be a finite integer >= 1, got ${count}`)
  }
  if (count > 10000) {
    throw new Error(`count must be <= 10000, got ${count}. For bulk generation, call generateFromSchema multiple times.`)
  }
  if (!Number.isFinite(includeOptionalProbability) || includeOptionalProbability < 0 || includeOptionalProbability > 1) {
    throw new Error(`includeOptionalProbability must be a finite number in [0, 1], got ${includeOptionalProbability}`)
  }
  if (!Number.isFinite(maxGenerations) || maxGenerations < 1 || !Number.isInteger(maxGenerations)) {
    throw new Error(`maxGenerations must be a finite integer >= 1, got ${maxGenerations}`)
  }
  if (maxGenerations > 10000) {
    throw new Error(`maxGenerations must be <= 10000, got ${maxGenerations}. Excessive generations can cause performance issues.`)
  }
  if (!Number.isFinite(maxFixesPerGeneration) || maxFixesPerGeneration < 0 || !Number.isInteger(maxFixesPerGeneration)) {
    throw new Error(`maxFixesPerGeneration must be a finite integer >= 0, got ${maxFixesPerGeneration}`)
  }
  if (maxFixesPerGeneration > 1000) {
    throw new Error(`maxFixesPerGeneration must be <= 1000, got ${maxFixesPerGeneration}. Excessive fixes can cause performance issues.`)
  }
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || !Number.isInteger(maxAttempts)) {
    throw new Error(`maxAttempts must be a finite integer >= 1, got ${maxAttempts}`)
  }
  if (maxAttempts > 100000) {
    throw new Error(`maxAttempts must be <= 100000, got ${maxAttempts}. Excessive attempts can cause performance issues.`)
  }

  return {
    seed: options?.seed,
    count,
    includeOptionalProbability,
    maxGenerations,
    maxFixesPerGeneration,
    maxAttempts,
    useDefaults: options?.useDefaults ?? false,
    useExamples: options?.useExamples ?? false,
    mode: options?.mode ?? 'random',
    useConstTitles: options?.useConstTitles ?? false,
  }
}

/**
 * Post-process generated value to replace const values with their titles.
 * Walks the value tree and replaces values at paths recorded in constTitleMappings.
 */
function applyConstTitleReplacements(
  value: SchemaValue,
  mappings: Map<string, import('./core').ConstTitleMapping>,
): SchemaValue {
  function walk(current: SchemaValue, path: string[]): SchemaValue {
    const pathKey = path.join('.')
    const mapping = mappings.get(pathKey)
    
    // If we have a mapping for this path and the value matches the const, replace it
    if (mapping && current === mapping.constValue) {
      return mapping.title
    }
    
    // Recursively walk objects
    if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      const result: Record<string, SchemaValue> = {}
      for (const [key, val] of Object.entries(current)) {
        result[key] = walk(val, [...path, key])
      }
      return result
    }
    
    // Recursively walk arrays
    if (Array.isArray(current)) {
      return current.map((item, index) => walk(item, [...path, String(index)]))
    }
    
    // Primitive value with no mapping
    return current
  }
  
  return walk(value, [])
}

/**
 * Generate a single value with hybrid retry loop (random + guided fixes).
 * RNG is passed in to allow state to advance across multiple calls (for count > 1).
 */
function generateSingle(
  schema: JsfSchema,
  options: NormalizedOptions,
  rng: import('./rand').SeededRandom,
): GenerationResult {
  const { generateValue } = require('./core')
  const { MaxAttemptsExceededError } = require('./errors')
  const { validateSchema } = require('../validation/schema')
  const { applyFixes } = require('./fixes')

  let totalAttempts = 0
  let lastErrors: any[] = []
  let generationsCompleted = 0
  
  // Initialize const→title mappings if requested
  const constTitleMappings = options.useConstTitles 
    ? new Map<string, import('./core').ConstTitleMapping>() 
    : undefined

  // Preprocessing: find all properties with x-jsf-logic-computedAttrs anywhere in the schema
  // This allows us to skip them during generation regardless of where they're defined
  const { findComputedFields } = require('./preprocessing')
  const computedFields = findComputedFields(schema)

  // Outer loop: random regenerations
  for (let generation = 1; generation <= options.maxGenerations; generation++) {
    if (totalAttempts >= options.maxAttempts) {
      break // Hit absolute limit
    }

    generationsCompleted = generation
    
    // Reset mappings for each generation attempt
    constTitleMappings?.clear()
    
    const context = { 
      rng, 
      options, 
      attempt: generation,
      path: [],
      constTitleMappings,
      computedFields,
    }
    let value = generateValue(schema, context)
    totalAttempts++

    // Inner loop: guided fixes
    let remainingFixAttempts = options.maxFixesPerGeneration
    let previousErrorCount = Infinity

    while (remainingFixAttempts > 0 && totalAttempts < options.maxAttempts) {
      const errors = validateSchema(value, schema)

      if (errors.length === 0) {
        // Apply const→title replacements if enabled
        const finalValue = constTitleMappings && constTitleMappings.size > 0
          ? applyConstTitleReplacements(value, constTitleMappings)
          : value
        return { value: finalValue, attempts: totalAttempts }
      }

      lastErrors = errors

      // Try to apply fixes
      const fixed = applyFixes(value, errors, schema, context)

      // Check if we made any changes
      if (fixed === value) {
        break // Can't fix anything, regenerate
      }

      // Check if we made progress (reduced error count)
      if (errors.length < previousErrorCount) {
        remainingFixAttempts = options.maxFixesPerGeneration // Reset on progress!
      } else {
        remainingFixAttempts--
      }

      previousErrorCount = errors.length
      value = fixed
      totalAttempts++
    }

    // If we exhausted fix attempts, loop will regenerate
  }

  // Failed to generate valid value
  const errorSummary = lastErrors.slice(0, 3).map(e => 
    typeof e === 'object' && e !== null && 'message' in e ? e.message : String(e)
  ).join('; ')
  
  throw new MaxAttemptsExceededError(
    `Failed to generate valid value after ${totalAttempts} attempts (${generationsCompleted} generations). Last errors: ${errorSummary}`,
    totalAttempts,
    lastErrors,
  )
}
