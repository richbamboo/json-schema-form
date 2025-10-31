#!/usr/bin/env node
/**
 * Test harness for generating fake data from JSON Schema files
 * 
 * Usage:
 *   npm run generate-fake -- <path-to-schema.json> [options]
 *   
 * Options:
 *   --seed <number>              Seed for deterministic generation (default: random)
 *   --count <number>             Number of values to generate (default: 1)
 *   --max-attempts <number>      Max retry attempts (default: 30)
 *   --optional-probability <n>   Probability of including optional fields 0-1 (default: 0.3)
 *   --output <file>              Write output to file instead of stdout
 *   --pretty                     Pretty-print JSON output (default: true)
 *   --remove-if-then-else        Remove if/then/else (M12 not supported yet)
 * 
 * Examples:
 *   npm run generate-fake -- test/faker/schemas/onboarding-albania.json
 *   npm run generate-fake -- schema.json --seed 42 --count 5
 *   npm run generate-fake -- schema.json --output output.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { generateFromSchema } from '../dist/index.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('Error: Schema file path is required')
    console.error('Usage: npm run generate-fake -- <path-to-schema.json> [options]')
    process.exit(1)
  }

  const schemaPath = args[0]
  const options = {
    count: 1,
    maxAttempts: 30,
    optionalProbability: 0.3,
    pretty: true,
    removeIfThenElse: false,
  }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--seed':
        options.seed = parseInt(args[++i], 10)
        break
      case '--count':
        options.count = parseInt(args[++i], 10)
        break
      case '--max-attempts':
        options.maxAttempts = parseInt(args[++i], 10)
        break
      case '--optional-probability':
        options.optionalProbability = parseFloat(args[++i])
        break
      case '--output':
        options.output = args[++i]
        break
      case '--pretty':
        options.pretty = true
        break
      case '--no-pretty':
        options.pretty = false
        break
      case '--remove-if-then-else':
        options.removeIfThenElse = true
        break
      default:
        console.error(`Unknown option: ${args[i]}`)
        process.exit(1)
    }
  }

  return { schemaPath, options }
}

function loadSchema(filePath) {
  try {
    const absolutePath = resolve(filePath)
    const content = readFileSync(absolutePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error loading schema file: ${error}`)
    process.exit(1)
  }
}

function main() {
  const { schemaPath, options } = parseArgs()

  console.error(`Loading schema from: ${schemaPath}`)
  let schema = loadSchema(schemaPath)

  // Remove if/then/else if requested (M12 not supported yet)
  if (options.removeIfThenElse && schema.allOf) {
    console.error('Removing if/then/else conditionals (not yet supported in MVP)')
    schema = { ...schema, allOf: undefined }
  }

  console.error(`Generating ${options.count} fake value(s)...`)
  console.error(`Options: seed=${options.seed ?? 'random'}, maxAttempts=${options.maxAttempts}, optionalProbability=${options.optionalProbability}`)
  console.error('')

  const results = []
  const errors = []

  for (let i = 0; i < options.count; i++) {
    try {
      const result = generateFromSchema(schema, {
        seed: options.seed !== undefined ? options.seed + i : undefined,
        maxAttempts: options.maxAttempts,
        includeOptionalProbability: options.optionalProbability,
      })

      // Successfully generated
      results.push(result)
    } catch (error) {
      console.error(`Error generating value ${i + 1}: ${error.message}`)
      errors.push({
        index: i,
        error: error.message,
      })
    }
  }

  // Prepare output
  const output = options.count === 1 ? results[0] : results
  const jsonOutput = options.pretty 
    ? JSON.stringify(output, null, 2)
    : JSON.stringify(output)

  // Write output
  if (options.output) {
    writeFileSync(options.output, jsonOutput, 'utf-8')
    console.error(`\nOutput written to: ${options.output}`)
  } else {
    console.log(jsonOutput)
  }

  // Summary
  console.error(`\nSummary:`)
  console.error(`  Successfully generated: ${results.length}/${options.count}`)
  console.error(`  Failed: ${errors.length}/${options.count}`)

  if (errors.length > 0) {
    console.error(`\nErrors encountered during generation. See details above.`)
    process.exit(1)
  }
}

main()
