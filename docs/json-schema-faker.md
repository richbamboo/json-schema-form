# JSON Schema Faker — Implementation Plan

## 🎉 MVP Status: COMPLETE + M11 & M12 BONUSES

**All core milestones (M0-M8, M10, M11, M12) are complete and tested.**

- ✅ **48 test suites** passing with **519 fast tests + 530 slow integration tests**
- ✅ All JSON Schema keywords supported (strings, numbers, arrays, objects, composition, formats)
- ✅ **if/then/else conditionals fully supported** (M12)
- ✅ **Guided retry system with targeted fixes** (M11)
- ✅ 20+ format types implemented (email, uuid, uri, date-time, etc.)
- ✅ **100% success rate on 530 real-world schemas**
- ✅ CLI test harness tool (`npm run generate-fake`)
- ⏸️ Optional features deferred: file inputs (M9)

**Quick Start:**
```bash
npm run generate-fake -- path/to/schema.json --seed 42
```

See [Milestones & Deliverables](#milestones--deliverables) for detailed completion status.

### What Was Delivered

**Core Implementation:**
- `src/faker/index.ts` - Main API (`generateFromSchema`) with hybrid retry loop
- `src/faker/core.ts` - Core generation engine
- `src/faker/fixes.ts` - Guided error correction system
- `src/faker/rand.ts` - Seedable PRNG wrapper
- `src/faker/numbers.ts`, `strings.ts`, `arrays.ts`, `objects.ts` - Type-specific generators
- `src/faker/composition.ts` - Composition keyword handlers (allOf, anyOf, oneOf, not)
- `src/faker/conditionals.ts` - if/then/else support
- `src/faker/errors.ts` - Custom error types

**Test Coverage:**
- `test/faker/` - 48 test suites with 519 fast tests
- Unit tests for each type, constraint, and fix
- Integration tests with realistic form schemas
- Smoke test with 530 real-world schemas (100% passing)

**Tools:**
- `scripts/generate-fake-data.mjs` - CLI test harness
- `scripts/README.md` - Tool documentation

---

## Goals

- **Generate realistic-looking JSON strings** that validate against this project’s validator (`src/validation/schema.ts`).
- **Deterministic by seed**, Node-only runtime.
- **Attempt+retry strategy** with guided fix-ups and strict `maxAttempts`.
- **Support exactly the keywords/formats/features this repo validates**. No `$ref` (not implemented here).
- **Use @faker-js/faker** for formats/realistic values; **use randexp** for `pattern`.

## Non-goals (initially)

- CLI interface.
- Remote `$ref` resolution.
- Browser support.

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
  count?: number // default 1; when >1 returns array of instances
  includeOptionalProbability?: number // default 0.3
  maxGenerations?: number // default 100 - max fresh random generations
  maxFixesPerGeneration?: number // default 5 - fix budget per generation (resets on progress)
  maxAttempts?: number // default 1000 - absolute safety limit (generations + fixes)
  useDefaults?: boolean // default false
  useExamples?: boolean // default false
  mode?: 'random' | 'faker' | 'ai' // default 'random'
}

