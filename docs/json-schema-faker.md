# JSON Schema Faker — Architecture & Design

> **Note**: This document describes the architecture, design decisions, and technical approach.
> For usage instructions, see the main README and `scripts/README.md`.

## Overview

Production-ready JSON Schema data generator achieving 100% success rate on 530+ real-world schemas.

**Key Features:**
- Deterministic generation with seedable PRNG
- Hybrid retry strategy with guided error correction
- Full JSON Schema keyword support (strings, numbers, arrays, objects, composition, conditionals)
- 20+ format types (email, uuid, uri, date-time, etc.)
- CLI tool for testing and development

**Quick Start:**
```bash
npm run generate-fake -- path/to/schema.json --seed 42
```

## Architecture

### Core Modules

- **`src/faker/index.ts`** - Main API (`generateFromSchema`) with hybrid retry loop
- **`src/faker/core.ts`** - Generation dispatcher by type and keywords
- **`src/faker/fixes.ts`** - Guided error correction system (9 fix types)
- **`src/faker/rand.ts`** - Seedable PRNG wrapper (seedrandom-based)
- **`src/faker/numbers.ts`** - Number/integer generation with safe limits
- **`src/faker/strings.ts`** - String generation with formats and patterns
- **`src/faker/arrays.ts`** - Array generation with uniqueItems support
- **`src/faker/objects.ts`** - Object generation with required/optional properties
- **`src/faker/composition.ts`** - allOf/anyOf/oneOf/not/if/then/else handlers
- **`src/faker/formats.ts`** - Format-specific generators (20+ types)
- **`src/faker/errors.ts`** - Custom error types

### Tools

- **`scripts/generate-fake-data.mjs`** - CLI for testing and development
- **`scripts/README.md`** - CLI documentation

## Design Goals

### Primary Goals

- **Validation Compatibility**: Generate data that validates against this project's validator (`src/validation/schema.ts`)
- **Determinism**: Identical seed produces identical output for reproducible testing
- **Intelligent Retry**: Hybrid strategy combining random generation with targeted error correction
- **Keyword Coverage**: Support all JSON Schema keywords this repository validates
- **Realistic Data**: Use @faker-js/faker for formats and randexp for pattern-based strings

### Explicit Non-Goals

- **Browser Support**: Node-only runtime (uses Node.js filesystem APIs)
- **$ref Resolution**: Not implemented in the validator, so omitted from generator
- **Remote Schemas**: No network fetching or remote $ref resolution

## Scope (mirrors repository validators)

- **Types**: `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`.
- **Strings** (`src/validation/string.ts`): `minLength`, `maxLength` (graphemes), `pattern`, `format`.
- **Numbers** (`src/validation/number.ts`): `multipleOf`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`.
- **Arrays** (`src/validation/array.ts`): `minItems`, `maxItems`, `uniqueItems`, `contains`, `minContains`, `maxContains`, `prefixItems`, `items`.
- **Objects** (`src/validation/schema.ts`, `src/validation/object.ts`): `required`, `additionalProperties: false`, `patternProperties` for additional-properties checks.
- **Enums/Const**: `enum`, `const` (`value` alias).
- **Composition** (`src/validation/composition.ts`): `allOf`, `anyOf`, `oneOf`, `not`.
- **Conditionals** (`src/validation/conditions.ts`): `if`/`then`/`else`.
- **Formats** (`src/validation/format.ts`): `date-time`, `date`, `time`, `duration`, `email`, `idn-email`, `hostname`, `idn-hostname`, `ipv4`, `ipv6`, `uri`, `uri-reference`, `iri`, `iri-reference`, `regex`, `uuid`, `json-pointer`, `json-pointer-uri-fragment`, `relative-json-pointer`, `uri-template`.
- **Custom/JSF**: `x-jsf-logic` (validations) via `src/validation/json-logic.ts`. `x-jsf-logic-computedAttrs` planned later. `file` validation (`src/validation/file.ts`) planned later.
- **Out of scope for MVP**: `$ref` (absent in this repo).

## API Surface (programmatic only)

```ts
// src/faker/index.ts
export interface GenerateOptions {
  seed?: string | number
  count?: number // default 1, max 10000; when >1 returns array of instances
  includeOptionalProbability?: number // default 0.3
  maxGenerations?: number // default 100, max 10000 - max fresh random generations
  maxFixesPerGeneration?: number // default 5, max 1000 - fix budget per generation (resets on progress)
  maxAttempts?: number // default 1000, max 100000 - absolute safety limit (generations + fixes)
  useDefaults?: boolean // default false
  useExamples?: boolean // default false
}

