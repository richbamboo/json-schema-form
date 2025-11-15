import type { JsfSchema, NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'
import { UnsupportedGenerationError } from './errors'

/**
 * Keys that should never be copied to prevent prototype pollution.
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

/**
 * Safely copy properties from source to target, excluding dangerous keys.
 * @param target - Target object to copy to
 * @param source - Source object to copy from
 * @param excludeKeys - Additional keys to exclude (beyond dangerous keys)
 */
function safeCopyProperties(
  target: any,
  source: any,
  excludeKeys: string[] = []
): void {
  const allExcludedKeys = [...DANGEROUS_KEYS, ...excludeKeys]
  for (const [key, val] of Object.entries(source)) {
    if (!allExcludedKeys.includes(key)) {
      target[key] = val
    }
  }
}

/**
 * Handle allOf composition - generate value satisfying all subschemas.
 * Strategy: Merge constraints from all subschemas, then generate.
 * Note: Complex constraint intersections (e.g., multiple patterns) are unsupported.
 */
export function handleAllOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  
  if (!schema.allOf || !Array.isArray(schema.allOf) || schema.allOf.length === 0) {
    throw new Error('allOf must be a non-empty array')
  }

  // Check for unsupported cases: multiple patterns
  const patterns = schema.allOf.filter(
    (s): s is NonBooleanJsfSchema => typeof s === 'object' && 'pattern' in s
  )
  if (patterns.length > 1) {
    throw new UnsupportedGenerationError(
      'allOf with multiple pattern constraints is not supported',
      schema
    )
  }

  // Merge all subschemas into one
  // Handle special cases: properties and required need deep merging
  // Note: For conflicting constraints (e.g., multiple minimum values), last value wins.
  // Trust retry loop to catch invalid combinations.
  
  // Start with the base schema (includes root-level properties/required)
  const mergedSchema: NonBooleanJsfSchema = { ...schema }
  delete mergedSchema.allOf // Remove allOf since we're merging it
  
  const allProperties: Record<string, JsfSchema> = { ...schema.properties }
  const allRequired: string[] = [...(schema.required || [])]
  const conditionals: Array<{ schema: NonBooleanJsfSchema; index: number }> = []
  
  for (let i = 0; i < schema.allOf.length; i++) {
    const subSchema = schema.allOf[i]
    // Handle boolean schemas
    if (subSchema === false) {
      // false in allOf makes the entire schema unsatisfiable
      throw new UnsupportedGenerationError(
        'allOf with false schema is unsatisfiable',
        schema
      )
    }
    if (subSchema === true) {
      // true schema has no effect, skip it
      continue
    }
    
    if (typeof subSchema === 'object') {
      // If this subschema has if/then/else, save it for later with its index
      if (subSchema.if) {
        conditionals.push({ schema: subSchema, index: i })
        continue // Don't merge conditional schemas directly
      }
      
      // Merge properties (deep merge to preserve base constraints)
      if (subSchema.properties) {
        for (const [key, propSchema] of Object.entries(subSchema.properties)) {
          if (propSchema === false) {
            // false schema means property is forbidden - remove it
            delete allProperties[key]
          } else if (propSchema === true) {
            // true schema means any value is allowed - only set if not already defined
            if (!(key in allProperties)) {
              allProperties[key] = true
            }
            // If already defined, keep the existing constraint (more restrictive)
          } else if (allProperties[key] && typeof allProperties[key] === 'object' && typeof propSchema === 'object') {
            // Merge with existing property schema
            allProperties[key] = { ...allProperties[key], ...propSchema } as JsfSchema
          } else {
            // No existing schema or can't merge - just assign
            allProperties[key] = propSchema
          }
        }
      }
      
      // Collect required fields
      if (Array.isArray(subSchema.required)) {
        allRequired.push(...subSchema.required)
      }
      
      // Copy other properties (last one wins for conflicts)
      // Protect against prototype pollution
      safeCopyProperties(mergedSchema, subSchema)
    }
  }
  
  // Set merged properties and required
  if (Object.keys(allProperties).length > 0) {
    mergedSchema.properties = allProperties
  }
  if (allRequired.length > 0) {
    mergedSchema.required = [...new Set(allRequired)] // Deduplicate
  }

  // If there are conditionals, we can only directly apply one at schema generation time
  // Others will be checked during validation and fixed in retry loop
  // Note: Computed fields (x-jsf-logic-computedAttrs) in 2nd+ conditionals are handled
  // correctly via path-based preprocessing
  if (conditionals.length > 0) {
    const firstConditional = conditionals[0]
    mergedSchema.if = firstConditional.schema.if
    mergedSchema.then = firstConditional.schema.then
    mergedSchema.else = firstConditional.schema.else
    
    // Update conditional path to track which allOf index we're processing
    const basePath = context.conditionalPath || ''
    const newPath = basePath ? `${basePath}.allOf.${firstConditional.index}` : `allOf.${firstConditional.index}`
    const updatedContext = { ...context, conditionalPath: newPath }
    return generateValue(mergedSchema as JsfSchema, updatedContext)
  }

  return generateValue(mergedSchema as JsfSchema, context)
}

/**
 * Helper to record const→title mapping if useConstTitles is enabled.
 * Evaluates the predicate (if function) and records the mapping.
 */
