import type { NonBooleanJsfSchema } from '../types'
import type { GeneratorContext } from './core'
import RandExp from 'randexp'
import { generateFormat } from './formats'

/**
 * Generate a string value satisfying schema constraints.
 * Handles: minLength, maxLength, pattern, format.
 */
export function generateString(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): string {
  const { rng } = context

  // If pattern is specified, use randexp
  if (schema.pattern) {
    return generateFromPattern(schema.pattern, schema.minLength, schema.maxLength, rng)
  }

  // If format is specified, use faker
  if (schema.format) {
    const formatted = generateFormat(schema.format, rng)
    // Adjust length if needed
    // Note: padding/truncating may break format validation (e.g., truncated UUID)
    // The retry loop in generateSingle will compensate, but may exhaust attempts
    return adjustStringLength(formatted, schema.minLength, schema.maxLength)
  }

  // Generate a random string within length constraints
  const minLength = schema.minLength ?? 1 // Default to at least 1 character
  const maxLength = schema.maxLength ?? Math.max(minLength + 20, 50)
  const length = rng.integer(minLength, maxLength)

  return generateRandomString(length, rng)
}

/**
 * Generate a string from a regex pattern using randexp.
 * Seed randexp with our PRNG for determinism.
 */
function generateFromPattern(
  pattern: string,
  minLength: number | undefined,
  maxLength: number | undefined,
  rng: import('./rand').SeededRandom,
): string {
  const randexp = new RandExp(pattern)

  // Override randexp's RNG with our seeded one
  randexp.randInt = (min: number, max: number) => rng.integer(min, max)

  let generated = randexp.gen()

  // Adjust length if constraints are specified
  // Note: padding/truncating may break pattern validation (e.g., padding breaks ^[a-z]+$)
  // The retry loop in generateSingle will compensate, but may exhaust attempts
  if (minLength !== undefined || maxLength !== undefined) {
    generated = adjustStringLength(generated, minLength, maxLength)
  }

  return generated
}

/**
 * Adjust string length to fit within min/max constraints.
 * Uses grapheme-aware counting to match validator behavior.
 */
function adjustStringLength(
  str: string,
  minLength: number | undefined,
  maxLength: number | undefined,
): string {
  const graphemes = [...new Intl.Segmenter().segment(str)].map(s => s.segment)
  const currentLength = graphemes.length

  if (minLength !== undefined && currentLength < minLength) {
    // Pad with spaces to reach minLength
    const padding = ' '.repeat(minLength - currentLength)
    return str + padding
  }

  if (maxLength !== undefined && currentLength > maxLength) {
    // Truncate to maxLength graphemes
    return graphemes.slice(0, maxLength).join('')
  }

  return str
}

/**
 * Generate a random alphanumeric string of specified length.
 */
function generateRandomString(length: number, rng: import('./rand').SeededRandom): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[rng.integer(0, chars.length - 1)]
  }
  return result
}
