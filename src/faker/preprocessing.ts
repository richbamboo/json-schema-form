import type { JsfSchema } from '../types'

/**
 * Find all properties with x-jsf-logic-computedAttrs and their conditional paths.
 * Returns a Set of "propertyName@path" keys where path describes the conditional hierarchy.
 * 
 * Examples:
 * - "field@allOf.0.then" - field in allOf[0].then branch
 * - "field@allOf.3.then.if.then" - field in allOf[3].then.if.then branch
 * - "field@" - field at root level (no conditionals)
 * 
 * @param schema - The root schema to traverse
 * @returns Set of "property@path" keys for computed fields
 */
export function findComputedFields(schema: JsfSchema): Set<string> {
  const computedFieldPaths = new Set<string>()
  
  function traverse(
    node: unknown, 
    currentProp?: string,
    conditionalPath: string = ''
  ): void {
    // Only traverse objects
    if (typeof node !== 'object' || node === null) {
      return
    }
    
    // If this node has x-jsf-logic-computedAttrs and we know the property name, record it
    if ('x-jsf-logic-computedAttrs' in node && currentProp) {
      const key = `${currentProp}@${conditionalPath}`
      computedFieldPaths.add(key)
    }
    
    // Recursively traverse the schema tree
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && typeof value === 'object' && value !== null) {
        // When we hit a 'properties' object, each key is a property name
        for (const [propName, propSchema] of Object.entries(value)) {
          traverse(propSchema, propName, conditionalPath)
        }
      } else if (key === 'allOf' && Array.isArray(value)) {
        // Traverse allOf array with index tracking
        for (let i = 0; i < value.length; i++) {
          const newPath = conditionalPath ? `${conditionalPath}.allOf.${i}` : `allOf.${i}`
          traverse(value[i], currentProp, newPath)
        }
      } else if (['anyOf', 'oneOf'].includes(key) && Array.isArray(value)) {
        // Traverse anyOf/oneOf array with index tracking
        for (let i = 0; i < value.length; i++) {
          const arrayName = key as 'anyOf' | 'oneOf'
          const newPath = conditionalPath ? `${conditionalPath}.${arrayName}.${i}` : `${arrayName}.${i}`
          traverse(value[i], currentProp, newPath)
        }
      } else if (['if', 'then', 'else', 'not'].includes(key)) {
        // Traverse conditional branches with branch name
        const newPath = conditionalPath ? `${conditionalPath}.${key}` : key
        traverse(value, currentProp, newPath)
      } else if (key === 'items') {
        // Traverse array items schema
        traverse(value, currentProp, conditionalPath)
      } else {
        // For other keys, continue traversing but don't update path
        traverse(value, currentProp, conditionalPath)
      }
    }
  }
  
  traverse(schema)
  return computedFieldPaths
}
