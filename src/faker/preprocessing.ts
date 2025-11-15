import type { JsfSchema } from '../types'

/**
 * Find all property names that have x-jsf-logic-computedAttrs anywhere in the schema tree.
 * This includes properties defined in nested conditionals (if/then/else), composition keywords
 * (allOf/anyOf/oneOf), and at any depth in the schema.
 * 
 * @param schema - The root schema to traverse
 * @returns Set of property names that should not be generated
 */
export function findComputedFields(schema: JsfSchema): Set<string> {
  const computedFields = new Set<string>()
  
  function traverse(node: unknown, currentProp?: string): void {
    // Only traverse objects
    if (typeof node !== 'object' || node === null) {
      return
    }
    
    // If this node has x-jsf-logic-computedAttrs and we know the property name, record it
    if ('x-jsf-logic-computedAttrs' in node && currentProp) {
      computedFields.add(currentProp)
    }
    
    // Recursively traverse the schema tree
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && typeof value === 'object' && value !== null) {
        // When we hit a 'properties' object, each key is a property name
        for (const [propName, propSchema] of Object.entries(value)) {
          traverse(propSchema, propName)
        }
      } else if (['allOf', 'anyOf', 'oneOf'].includes(key) && Array.isArray(value)) {
        // Traverse array of schemas
        for (const item of value) {
          traverse(item, currentProp)
        }
      } else if (['if', 'then', 'else', 'not'].includes(key)) {
        // Traverse conditional branches
        traverse(value, currentProp)
      } else if (key === 'items') {
        // Traverse array items schema
        traverse(value, currentProp)
      } else {
        // For other keys, continue traversing but don't treat them as property names
        traverse(value, currentProp)
      }
    }
  }
  
  traverse(schema)
  return computedFields
}
