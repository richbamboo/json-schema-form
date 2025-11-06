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
    const formatted = generateFormat(schema.format, rng, schema)
    // Adjust length if needed
    // Note: padding/truncating may break format validation (e.g., truncated UUID)
    // The retry loop in generateSingle will compensate, but may exhaust attempts
    return adjustStringLength(formatted, schema.minLength, schema.maxLength)
  }

  // Generate a random string within length constraints
  const minLength = schema.minLength ?? 1 // Default to at least 1 character
  const maxLength = schema.maxLength ?? Math.max(minLength + 20, 50)
  
  // Validate length constraints
  if (typeof minLength === 'number' && (!Number.isFinite(minLength) || minLength < 0 || !Number.isInteger(minLength))) {
    throw new Error(`minLength must be a non-negative finite integer, got ${minLength}`)
  }
  if (typeof maxLength === 'number' && (!Number.isFinite(maxLength) || maxLength < 0 || !Number.isInteger(maxLength))) {
    throw new Error(`maxLength must be a non-negative finite integer, got ${maxLength}`)
  }
  if (typeof minLength === 'number' && typeof maxLength === 'number' && minLength > maxLength) {
    throw new Error(`minLength (${minLength}) must be <= maxLength (${maxLength})`)
  }
  
  const length = rng.integer(minLength, maxLength)
  
  // Check if schema indicates this should be Lorem Ipsum text
  const presentation = schema['x-jsf-presentation'] as Record<string, any> | undefined
  const inputType = presentation?.inputType as string | undefined
  const useLoremIpsum = inputType === 'textarea'

  return generateRandomString(length, rng, useLoremIpsum)
}

/**
 * Generate a string from a regex pattern using randexp.
 * Seed randexp with our PRNG for determinism.
 * @throws {Error} If pattern is invalid
 */
function generateFromPattern(
  pattern: string,
  minLength: number | undefined,
  maxLength: number | undefined,
  rng: import('./rand').SeededRandom,
): string {
  let randexp: RandExp
  try {
    randexp = new RandExp(pattern)
  } catch (err) {
    throw new Error(`Invalid regex pattern: ${pattern}. ${err instanceof Error ? err.message : String(err)}`)
  }

  // Override randexp's RNG with our seeded one
  randexp.randInt = (min: number, max: number) => rng.integer(min, max)

  // Set a maximum length to prevent ReDoS and memory exhaustion
  // Use maxLength if provided, otherwise cap at 10000 characters
  const safeMax = maxLength !== undefined ? maxLength : 10000
  randexp.max = safeMax

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
  // Validate inputs
  if (minLength !== undefined && minLength < 0) {
    throw new Error(`minLength must be >= 0, got ${minLength}`)
  }
  if (maxLength !== undefined && maxLength < 0) {
    throw new Error(`maxLength must be >= 0, got ${maxLength}`)
  }
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new Error(`minLength must be <= maxLength, got minLength=${minLength}, maxLength=${maxLength}`)
  }
  
  // Safety check: if string is excessively long, truncate before grapheme segmentation
  // to prevent CPU exhaustion from Intl.Segmenter on very long strings
  if (str.length > 50000) {
    str = str.substring(0, 50000)
  }

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
 * Generate a random string of specified length.
 * Uses Lorem Ipsum for textarea fields or longer strings (>30 chars) for readability.
 * Uses alphanumeric for shorter strings or text inputs.
 */
function generateRandomString(
  length: number, 
  rng: import('./rand').SeededRandom,
  useLoremIpsum?: boolean
): string {
  if (length < 0) {
    throw new Error(`length must be >= 0, got ${length}`)
  }
  
  // Use Lorem Ipsum if explicitly requested (textarea) or for longer strings
  if (useLoremIpsum || length > 30) {
    return generateLoremIpsum(length, rng)
  }
  
  // For shorter strings or text inputs, use alphanumeric
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const result: string[] = []
  for (let i = 0; i < length; i++) {
    result.push(chars[rng.integer(0, chars.length - 1)])
  }
  return result.join('')
}

/**
 * Generate Lorem Ipsum text of approximately the specified length.
 */
function generateLoremIpsum(length: number, rng: import('./rand').SeededRandom): string {
  const loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
    'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
    'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
  ]
  
  const words: string[] = []
  let currentLength = 0
  
  while (currentLength < length) {
    const word = loremWords[rng.integer(0, loremWords.length - 1)]
    
    // Add space before word (except first word)
    const addSpace = words.length > 0
    const wordWithSpace = addSpace ? ' ' + word : word
    
    // Check if adding this word would exceed length
    if (currentLength + wordWithSpace.length > length) {
      // If we need more characters, add partial word
      const remaining = length - currentLength
      if (remaining > 0) {
        words.push(addSpace ? ' ' + word.substring(0, remaining - 1) : word.substring(0, remaining))
      }
      break
    }
    
    words.push(wordWithSpace)
    currentLength += wordWithSpace.length
    
    // Occasionally add punctuation for readability
    if (words.length > 0 && rng.random() < 0.15 && currentLength < length - 10) {
      const punct = rng.random() < 0.7 ? ',' : '.'
      words.push(punct)
      currentLength += 1
      
      // Capitalize next word after period
      if (punct === '.' && currentLength < length - 5) {
        const nextWord = loremWords[rng.integer(0, loremWords.length - 1)]
        const capitalized = ' ' + nextWord.charAt(0).toUpperCase() + nextWord.slice(1)
        if (currentLength + capitalized.length <= length) {
          words.push(capitalized)
          currentLength += capitalized.length
        }
      }
    }
  }
  
  let result = words.join('')
  
  // Capitalize first letter
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1)
  }
  
  // Ensure exact length by padding or trimming
  if (result.length < length) {
    result += ' '.repeat(length - result.length)
  } else if (result.length > length) {
    result = result.substring(0, length)
  }
  
  return result
}
