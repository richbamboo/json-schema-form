import type { JsfSchema, NonBooleanJsfSchema, SchemaValue, ObjectValue } from '../types'
import type { GeneratorContext } from './core'
import type { ValidationError } from '../errors'

/**
 * Apply targeted fixes to a generated value based on validation errors.
 * Returns the fixed value, or the original value if no fixes could be applied.
 */
export function applyFixes(
  value: SchemaValue,
  errors: ValidationError[],
  schema: JsfSchema,
  context: GeneratorContext,
): SchemaValue {
  // Validate inputs
  if (!Array.isArray(errors) || errors.length === 0) {
    return value
  }
  
  // Clone the value to avoid mutations
  let fixed: SchemaValue
  try {
    fixed = structuredClone(value)
  } catch {
    // If cloning fails, return original value (can't safely fix)
    return value
  }
  
  let madeChanges = false

  for (const error of errors) {
    const result = fixError(fixed, error, schema, context)
    if (result.changed) {
      fixed = result.value
      madeChanges = true
    }
  }

  return madeChanges ? fixed : value
}

interface FixResult {
  value: SchemaValue
  changed: boolean
}

/**
 * Attempt to fix a single validation error.
 */
function fixError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  switch (error.validation) {
    case 'required':
      return fixRequiredError(value, error, schema, context)

    case 'forbidden':
      return fixForbiddenError(value, error)

    case 'enum':
      return fixEnumError(value, error, context)

    case 'minimum':
    case 'maximum':
    case 'exclusiveMinimum':
    case 'exclusiveMaximum':
      return fixNumberBoundsError(value, error, schema, context)

    case 'type':
      return fixTypeError(value, error, schema, context)

    case 'const':
      return fixConstError(value, error, schema, context)

    case 'oneOf':
      return fixOneOfError(value, error, schema, context)

    case 'uniqueItems':
      return fixUniqueItemsError(value, error, schema, context)

    // More fix types can be added here
    default:
      return { value, changed: false }
  }
}

/**
 * Fix a 'required' error by adding the missing property.
 */
function fixRequiredError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { value, changed: false }
  }

  const dataPath = extractDataPath(error.path)
  if (dataPath.length === 0) {
    return { value, changed: false }
  }

  const propertyName = dataPath[dataPath.length - 1]
  if (typeof propertyName !== 'string') {
    return { value, changed: false }
  }

  const parentPath = dataPath.slice(0, -1)

  // For required errors, error.schema comes from the validator and includes
  // conditionally-applied properties. Use it first to check for computed attrs.
  // Fall back to root schema only if error.schema is not available.
  let propertySchema: JsfSchema | undefined = error.schema
  
  // If error.schema is not a property schema, try to get it from the root schema
  if (!propertySchema || typeof propertySchema === 'boolean') {
    const parentSchema = parentPath.length > 0 
      ? getPropertySchemaFromPath(schema, parentPath)
      : schema
    
    if (parentSchema && typeof parentSchema !== 'boolean' && parentSchema.properties) {
      propertySchema = parentSchema.properties[propertyName]
    }
  }
  
  if (!propertySchema || typeof propertySchema === 'boolean') {
    return { value, changed: false }
  }

  // Double-check for computed attributes in the resolved property schema
  if (typeof propertySchema === 'object' && 'x-jsf-logic-computedAttrs' in propertySchema) {
    return { value, changed: false }
  }

  // Generate a value for the missing property
  const { generateValue } = require('./core')
  try {
    // Clone the value
    let cloned: SchemaValue
    try {
      cloned = structuredClone(value)
    } catch {
      return { value, changed: false }
    }
    
    // Navigate to the parent object
    let current: any = cloned
    for (const key of parentPath) {
      if (!(key in current)) {
        return { value, changed: false }
      }
      current = current[key]
    }
    
    // Add the missing property
    current[propertyName] = generateValue(propertySchema, context)
    return { value: cloned as SchemaValue, changed: true }
  } catch {
    return { value, changed: false }
  }
}

/**
 * Fix a 'forbidden' error by removing the property.
 */
function fixForbiddenError(value: SchemaValue, error: ValidationError): FixResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { value, changed: false }
  }

  const dataPath = extractDataPath(error.path)
  if (dataPath.length === 0) {
    return { value, changed: false }
  }

  const propertyName = dataPath[dataPath.length - 1]
  if (typeof propertyName !== 'string') {
    return { value, changed: false }
  }

  // Clone the value
  let cloned: SchemaValue
  try {
    cloned = structuredClone(value)
  } catch {
    return { value, changed: false }
  }
  
  // Navigate to the parent object
  let current: any = cloned
  for (let i = 0; i < dataPath.length - 1; i++) {
    const key = dataPath[i]
    if (!(key in current)) {
      return { value, changed: false }
    }
    current = current[key]
  }

  // Delete the forbidden property
  if (propertyName in current) {
    delete current[propertyName]
    return { value: cloned as SchemaValue, changed: true }
  }

  return { value, changed: false }
}

