import type { JsfSchema, SchemaValue } from '../types'

/**
 * Options for generating fake data from a JSON Schema.
 */
export interface GenerateOptions {
  /** Seed for deterministic generation. If omitted, generation is non-deterministic. */
  seed?: number
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
    faker.seed(normalizedOptions.seed)
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
 * Normalize and validate generation options.
 */
function normalizeOptions(options?: GenerateOptions): NormalizedOptions {
  return {
    seed: options?.seed,
    count: options?.count ?? 1,
    includeOptionalProbability: options?.includeOptionalProbability ?? 0.3,
    maxGenerations: options?.maxGenerations ?? 100,
    maxFixesPerGeneration: options?.maxFixesPerGeneration ?? 5,
    maxAttempts: options?.maxAttempts ?? 1000,
    useDefaults: options?.useDefaults ?? false,
    useExamples: options?.useExamples ?? false,
    mode: options?.mode ?? 'random',
  }
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

  // Outer loop: random regenerations
  for (let generation = 1; generation <= options.maxGenerations; generation++) {
    if (totalAttempts >= options.maxAttempts) {
      break // Hit absolute limit
    }

    const context = { rng, options, attempt: generation }
    let value = generateValue(schema, context)
    totalAttempts++

    // Inner loop: guided fixes
    let remainingFixAttempts = options.maxFixesPerGeneration
    let previousErrorCount = Infinity

    while (remainingFixAttempts > 0 && totalAttempts < options.maxAttempts) {
      const errors = validateSchema(value, schema)

      if (errors.length === 0) {
        return { value, attempts: totalAttempts }
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
  throw new MaxAttemptsExceededError(
    `Failed to generate valid value after ${totalAttempts} attempts (${options.maxGenerations} generations). Last errors: ${JSON.stringify(lastErrors.slice(0, 3))}`,
    totalAttempts,
    lastErrors,
  )

  // Unreachable, but TypeScript needs it
  throw new Error('Unexpected: loop should have thrown MaxAttemptsExceededError')
}
