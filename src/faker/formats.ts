import type { Format } from 'json-schema-typed/draft-2020-12'
import type { SeededRandom } from './rand'
import type { NonBooleanJsfSchema } from '../types'
import { faker } from '@faker-js/faker'

/**
 * Generate a string matching a JSON Schema format.
 * Uses @faker-js/faker where possible; custom helpers otherwise.
 * Note: Faker should be seeded once at the start of generation (in generateFromSchema).
 */
export function generateFormat(
  format: Format | string,
  rng: SeededRandom,
  schema?: NonBooleanJsfSchema,
): string {
  switch (format) {
    case 'email':
    case 'idn-email':
      return faker.internet.email()

    case 'uuid':
      return faker.string.uuid()

    case 'uri':
    case 'uri-reference':
    case 'iri':
    case 'iri-reference':
      return faker.internet.url()

    case 'hostname':
    case 'idn-hostname':
      return faker.internet.domainName()

    case 'ipv4':
      return faker.internet.ipv4()

    case 'ipv6':
      return faker.internet.ipv6()

    case 'date-time':
      return generateDateTime(schema, rng)

    case 'date':
      return generateDate(schema, rng)

    case 'time':
      return faker.date.recent().toISOString().split('T')[1]

    case 'duration':
      // ISO 8601 duration: PT1H30M
      return `PT${rng.integer(0, 23)}H${rng.integer(0, 59)}M`

    case 'regex':
      // Simple regex pattern
      return '^[a-z]+$'

    case 'json-pointer':
      return `/field${rng.integer(0, 10)}`

    case 'json-pointer-uri-fragment':
      return `#/field${rng.integer(0, 10)}`

    case 'relative-json-pointer':
      return `${rng.integer(0, 5)}/field`

    case 'uri-template':
      return `https://example.com/{id}`

    default:
      // Fallback for unknown formats
      return faker.lorem.word()
  }
}

/**
 * Generate a date string respecting minDate/maxDate from x-jsf-presentation.
 * Returns format: YYYY-MM-DD
 */
function generateDate(schema: NonBooleanJsfSchema | undefined, rng: SeededRandom): string {
  const presentation = schema?.['x-jsf-presentation'] as Record<string, any> | undefined
  const minDate = presentation?.minDate as string | undefined
  const maxDate = presentation?.maxDate as string | undefined

  let fromDate: Date
  let toDate: Date

  if (maxDate) {
    toDate = new Date(maxDate)
  } else {
    toDate = new Date() // Default to today
  }

  if (minDate) {
    fromDate = new Date(minDate)
  } else {
    // Default to 100 years before toDate
    fromDate = new Date(toDate)
    fromDate.setFullYear(fromDate.getFullYear() - 100)
  }

  // Generate a random date between fromDate and toDate
  const date = faker.date.between({ from: fromDate, to: toDate })
  return date.toISOString().split('T')[0]
}

/**
 * Generate a date-time string respecting minDate/maxDate from x-jsf-presentation.
 * Returns format: ISO 8601 with time
 */
function generateDateTime(schema: NonBooleanJsfSchema | undefined, rng: SeededRandom): string {
  const presentation = schema?.['x-jsf-presentation'] as Record<string, any> | undefined
  const minDate = presentation?.minDate as string | undefined
  const maxDate = presentation?.maxDate as string | undefined

  let fromDate: Date
  let toDate: Date

  if (maxDate) {
    toDate = new Date(maxDate)
  } else {
    toDate = new Date() // Default to now
  }

  if (minDate) {
    fromDate = new Date(minDate)
  } else {
    // Default to 100 years before toDate
    fromDate = new Date(toDate)
    fromDate.setFullYear(fromDate.getFullYear() - 100)
  }

  // Generate a random date-time between fromDate and toDate
  const date = faker.date.between({ from: fromDate, to: toDate })
  return date.toISOString()
}