/**
 * Fix an 'enum' error by picking a valid enum value.
 */
function fixEnumError(
  value: SchemaValue,
  error: ValidationError,
  context: GeneratorContext,
): FixResult {
  const enumSchema = error.schema as { enum?: unknown[] }
  if (!enumSchema.enum || !Array.isArray(enumSchema.enum) || enumSchema.enum.length === 0) {
    return { value, changed: false }
  }

  // Pick a random enum value
  const newValue = context.rng.pick(enumSchema.enum) as SchemaValue
  
  // If this is a nested property, we need to update it in the parent object
  if (error.path.length > 0) {
    const dataPath = extractDataPath(error.path)
    return updateNestedValue(value, dataPath, newValue)
  }

  return { value: newValue as SchemaValue, changed: true }
}

/**
 * Fix number bounds errors by regenerating the number within bounds.
 */
function fixNumberBoundsError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  const dataPath = extractDataPath(error.path)
  
  // Get the property schema from the root schema to preserve type constraints
  const propertySchema = getPropertySchemaFromPath(schema, dataPath)
  if (!propertySchema || typeof propertySchema === 'boolean') {
    return { value, changed: false }
  }
  
  // Merge the error schema constraints with the property schema
  // This ensures we have both the type (from property) and bounds (from error)
  const errorSchema = error.schema as NonBooleanJsfSchema
  const mergedSchema: NonBooleanJsfSchema = {
    ...propertySchema,
    ...errorSchema,
  }
  
  // Generate a new number with the correct bounds and type
  const { generateNumber } = require('./numbers')
  try {
    const newValue = generateNumber(mergedSchema, context)
    
    // If this is a nested property, update it in the parent object
    if (dataPath.length > 0) {
      return updateNestedValue(value, dataPath, newValue)
    }
    
    return { value: newValue, changed: true }
  } catch {
    return { value, changed: false }
  }
}

/**
 * Fix a 'const' error by setting the value to the required constant.
 */
function fixConstError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  const dataPath = extractDataPath(error.path)
  const errorSchema = error.schema as NonBooleanJsfSchema
  
  if (errorSchema.const === undefined) {
    return { value, changed: false }
  }
  
  const constValue = errorSchema.const as SchemaValue
  
  // If this is a nested property, update it in the parent object
  if (dataPath.length > 0) {
    return updateNestedValue(value, dataPath, constValue)
  }
  
  return { value: constValue, changed: true }
}

/**
 * Fix a 'type' error by regenerating the value with the correct type.
 */
function fixTypeError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  const dataPath = extractDataPath(error.path)
  
  // Get the property schema from the root schema
  const propertySchema = dataPath.length > 0
    ? getPropertySchemaFromPath(schema, dataPath)
    : schema
  
  if (!propertySchema || typeof propertySchema === 'boolean') {
    return { value, changed: false }
  }
  
  // Merge with error schema to get complete type information
  const errorSchema = error.schema as NonBooleanJsfSchema
  const mergedSchema: NonBooleanJsfSchema = {
    ...propertySchema,
    ...errorSchema,
  }
  
  // Generate a new value with the correct type
  const { generateValue } = require('./core')
  try {
    const newValue = generateValue(mergedSchema, context)
    
    // If this is a nested property, update it in the parent object
    if (dataPath.length > 0) {
      return updateNestedValue(value, dataPath, newValue)
    }
    
    return { value: newValue, changed: true }
  } catch {
    return { value, changed: false }
  }
}

/**
 * Fix a 'oneOf' error by picking a valid option.
 * Works best when oneOf branches are const values (enum-like).
 */
function fixOneOfError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  const dataPath = extractDataPath(error.path)
  const errorSchema = error.schema as NonBooleanJsfSchema
  
  if (!errorSchema.oneOf || !Array.isArray(errorSchema.oneOf) || errorSchema.oneOf.length === 0) {
    return { value, changed: false }
  }
  
  // Try to extract const values from oneOf branches (enum-like pattern)
  const constValues: unknown[] = []
  for (const branch of errorSchema.oneOf) {
    if (typeof branch !== 'boolean' && branch.const !== undefined) {
      constValues.push(branch.const)
    }
  }
  
  // If we found const values, pick one randomly
  if (constValues.length > 0) {
    const newValue = context.rng.pick(constValues) as SchemaValue
    
    if (dataPath.length > 0) {
      return updateNestedValue(value, dataPath, newValue)
    }
    
    return { value: newValue, changed: true }
  }
  
  // Otherwise, try to generate a value that matches one of the branches
  const { generateValue } = require('./core')
  for (const branch of errorSchema.oneOf) {
    try {
      const newValue = generateValue(branch, context)
      
      if (dataPath.length > 0) {
        return updateNestedValue(value, dataPath, newValue)
      }
      
      return { value: newValue, changed: true }
    } catch {
      // Try next branch
      continue
    }
  }
  
  return { value, changed: false }
}

