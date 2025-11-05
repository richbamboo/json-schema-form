import type { JsfSchema, NonBooleanJsfSchema, SchemaValue } from '../types'
import type { GeneratorContext } from './core'
import { UnsupportedGenerationError } from './errors'

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
  const conditionals: NonBooleanJsfSchema[] = []
  
  for (const subSchema of schema.allOf) {
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
      // If this subschema has if/then/else, save it for later
      if (subSchema.if) {
        conditionals.push(subSchema)
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
      const dangerousKeys = ['__proto__', 'constructor', 'prototype']
      for (const [key, val] of Object.entries(subSchema)) {
        if (!dangerousKeys.includes(key)) {
          ;(mergedSchema as any)[key] = val
        }
      }
    }
  }
  
  // Set merged properties and required
  if (Object.keys(allProperties).length > 0) {
    mergedSchema.properties = allProperties
  }
  if (allRequired.length > 0) {
    mergedSchema.required = [...new Set(allRequired)] // Deduplicate
  }

  // If there are conditionals, apply them to the merged schema
  if (conditionals.length > 0) {
    // For now, just apply the first conditional
    // In the future, we could handle multiple conditionals
    const conditional = conditionals[0]
    mergedSchema.if = conditional.if
    mergedSchema.then = conditional.then
    mergedSchema.else = conditional.else
  }

  return generateValue(mergedSchema as JsfSchema, context)
}

/**
 * Handle anyOf composition - pick one viable subschema.
 * Strategy: Pick a random subschema and merge it with parent constraints.
 */
export function handleAnyOf(
  schema: NonBooleanJsfSchema,
  context: GeneratorContext,
): SchemaValue {
  const { generateValue } = require('./core')
  const { rng } = context
  
  if (!schema.anyOf || !Array.isArray(schema.anyOf) || schema.anyOf.length === 0) {
    throw new Error('anyOf must be a non-empty array')
  }

  // Pick a random subschema
  const chosenSchema = rng.pick(schema.anyOf) as JsfSchema
  
  // Merge parent schema constraints with the chosen branch
  // This ensures properties like maxLength, type, etc. from parent are preserved
  const { anyOf, ...parentConstraints } = schema
  
  // Handle boolean schemas
  if (typeof chosenSchema === 'boolean') {
    return generateValue(chosenSchema, context)
  }
  
  const mergedSchema = { ...parentConstraints, ...chosenSchema }
  
  return generateValue(mergedSchema, context)
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
  const { generateValue } = require('./core')
  const { rng } = context
  
  if (!schema.oneOf || !Array.isArray(schema.oneOf) || schema.oneOf.length === 0) {
    throw new Error('oneOf must be a non-empty array')
  }

  // Pick a random subschema
  // The retry loop will validate that it matches exactly one
  const chosenSchema = rng.pick(schema.oneOf) as JsfSchema
  
  // Merge parent schema constraints with the chosen branch
  const { oneOf, ...parentConstraints } = schema
  
  // Handle boolean schemas
  if (typeof chosenSchema === 'boolean') {
    return generateValue(chosenSchema, context)
  }
  
  const mergedSchema = { ...parentConstraints, ...chosenSchema }
  
  return generateValue(mergedSchema, context)
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
    const dangerousKeys = ['__proto__', 'constructor', 'prototype']
    for (const [key, val] of Object.entries(branchObj)) {
      if (key !== 'properties' && key !== 'required' && !dangerousKeys.includes(key)) {
        ;(mergedSchema as any)[key] = val
      }
    }

    // Generate from merged schema
    // The retry loop will validate this against the full schema (including if/then/else)
    return generateValue(mergedSchema as JsfSchema, context)
  }

  // No branches to apply, generate from base
  return generateValue(baseSchema as JsfSchema, context)
}
