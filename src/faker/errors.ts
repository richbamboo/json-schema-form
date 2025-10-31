import type { JsfSchema } from '../types'

/**
 * Base class for generation errors.
 */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when a schema contains features we explicitly do not support.
 * Example: multiple patterns under allOf.
 */
export class UnsupportedGenerationError extends GenerationError {
  constructor(
    message: string,
    public schema: JsfSchema,
  ) {
    super(message)
  }
}

/**
 * Thrown when a schema has contradictory constraints.
 * Example: minLength > maxLength.
 */
export class UnsatisfiableSchemaError extends GenerationError {
  constructor(
    message: string,
    public schema: JsfSchema,
  ) {
    super(message)
  }
}

/**
 * Thrown when generation fails after maxAttempts.
 */
export class MaxAttemptsExceededError extends GenerationError {
  constructor(
    message: string,
    public attempts: number,
    public lastErrors: unknown[],
  ) {
    super(message)
  }
}