export function generateFromSchema(schema: import('../types').JsfSchema, options?: GenerateOptions): any
```

- **Determinism**: identical `(schema, seed)` yields identical output.
- **Defaults precedence**: if enabled, `default` > first `examples` > random.
- **Return type**: single value by default; array when `count` is provided.

## Generation Strategy

### Core Generation Flow

1. **Type Dispatch**: `core.ts` routes to type-specific generators based on schema `type`
2. **Constraint Application**: Each generator respects schema constraints (min/max, length, patterns, etc.)
3. **PRNG Usage**: All randomness uses seedable PRNG for determinism
4. **Composition Handling**: `composition.ts` merges constraints from allOf/anyOf/oneOf/not
5. **Conditional Evaluation**: `conditionals.ts` applies if/then/else branches

### Validator Integration

Uses `validateSchema(value, schema)` from `src/validation/schema.ts` as an oracle:
- Validates generated values
- Provides error details for guided fixes
- Ensures output matches validation rules exactly

### Error Types

- **`UnsupportedGenerationError`** - Explicitly unsupported cases (e.g., composite regex intersection in allOf)
- **`UnsatisfiableSchemaError`** - Contradictory constraints (e.g., minimum > maximum)
- **`MaxAttemptsExceededError`** - Exhausted retry budget; includes last validation errors

## Hybrid Retry Algorithm

The generator uses a two-phase approach: random generation followed by guided error correction.

### Phase 1: Random Generation

Generate candidate values using constraint-aware random generation:

- **Strings**: Apply length constraints; use `randexp` for patterns; use `@faker-js/faker` for formats
- **Numbers**: Generate within min/max bounds; apply `multipleOf`; use safe integer limits when unconstrained
- **Booleans**: Random true/false via PRNG
- **Arrays**: Choose length in `[minItems, maxItems]`; ensure `uniqueItems`; handle `prefixItems` and `items`
- **Objects**: Include all `required` properties; include optional properties by probability; respect `additionalProperties`
- **Enums/Const**: Select from enum set; use exact value for const
- **Composition**:
  - `allOf`: Merge constraints (reject composite regex patterns)
  - `anyOf`/`oneOf`: Pick a branch (prefer type-disjoint options)
  - `not`: Handle simple complements (const, enum, simple type)

### Phase 2: Guided Error Correction

When validation fails, apply targeted fixes based on error type:

1. **`required`** - Add missing properties (navigates nested paths)
2. **`forbidden`** - Remove disallowed properties (handles nested objects)
3. **`type`** - Regenerate with correct type (merges constraints)
4. **`const`** - Set exact required value
5. **`enum`/`oneOf`** - Pick valid option from set
6. **`minimum`/`maximum`** - Regenerate within bounds (preserves type)
7. **`uniqueItems`** - Regenerate array with unique elements

### Progress Tracking

- **Fix Budget**: Each generation gets a budget of fixes (default: 5)
- **Progress Reset**: Budget resets when error count decreases
- **Fallback**: Regenerate from scratch if fixes don't help
- **Limits**: Configurable `maxGenerations` (100), `maxFixesPerGeneration` (5), `maxAttempts` (1000)

## Custom Extensions

### x-jsf-logic Support

- **Validations**: Evaluated by validator during `validateSchema` and `validateJsonLogicRules`
- **Strategy**: Rely on retry loop rather than attempting to solve JSON Logic constraints
- **Computed Attributes**: Not applied during generation; handled by validation layer

## Format Generation

Formats are generated using `@faker-js/faker` with fallbacks for unsupported types:

| Format | Implementation |
|--------|----------------|
| `email`, `idn-email` | `faker.internet.email()` |
| `uuid` | `faker.string.uuid()` |
| `hostname`, `idn-hostname` | `faker.internet.domainName()` |
| `ipv4`, `ipv6` | `faker.internet.ip()` with version |
| `uri`, `iri`, `uri-reference`, `iri-reference` | Synthesized with `new URL()` and faker components |
| `date-time`, `date`, `time` | `faker.date` with ISO formatters |
| `duration` | Custom ISO 8601 duration format |
| `regex` | Simple deterministic pattern |
| `json-pointer`, `json-pointer-uri-fragment`, `relative-json-pointer` | Custom generators |
| `uri-template` | Simple template with placeholders |

All formats respect `minLength`/`maxLength` constraints and validation patterns from `src/validation/format.ts`.

## Testing Approach

### Test Structure

- **Fast Tests** (~3s): 657 unit tests for each type, constraint, and fix
- **Slow Tests** (~9s): 530 smoke tests across real-world schemas
- **Total**: 1,187 tests with 100% pass rate
- **Deterministic**: All tests use fixed seeds for reproducibility
- **Validator Integration**: Uses project's validator as oracle

### Coverage

- Type-specific tests (strings, numbers, arrays, objects)
- Constraint tests (bounds, lengths, patterns, formats)
- Composition tests (allOf, anyOf, oneOf, not)
- Conditional tests (if/then/else)
- Fix tests (all 9 error correction types)
- Integration tests (realistic form scenarios)
- Security tests (ReDoS, stack overflow, resource limits, prototype pollution)
- End-to-end tests (API, errors, determinism, performance)
- Smoke tests (530 real-world schemas)

## Design Decisions

### Why Seedable PRNG?

**Decision**: Use `seedrandom` for all randomness

**Rationale**: Deterministic generation is critical for:
- Reproducible test data
- Debugging failed generations
- Consistent CI/CD results
- Regression testing

### Why Safe Integer Limits?

**Decision**: Use `Number.MIN_SAFE_INTEGER` / `Number.MAX_SAFE_INTEGER` instead of arbitrary bounds

**Rationale**:
- No artificial restrictions on valid JSON numbers
- Handles any schema without special cases
- Mathematically correct for unconstrained schemas
- Previous `-1000/1000` limits caused failures on schemas with `minimum > 1000`

### Why Hybrid Retry Strategy?

**Decision**: Combine random generation with targeted error correction

**Rationale**:
- Pure random retry: Simple but low success rate on complex schemas
- Pure constraint solving: Complex, fragile, hard to maintain
- Hybrid approach: Best of both worlds
  - Random generation handles most cases
  - Targeted fixes handle common validation failures
  - Achieves 100% success rate on real-world schemas

### Why Node-Only?

**Decision**: No browser support

**Rationale**:
- Uses Node.js filesystem APIs for schema loading
- Target use case is testing/development, not production
- Simpler implementation and maintenance
- Browser support can be added later if needed

### Why No $ref Support?

**Decision**: Omit `$ref` resolution

**Rationale**:
- Not implemented in this project's validator
- Adds significant complexity (remote fetching, circular refs, etc.)
- Real-world schemas in this project don't use `$ref`
- Can be added later if validator adds support

### Why @faker-js/faker?

**Decision**: Use `@faker-js/faker` for realistic data

**Rationale**:
- Industry-standard library for fake data
- Supports most JSON Schema formats out of the box
- Deterministic when seeded
- Active maintenance and good documentation

### Why randexp?

**Decision**: Use `randexp` for pattern-based strings

**Rationale**:
- Generates strings matching regex patterns
- Deterministic when seeded
- Handles complex patterns better than manual generation
- Well-tested library

## Known Limitations

### Unsupported Features

- **Composite Regex in allOf**: Multiple `pattern` constraints in `allOf` throw `UnsupportedGenerationError`
  - Reason: Regex intersection is computationally complex and rarely needed
  - Workaround: Use single pattern or anyOf instead

- **$ref Resolution**: No support for `$ref` keywords
  - Reason: Not implemented in validator
  - Workaround: Inline schemas or preprocess with $ref resolver

- **File Inputs**: No generation of `FileLike[]` objects
  - Reason: Deferred feature, not needed for current use cases
  - Workaround: Generate file metadata as objects

### Edge Cases

- **Unsatisfiable Schemas**: Contradictory constraints throw `UnsatisfiableSchemaError`
  - Example: `{ minimum: 10, maximum: 5 }`
  - This is a schema error, not a generator bug

- **Complex JSON Logic**: Cross-field constraints may fail to satisfy
  - Example: `password === confirmPassword`
  - Reason: Random generation unlikely to match; no constraint solver
  - Workaround: Use simpler validation or post-process generated data

## Security & Resource Limits

The generator includes comprehensive security protections against malicious schemas:

### Resource Limits

- **Pattern Length**: RandExp-generated strings limited to 10,000 characters
- **Recursion Depth**: Schema nesting limited to 100 levels
- **Object Properties**: Maximum 10,000 properties per object
- **Array Items**: Maximum 10,000 items per array
- **String Length**: Pre-truncated to 50,000 chars before grapheme segmentation
- **Generation Count**: Maximum 10,000 instances per call
- **Generation Attempts**: Configurable limits (maxGenerations ≤ 10,000, maxAttempts ≤ 100,000)

### Protection Against

- **ReDoS Attacks**: Pattern generation bounded by length limits
- **Stack Overflow**: Recursion depth tracking prevents infinite loops
- **Memory Exhaustion**: All data structures have upper bounds
- **CPU Exhaustion**: All operations have time/size limits
- **Prototype Pollution**: Dangerous keys (`__proto__`, `constructor`, `prototype`) filtered
- **Type Confusion**: All numeric constraints validated for NaN/Infinity

### Error Handling

All invalid inputs throw descriptive errors:
- Negative or fractional constraints → Error with actual value
- NaN/Infinity values → Error with type information
- Excessive limits → Error with suggested maximum
- Contradictory constraints → UnsatisfiableSchemaError
- Unsupported features → UnsupportedGenerationError

## Future Enhancements

Potential improvements (not currently planned):

- **Performance**: Memoization, caching, branch heuristics
- **Plugin System**: Custom providers for specialized data types
- **AI Mode**: LLM-based generation for complex constraints
- **Browser Support**: Client-side generation (requires refactoring filesystem usage)
- **JSON Logic Solver**: Constraint solving for cross-field validations
- **$ref Support**: If added to validator

## Invocation Examples

```ts
import { generateFromSchema } from 'json-schema-form/faker'
import type { JsfSchema } from 'json-schema-form/src/types'

const schema: JsfSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 18, maximum: 90 },
  },
  required: ['email'],
}

const value = generateFromSchema(schema, {
  seed: 42,
  includeOptionalProbability: 0.3,
  maxGenerations: 100,
  maxFixesPerGeneration: 5,
  useDefaults: true,
})

// Output (deterministic with seed 42):
// {
//   email: 'Valentine.Miller15@hotmail.com',
//   age: 30
// }