/**
 * Fix a 'uniqueItems' error by regenerating the array.
 * This often happens when the value is not an array at all (type error).
 */
function fixUniqueItemsError(
  value: SchemaValue,
  error: ValidationError,
  schema: JsfSchema,
  context: GeneratorContext,
): FixResult {
  const dataPath = extractDataPath(error.path)
  
  // Get the property schema
  const propertySchema = dataPath.length > 0
    ? getPropertySchemaFromPath(schema, dataPath)
    : schema
  
  if (!propertySchema || typeof propertySchema === 'boolean') {
    return { value, changed: false }
  }
  
  // Merge with error schema
  const errorSchema = error.schema as NonBooleanJsfSchema
  const mergedSchema: NonBooleanJsfSchema = {
    ...propertySchema,
    ...errorSchema,
  }
  
  // Regenerate the array
  const { generateValue } = require('./core')
  try {
    const newValue = generateValue(mergedSchema, context)
    
    if (dataPath.length > 0) {
      return updateNestedValue(value, dataPath, newValue)
    }
    
    return { value: newValue, changed: true }
  } catch {
    return { value, changed: false }
  }
}

/**
 * Helper to get property schema from a schema.
 */
function getPropertySchema(schema: JsfSchema, propertyName: string): JsfSchema | undefined {
  if (typeof schema === 'boolean') {
    return undefined
  }

  return schema.properties?.[propertyName]
}

/**
 * Helper to get property schema by following a data path.
 * Navigates through properties and array items.
 */
function getPropertySchemaFromPath(
  schema: JsfSchema,
  path: (string | number)[],
): JsfSchema | undefined {
  // Validate input
  if (!Array.isArray(path)) {
    return undefined
  }
  
  if (typeof schema === 'boolean' || path.length === 0) {
    return schema
  }

  let current: JsfSchema | undefined = schema
  
  for (const segment of path) {
    if (!current || typeof current === 'boolean') {
      return undefined
    }

    if (typeof segment === 'string') {
      // Navigate to property
      current = current.properties?.[segment]
    } else {
      // Navigate to array item
      current = current.items as JsfSchema | undefined
    }
    
    if (!current) return undefined
  }

  return current
}

/**
 * Extract the data path from a schema path by filtering out composition keywords.
 * Schema paths include keywords like 'allOf', 'then', 'properties', etc.
 * Data paths only include actual property names and array indices.
 * 
 * Examples:
 * - ['allOf', 2, 'then', 'salary'] → ['salary']
 * - ['properties', 'user', 'properties', 'name'] → ['user', 'name']
 * - ['items', 0, 'properties', 'id'] → [0, 'id']  (0 is data array index)
 */
function extractDataPath(schemaPath: (string | number)[]): (string | number)[] {
  // Validate input
  if (!Array.isArray(schemaPath)) {
    return []
  }
  
  const compositionKeywords = new Set([
    'allOf', 'anyOf', 'oneOf', 'not',
    'if', 'then', 'else',
    'properties', 'additionalProperties',
    'patternProperties', 'dependentSchemas',
  ])

  const result: (string | number)[] = []
  let previousWasItems = false

  for (const segment of schemaPath) {
    if (typeof segment === 'number') {
      // Only keep numbers that follow 'items' (these are actual array indices in data)
      if (previousWasItems) {
        result.push(segment)
      }
      // Numbers after allOf/anyOf/oneOf are schema indices, not data indices - skip them
      previousWasItems = false
    } else if (segment === 'items') {
      // Mark that next number is a data array index
      previousWasItems = true
    } else if (!compositionKeywords.has(segment)) {
      // Keep property names
      result.push(segment)
      previousWasItems = false
    } else {
      previousWasItems = false
    }
  }

  return result
}

/**
 * Helper to update a nested value in an object following a path.
 */
function updateNestedValue(
  value: SchemaValue,
  path: (string | number)[],
  newValue: SchemaValue,
): FixResult {
  // Validate input
  if (!Array.isArray(path)) {
    return { value, changed: false }
  }
  
  if (path.length === 0) {
    return { value: newValue, changed: true }
  }

  if (typeof value !== 'object' || value === null) {
    return { value, changed: false }
  }

  // Clone and navigate to the parent of the target
  let cloned: SchemaValue
  try {
    cloned = structuredClone(value)
  } catch {
    // If cloning fails, can't safely update
    return { value, changed: false }
  }
  
  let current: any = cloned

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (!(key in current)) {
      return { value, changed: false }
    }
    current = current[key]
  }

  // Update the final property
  const finalKey = path[path.length - 1]
  current[finalKey] = newValue

  return { value: cloned, changed: true }
}
