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
| `--max-attempts <number>` | Max retry attempts per value | 30 |
| `--optional-probability <n>` | Probability (0-1) of including optional fields | 0.3 |
| `--output <file>` | Write output to file instead of stdout | - |
| `--pretty` | Pretty-print JSON output | true |
| `--no-pretty` | Compact JSON output | - |
| `--remove-if-then-else` | Remove if/then/else (M12 not supported yet) | false |

## Examples

### Generate single value from Albania schema
```bash
npm run generate-fake -- test/faker/schemas/onboarding-albania.json --seed 42 --remove-if-then-else
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

## Output

The tool outputs:
- **JSON data** to stdout (or file if `--output` specified)
- **Progress/errors** to stderr

This allows you to pipe the JSON output while still seeing progress:
```bash
npm run generate-fake -- schema.json > data.json
```

## Notes

- **if/then/else conditionals** (M12) are not yet supported. Use `--remove-if-then-else` to strip them.
- Generated data is validated internally during generation via retry loop
- Use `--seed` for reproducible test data
- Increase `--max-attempts` for complex schemas with many constraints
