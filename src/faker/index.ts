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
  /** Maximum number of generation attempts before throwing. Default: 30. */
  maxAttempts?: number
  /** Use `default` values from schema when present. Default: false. */
  useDefaults?: boolean
  /** Use `examples` values from schema when present. Default: false. */
  useExamples?: boolean
  /** Generation mode. Default: 'random'. Other modes deferred. */
  mode?: 'random' | 'faker' | 'ai'
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

  const results: SchemaValue[] = []
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
    maxAttempts: options?.maxAttempts ?? 30,
    useDefaults: options?.useDefaults ?? false,
    useExamples: options?.useExamples ?? false,
    mode: options?.mode ?? 'random',
  }
}

/**
 * Generate a single value with attempt+retry loop.
 * RNG is passed in to allow state to advance across multiple calls (for count > 1).
 */
function generateSingle(
  schema: JsfSchema,
  options: NormalizedOptions,
  rng: import('./rand').SeededRandom,
): SchemaValue {
  const { generateValue } = require('./core')
  const { MaxAttemptsExceededError } = require('./errors')
  const { validateSchema } = require('../validation/schema')

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const context = { rng, options, attempt }
    const value = generateValue(schema, context)

    // Validate the generated value
    const errors = validateSchema(value, schema)

    if (errors.length === 0) {
      return value
    }

    // On failure, continue to next attempt (no guided retries in MVP)
    if (attempt === options.maxAttempts) {
      throw new MaxAttemptsExceededError(
        `Failed to generate valid value after ${options.maxAttempts} attempts. Last errors: ${JSON.stringify(errors.slice(0, 3))}`,
        options.maxAttempts,
        errors,
      )
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Unexpected: loop should have thrown MaxAttemptsExceededError')
}