function recordConstTitleMapping(
  chosenSchema: JsfSchema,
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): void {
  // Check if we should use const titles for this field
  const shouldUseTitle = context.options.useConstTitles &&
    context.constTitleMappings &&
    context.path &&
    (typeof context.options.useConstTitles === 'function'
      ? context.options.useConstTitles(context.path.join('.'), schema)
      : context.options.useConstTitles)
  
  // If enabled and chosen schema has both const and title, record mapping
  if (
    shouldUseTitle &&
    typeof chosenSchema === 'object' &&
    chosenSchema !== null &&
    'const' in chosenSchema &&
    'title' in chosenSchema &&
    typeof chosenSchema.title === 'string'
  ) {
    const pathKey = context.path!.join('.')
    context.constTitleMappings!.set(pathKey, {
      constValue: chosenSchema.const,
      title: chosenSchema.title,
    })
  }
}

/**
 * Unified handler for oneOf/anyOf composition.
 * Picks a random subschema and merges it with parent constraints.
 */
function handleComposition(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
  type: 'oneOf' | 'anyOf',
): SchemaValue {
  const { generateValue } = require('./core')
  const { rng } = context
  
  const compositionArray = schema[type]
  
  if (!compositionArray || !Array.isArray(compositionArray) || compositionArray.length === 0) {
    throw new Error(`${type} must be a non-empty array`)
  }

  // Pick a random subschema
  const chosenSchema = rng.pick(compositionArray) as JsfSchema
  
  // Record const→title mapping if applicable
  recordConstTitleMapping(chosenSchema, schema, context)
  
  // Merge parent schema constraints with the chosen branch
  const { [type]: _, ...parentConstraints } = schema
  
  // Handle boolean schemas
  if (typeof chosenSchema === 'boolean') {
    return generateValue(chosenSchema, context)
  }
  
  const mergedSchema = { ...parentConstraints, ...chosenSchema }
  
  return generateValue(mergedSchema, context)
}

/**
 * Handle anyOf composition - pick one viable subschema.
 * Strategy: Pick a random subschema and merge it with parent constraints.
 */
export function handleAnyOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  return handleComposition(schema, context, 'anyOf')
}

/**
 * Handle oneOf composition - pick exactly one viable subschema.
 * Strategy: Pick a random subschema and merge it with parent constraints.
 * Note: Disjointness checking is complex, trust retry loop to validate.
 */
export function handleOneOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  return handleComposition(schema, context, 'oneOf')
}

/**
 * Handle if/then/else conditionals.
 * Strategy: Try both branches (then and else), pick one randomly, generate and validate.
 * The retry loop will try the other branch if validation fails.
 */
export function handleConditional(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  const { rng } = context
  
  if (!schema.if) {
    throw new Error('Conditional schema must have if clause')
  }

  // Create base schema without conditional keywords
  const baseSchema: NonBooleanJsfSchema = { ...schema }
  delete baseSchema.if
  delete baseSchema.then
  delete baseSchema.else

  // Randomly pick which branch to try first (then or else)
  // The retry loop will validate and retry if needed
  const tryThenFirst = rng.boolean()
  const branches = [
    { name: 'then', schema: schema.then },
    { name: 'else', schema: schema.else },
  ]
  
  if (!tryThenFirst) {
    branches.reverse()
  }

  // Try to merge and generate with the chosen branch
  for (const branch of branches) {
    if (!branch.schema) {
      continue
    }
    
    // Handle boolean schemas
    if (typeof branch.schema === 'boolean') {
      if ((branch.schema as boolean) === false) {
        // false schema means this branch is unsatisfiable, skip it
        continue
      }
      // true schema means no additional constraints, use base schema
      return generateValue(baseSchema as JsfSchema, context)
    }
    
    if (typeof branch.schema !== 'object') {
      continue
    }

    const branchObj = branch.schema as NonBooleanJsfSchema
    
    // Merge branch schema with base (similar to allOf)
    const mergedSchema: NonBooleanJsfSchema = { ...baseSchema }
    
    // Deep merge properties, handling false schemas
    if (branchObj.properties) {
      mergedSchema.properties = { ...baseSchema.properties }
      const forbiddenProps: string[] = []
      
      for (const [key, propSchema] of Object.entries(branchObj.properties)) {
        if (propSchema === false) {
          // false schema means property should not exist - remove it
          delete mergedSchema.properties[key]
          forbiddenProps.push(key)
        } else if (typeof propSchema === 'object') {
          // Merge with existing property schema if it exists
          const existingProp = mergedSchema.properties?.[key]
          if (existingProp && typeof existingProp === 'object') {
            mergedSchema.properties[key] = { ...existingProp, ...propSchema }
          } else {
            mergedSchema.properties[key] = propSchema
          }
        } else {
          mergedSchema.properties[key] = propSchema
        }
      }
      
      // Remove forbidden properties from required array
      if (forbiddenProps.length > 0 && mergedSchema.required) {
        mergedSchema.required = mergedSchema.required.filter(
          (prop) => !forbiddenProps.includes(prop)
        )
      }
    }
    
    // Merge required fields
    if (branchObj.required) {
      const existingRequired = mergedSchema.required || []
      mergedSchema.required = [...new Set([...existingRequired, ...branchObj.required])]
    }
    
    // Copy other constraints from branch (last wins)
    // Protect against prototype pollution
    safeCopyProperties(mergedSchema, branchObj, ['properties', 'required'])

    // Update conditional path to track which branch (then/else) we chose
    const basePath = context.conditionalPath || ''
    const newPath = basePath ? `${basePath}.${branch.name}` : branch.name
    const updatedContext = { ...context, conditionalPath: newPath }
    
    // Generate from merged schema
    // The retry loop will validate this against the full schema (including if/then/else)
    return generateValue(mergedSchema as JsfSchema, updatedContext)
  }

  // No branches to apply, generate from base
  return generateValue(baseSchema as JsfSchema, context)
}
