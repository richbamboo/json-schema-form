# Faker Tests

Test structure for JSON Schema Faker implementation.

## Organization

- **setup.test.ts** - Basic smoke tests for module exports
- **rand.test.ts** - SeededRandom PRNG tests
- **errors.test.ts** - Error class tests
- **string.*.test.ts** - String generation tests (M1)
- **number.*.test.ts** - Number generation tests (M2)
- **array.*.test.ts** - Array generation tests (M3)
- **object.*.test.ts** - Object generation tests (M4)
- **enum-const.test.ts** - Enum/const tests (M5)
- **composition.*.test.ts** - Composition tests (M6)
- **json-logic.*.test.ts** - JSON-Logic tests (M7)
- **format.*.test.ts** - Format tests (M1, M8)

## Test Strategy

- **Deterministic**: All tests use fixed seeds
- **Micro-schemas**: Keyword-focused unit tests
- **Integration**: Multi-keyword combination tests
- **Validation**: Use project's validator to confirm generated values pass

## Running Tests

```bash
# Fast tests only (default, ~2s)
pnpm test

# Slow tests only (all schemas, ~10-30s)
pnpm test:slow

# All tests (fast + slow)
pnpm test:all

# Watch mode
pnpm test:watch

# Specific test file
pnpm test test/faker/rand.test.ts
```

**Note**: Slow tests (`*.slow.test.ts`) validate all real-world schemas in `test/faker/schemas/`. They're excluded from default runs but useful before releases.
