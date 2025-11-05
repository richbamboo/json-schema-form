# JSON Schema Faker Test Harness

A command-line tool for generating fake data from JSON Schema files.

## Usage

```bash
npm run generate-fake -- <path-to-schema.json> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--seed <number>` | Seed for deterministic generation | random |
| `--count <number>` | Number of values to generate | 1 |
| `--max-attempts <number>` | Absolute maximum attempts (generations + fixes) | 1000 |
| `--max-generations <number>` | Maximum fresh random generations | 100 |
| `--max-fixes-per-generation <number>` | Maximum fixes per generation (resets on progress) | 5 |
| `--optional-probability <n>` | Probability (0-1) of including optional fields | 0.3 |
| `--output <file>` | Write output to file instead of stdout | - |
| `--pretty` | Pretty-print JSON output | true |
| `--no-pretty` | Compact JSON output | - |

## Examples

### Generate single value from a schema
```bash
npm run generate-fake -- test/faker/schemas/contract_details_USA.json --seed 42
```

### Generate 5 values with deterministic seed
```bash
npm run generate-fake -- schema.json --seed 42 --count 5
```

### Generate and save to file
```bash
npm run generate-fake -- schema.json --output output.json
```

### Include more optional fields
```bash
npm run generate-fake -- schema.json --optional-probability 0.8
```

### Increase retry attempts for complex schemas
```bash
npm run generate-fake -- schema.json --max-generations 200 --max-fixes-per-generation 10
```

## Output

The tool outputs:
- **JSON data** to stdout (or file if `--output` specified)
- **Progress/errors** to stderr

This allows you to pipe the JSON output while still seeing progress:
```bash
npm run generate-fake -- schema.json > data.json
```

## How It Works

The generator uses a **hybrid retry strategy**:
1. **Random generation**: Creates initial values respecting schema constraints
2. **Guided fixes**: When validation fails, applies targeted fixes:
   - `required`: Adds missing properties
   - `forbidden`: Removes disallowed properties
   - `type`: Regenerates with correct type
   - `const`: Sets exact required value
   - `enum`/`oneOf`: Picks valid option
   - `minimum`/`maximum`: Regenerates within bounds
   - `uniqueItems`: Regenerates array with unique values
3. **Progress tracking**: Resets fix budget when making progress
4. **Fallback**: Regenerates from scratch if fixes don't help

## Notes

- **Full schema support**: All JSON Schema keywords including `if/then/else` conditionals
- **Deterministic**: Same seed produces same output
- **Validated**: Generated data is validated internally during generation
- **Success rate**: 100% on 530 real-world schemas (99.8%+ typical)
