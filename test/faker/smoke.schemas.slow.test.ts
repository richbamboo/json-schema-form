import { describe, expect, it } from '@jest/globals'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { generateFromSchema } from '../../src/faker'
import { validateSchema } from '../../src/validation/schema'
import { findComputedFields } from '../../src/faker/preprocessing'

/**
 * Smoke tests for all real-world schemas.
 * 
 * These tests are tagged with @slow and excluded from default test runs.
 * 
 * To run these tests explicitly:
 *   pnpm test -- --testNamePattern="@slow"
 * 
 * To run a specific schema:
 *   pnpm test -- --testNamePattern="@slow.*employment_basic"
 */
describe('smoke test: all real-world schemas @slow', () => {
  const schemaDir = join(__dirname, 'schemas')
  const schemaFiles = readdirSync(schemaDir)
    .filter(f => f.endsWith('.json'))
    .sort()

  it.each(schemaFiles)(
    'should generate valid data for %s',
    (file) => {
      const schemaPath = join(schemaDir, file)
      const schemaContent = readFileSync(schemaPath, 'utf-8')
      const schema = JSON.parse(schemaContent)

      // Generate with higher maxAttempts for complex schemas
      const result = generateFromSchema(schema, {
        seed: 42,
        maxAttempts: 100,
      })

      // Validate the generated data, allowing computed fields to be missing
      const computedFieldPaths = findComputedFields(schema)
      const errors = validateSchema(result, schema, { computedFieldPaths })
      
      if (errors.length > 0) {
        console.error(`Validation errors for ${file}:`, JSON.stringify(errors, null, 2))
        console.error('Generated data:', JSON.stringify(result, null, 2))
      }

      expect(errors).toEqual([])
    },
    30000, // 30 second timeout per schema
  )

  it('should have found schemas to test', () => {
    expect(schemaFiles.length).toBeGreaterThan(0)
    console.log(`Found ${schemaFiles.length} schemas to test`)
  })
})