export function generateFromSchema(schema: import('../types').JsfSchema, options?: GenerateOptions): any
```

- **Determinism**: identical `(schema, seed)` yields identical output.
- **Defaults precedence**: if enabled, `default` > first `examples` > random.
- **Return type**: single value by default; array when `count` is provided.

## Dependencies

- `@faker-js/faker` — realistic formats/data.
- `randexp` — regex-based string generation.
- `seedrandom` — seedable PRNG.

## Internals Architecture

- **Core generator**: `src/faker/core.ts`
  - Dispatch by type and keywords.
  - Uses PRNG wrapper from `src/faker/rand.ts` (seedrandom-based).
  - Helpers per domain: `strings.ts`, `numbers.ts`, `arrays.ts`, `objects.ts`, `formats.ts`.
  - Composition engine: `composition.ts` handles `allOf`/`anyOf`/`oneOf`/`not` selection/merging.
  - Logic integration: `logic.ts` — evaluate JSON-Logic via validator; solving deferred until after M8.
  - Deferred: no error fixers in MVP; consider a `fixers.ts` post-M8 if needed.

- **Validator integration**: use `validateSchema(value, schema, options, path?, jsonLogicContext?)` from `src/validation/schema.ts` as oracle on each attempt.

- **Error taxonomy**:
  - `UnsupportedGenerationError` — cases we explicitly do not support (e.g., composite regex intersection under `allOf`).
  - `UnsatisfiableSchemaError` — contradictory constraints after intersection (e.g., `minLength > maxLength`).
  - `MaxAttemptsExceededError` — attempts exhausted; include last error set and summary of fixers run.

## Attempt+Retry Algorithm

1. **Init**: normalize `GenerateOptions`; seed PRNG; set `maxAttempts`.
2. **Attempt loop (≤ maxAttempts)**:
   - 2.1 Build `jsonLogicContext` if schema contains `x-jsf-logic` (mirroring `getJsonLogicContextFromSchema`).
   - 2.2 Generate candidate value using a priori rules:
     - Strings: respect length; single `pattern` via `randexp` (seeded); `format` via `faker` when available; else simple synth.
     - Numbers/integers: sample in-range; enforce `exclusive*`, `multipleOf`.
     - Booleans: PRNG boolean.
     - Objects: include all `required`; include optionals with probability; no `additionalProperties`.
     - Arrays: choose length in `[minItems,maxItems]`; satisfy `uniqueItems` using set-building; handle `prefixItems` and `items`.
     - Enums/const: sample from set; const is exact.
     - Composition:
       - `allOf`: intersect constraints; if multiple `pattern`s → throw `UnsupportedGenerationError("unsupported composite pattern")`.
       - `anyOf`: pick a branch (prefer disjoint by `type`).
       - `oneOf`: pick a branch that appears disjoint; if ambiguous, error.
       - `not`: handle simple complements (`const`, `enum`, simple `type`); otherwise unsupported.
   - 2.3 Validate with `validateSchema`.
   - 2.4 If valid → return.
   - 2.5 Else, re-generate the minimal failing subtree(s). For `anyOf`/`oneOf`, try an alternate branch. No guided solving for `json-logic` or complex `not` during MVP; re-generate impacted fields or the whole object and re-validate.
3. **Fail** with `MaxAttemptsExceededError` including last errors.

### Guided Retries (deferred until after M8)

Deferred from MVP. If baseline re-generation proves insufficient, we will add targeted, error-driven interventions:

- `anyOf`/`oneOf`: branch switching with subtree re-generation.
- `not`: simple complements (e.g., avoid `const`/`enum`/simple `type`).
- Arrays: `uniqueItems` duplicate salvage and `contains` min/max adjustments.
- `json-logic`: var-scan and simple-op solver for referenced fields; else re-generate only those fields.

## x-jsf-logic Support (MVP)

- **Validations**: Always evaluated by the validator as part of `validateSchema` and `validateJsonLogicRules`.
- **Guidance**: Scan rules for `{"var": "field"}` to identify fields to adjust/re-roll when `json-logic` fails.
- **Computed attrs**: Defer initial application during generation. If later needed (constraints depend on computed attrs), we’ll apply a schema pass using `applyComputedAttrsToSchema` between attempts.

## Formats Generation (via Faker)

- Map formats to faker:
  - `email` → `faker.internet.email()`
  - `uuid` → `faker.string.uuid()`
  - `hostname` → `faker.internet.domainName()` (then split/use single label if needed)
  - `ipv4`/`ipv6` → `faker.internet.ip()` with version control
  - `uri`/`iri`/`uri-reference`/`iri-reference` → synthesize with `new URL(...)` and faker path/host; fallbacks for references
  - `date-time`, `date`, `time`, `duration` → `faker.date` + formatters to match regex in `format.ts`
  - Others: minimal deterministic helpers if faker lacks direct support, ensuring compliance with `format.ts` patterns.

## Testing Strategy (deterministic)

- **Location**: `test/faker/`
- **Harness**: Jest (existing setup). Use this project’s validator.
- **Seeding**: Each test uses a fixed seed. No fuzzing.

### Micro-schemas (keyword-focused unit tests)

- Strings: `minLength`, `maxLength`, `pattern` (single), formats each.
- Numbers: each bound/combo with `multipleOf`.
- Arrays: boundaries, `uniqueItems`, `contains` with `min/maxContains`, `prefixItems` + `items`.
- Objects: `required`, absence of extras when `additionalProperties: false`, `patternProperties` interaction.
- Enums/const.
- Composition: `allOf` (no composite regex), `anyOf`, `oneOf` (disjoint), `not` (simple complements).
- JSON-Logic: simple relational rules over referenced fields.

Example test files:

- `test/faker/string.min-max-length.test.ts`
- `test/faker/string.pattern.single.test.ts`
- `test/faker/format.email-uuid-uri.test.ts`
- `test/faker/number.bounds-multipleOf.test.ts`
- `test/faker/array.length-unique-contains.test.ts`
- `test/faker/object.required-additionalProperties.test.ts`
- `test/faker/enum-const.test.ts`
- `test/faker/composition.allOf-anyOf-oneOf-not.test.ts`
- `test/faker/json-logic.simple-ops.test.ts`

### Integration schemas

- Combine multiple keywords and conditionals; assert single generated instance validates.

## Milestones & Deliverables

> **Status Legend:**  
> ✅ = Complete and tested  
> 🚧 = In progress  
> ⏸️ = Deferred/Optional  
> ⬜ = Not started

- ✅ **M0: Scaffolding**
  - Add dependencies: `@faker-js/faker`, `randexp`, `seedrandom`.
  - Files: `src/faker/` directory with skeleton; export in package main.

- ✅ **M1: Core + Strings**
  - PRNG wrapper; options parsing; base generator.
  - Implement strings (`min/maxLength`, single `pattern`, basic formats via faker).
  - Tests: string micro-schemas + basic integration.

- ✅ **M2: Numbers**
  - Implement numeric bounds and `multipleOf`.
  - Tests: numeric micro-schemas, combos with strings.

- ✅ **M3: Arrays**
  - Implement length, `uniqueItems`, `contains` family, `prefixItems`/`items`.
  - Tests accordingly.

- ✅ **M4: Objects**
  - Implement required/optional generation, `additionalProperties: false`, recurse properties.
  - Tests accordingly.

- ✅ **M5: Enums/Const**
  - Always select from `enum`/`const`/`value`.
  - Tests accordingly.

- ✅ **M6: Composition**
  - `allOf` intersection (no composite regex), `anyOf` selection, `oneOf` disjoint selection, `not` simple complements.
  - Tests accordingly.

- ✅ **M7: x-jsf-logic (validations)**
  - x-jsf-logic is a custom extension that adds JSON Logic rules for cross-field validation and computed attributes.
  - Strategy: No active generation logic needed. The validator (`validateJsonLogicRules`) checks `x-jsf-logic-validations`.
  - If validation fails, the retry loop regenerates. This "trust the validator" approach is sufficient for MVP.
  - Known limitation: Cross-field equality constraints (e.g., password === confirmPassword) are nearly impossible to satisfy via random retry.
  - Tests: simple relational rules over fields should pass when generation aligns with constraints.
  - Note: `x-jsf-logic-computedAttrs` are applied during validation/mutation, not during generation.

- ✅ **M8: Formats round-out**
  - Fill remaining formats from `format.ts` with faker or helpers, ensure compliance with patterns.
  - All 20+ formats implemented and tested.

- ⏸️ **M9: Optional: file inputs**
  - Generate `FileLike[]` honoring `maxFileSize`, `accept`.
  - Tests based on `src/validation/file.ts`.
  - Status: Deferred - not required for MVP.

- ✅ **M10: Docs & polish**
  - README section + examples.
  - Error messages and unsupported cases documentation.
  - Test harness CLI tool (`scripts/generate-fake-data.mjs`).

- ✅ **M11: Guided retries and targeted fixes**
  - Implemented hybrid retry strategy: random generation + guided error correction
  - Targeted fixes for: `required`, `forbidden`, `type`, `const`, `enum`, `oneOf`, `minimum`/`maximum`, `uniqueItems`
  - Path extraction to handle nested properties and composition keywords
  - Progress tracking with fix budget reset on improvement
  - Tests: 23 tests covering all fix types
  - Status: **COMPLETE** - Achieves 100% success rate on 530 real-world schemas

- ✅ **M12: Conditionals (if/then/else)**
  - Implement `if/then/else` conditional schema application.
  - Evaluate `if` condition, apply `then` or `else` branch accordingly.
  - Merge conditional branch with base schema.
  - Tests for various conditional scenarios.
  - Status: **COMPLETE** - Full support for conditionals, including within `allOf`.
  - Works with real-world schemas like Albania onboarding without workarounds.

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
```

## Limitations and Notes

- **Unsupported composite regex in `allOf`** → `UnsupportedGenerationError`.
- **Ambiguous `oneOf`** (multiple branches likely valid) → error to avoid accidental multiple-matches.
- **Unsatisfiable constraints** → `UnsatisfiableSchemaError`.
- **No `$ref`** in MVP (absent in this repo’s validator).

## Future Work

- CLI for local JSON generation.
- Plugin hooks for custom providers; `mode: 'faker' | 'ai'` with async support and API keys.
- Enhanced JSON-Logic solver coverage; computedAttrs application during generation.
- Performance: memoization/caching, branch heuristics, diagnostics.
