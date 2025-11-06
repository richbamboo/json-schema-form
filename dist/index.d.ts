import { RulesLogic } from 'json-logic-js';
import { JSONSchema } from 'json-schema-typed/draft-2020-12';

/**
 * Defines the type of a `Field` in the form.
 */
type JsfSchemaType = Exclude<JSONSchema, boolean>['type'];
/**
 * Defines the type of a value in the form that will be validated against the schema.
 */
type SchemaValue = string | number | ObjectValue | null | undefined | Array<SchemaValue> | boolean;
/**
 * A nested object value.
 */
interface ObjectValue {
    [key: string]: SchemaValue;
}
type JsfPresentation = {
    inputType?: FieldType;
    description?: string;
    accept?: string;
    maxFileSize?: number;
    minDate?: string;
    maxDate?: string;
} & {
    [key: string]: unknown;
};
interface JsonLogicRules {
    validations?: Record<string, {
        errorMessage?: string;
        rule: RulesLogic;
    }>;
    computedValues?: Record<string, {
        rule: RulesLogic;
    }>;
}
interface JsonLogicRootSchema extends Pick<NonBooleanJsfSchema, 'if' | 'then' | 'else' | 'allOf' | 'anyOf' | 'oneOf' | 'not'> {
}
interface JsonLogicSchema extends JsonLogicRules, JsonLogicRootSchema {
}
/**
 * JSON Schema Form extending JSON Schema with additional JSON Schema Form properties.
 */
type JsfSchema = JSONSchema & {
    'properties'?: Record<string, JsfSchema>;
    'items'?: JsfSchema;
    'enum'?: unknown[];
    'anyOf'?: JsfSchema[];
    'allOf'?: JsfSchema[];
    'oneOf'?: JsfSchema[];
    'not'?: JsfSchema;
    'if'?: JsfSchema;
    'then'?: JsfSchema;
    'else'?: JsfSchema;
    'value'?: SchemaValue;
    'required'?: string[];
    /** Defines the order of the fields in the form. */
    'x-jsf-order'?: string[];
    /** Defines the presentation of the field in the form.  */
    'x-jsf-presentation'?: JsfPresentation;
    /** Defines the error message of the field in the form. */
    'x-jsf-errorMessage'?: Record<string, string>;
    /** Defines all JSON Logic rules for the schema (both validations and computed values). */
    'x-jsf-logic'?: JsonLogicSchema;
    /** Extra validations to run. References validations declared in the `x-jsf-logic` root property. */
    'x-jsf-logic-validations'?: string[];
    /** Extra attributes to add to the schema. References computedValues in the `x-jsf-logic` root property. */
    'x-jsf-logic-computedAttrs'?: Record<string, string | object>;
};
/**
 * JSON Schema Form type without booleans.
 * This type is used for convenience in places where a boolean is not allowed.
 * @see `JsfSchema` for the full schema type which allows booleans and is used for sub schemas.
 */
type NonBooleanJsfSchema = Exclude<JsfSchema, boolean>;
/**
 * JSON Schema Form type specifically for object schemas.
 * This type ensures the schema has type 'object'.
 */
type JsfObjectSchema = NonBooleanJsfSchema & {
    type: 'object';
};

/**
 * WIP type for UI field output that allows for all `x-jsf-presentation` properties to be splatted
 * TODO/QUESTION: what are the required fields for a field? what are the things we want to deprecate, if any?
 */
interface Field {
    name: string;
    label?: string;
    description?: string;
    fields?: Field[];
    type: FieldType;
    inputType: FieldType;
    required: boolean;
    jsonType: JsfSchemaType;
    isVisible: boolean;
    accept?: string;
    errorMessage?: Record<string, string>;
    computedAttributes?: Record<string, unknown>;
    minDate?: string;
    maxDate?: string;
    maxLength?: number;
    maxFileSize?: number;
    format?: string;
    anyOf?: unknown[];
    options?: unknown[];
    const?: unknown;
    checkboxValue?: unknown;
    default?: unknown;
    [key: string]: unknown;
}
type FieldType = 'text' | 'number' | 'select' | 'file' | 'radio' | 'group-array' | 'email' | 'date' | 'checkbox' | 'fieldset' | 'money' | 'country' | 'textarea' | 'hidden';

interface LegacyOptions {
    /**
     * A null value will be treated as undefined.
     * When true, providing a value to a schema that is `false`,
     * the validation will succeed instead of returning a type error.
     * This was a bug in v0, we fixed it in v1. If you need the same wrong behavior, set this to true.
     * @default false
     * @example
     * ```ts
     * Schema: { "properties": { "name": { "type": "string" } } }
     * Value: { "name": null } // Validation succeeds, even though the type is not 'null'
     * ```
     */
    treatNullAsUndefined?: boolean;
    /**
     * A value against a schema "false" will be allowed.
     * When true, providing a value to a non-required field that is not of type 'null' or ['null']
     * the validation will succeed instead of returning a type error.
     * This was a bug in v0, we fixed it in v1. If you need the same wrong behavior, set this to true.
     * @default false
     * @example
     * ```ts
     * Schema: { "properties": { "age": false } }
     * Value: { age: 10 } // Validation succeeds, even though the value is forbidden;
     * ```
     */
    allowForbiddenValues?: boolean;
}

interface FormResult {
    fields: Field[];
    isError: boolean;
    error: string | null;
    handleValidation: (value: SchemaValue) => ValidationResult;
}
/**
 * Recursive type for form error messages
 * - String for leaf error messages
 * - Nested object for nested fields
 * - Arrays for group-array fields
 */
interface FormErrors {
    [key: string]: string | FormErrors | Array<null | FormErrors>;
}
interface ValidationResult {
    formErrors?: FormErrors;
}
interface CreateHeadlessFormOptions {
    /**
     * The initial values to use for the form
     */
    initialValues?: SchemaValue;
    /**
     * Backward compatibility config with v0
     */
    legacyOptions?: LegacyOptions;
    /**
     * When enabled, ['x-jsf-presentation'].inputType is required for all properties.
     * @default false
     */
    strictInputType?: boolean;
    /**
     * Custom user defined functions. A dictionary of name and function
     */
    customJsonLogicOps?: Record<string, (...args: any[]) => any>;
}
declare function createHeadlessForm(schema: JsfObjectSchema, options?: CreateHeadlessFormOptions): FormResult;

type FieldOutput = Partial<JsfSchema>;
type FieldModification = Partial<JsfSchema> & {
    /**
     * @deprecated Use `x-jsf-presentation` instead
     */
    presentation?: JsfSchema['x-jsf-presentation'];
    /**
     * @deprecated Use `x-jsf-errorMessage` instead
     */
    errorMessage?: JsfSchema['x-jsf-errorMessage'];
};
interface ModifyConfig {
    fields?: Record<string, FieldModification | ((attrs: JsfSchema) => FieldOutput)>;
    allFields?: (name: string, attrs: JsfSchema) => FieldModification;
    create?: Record<string, FieldModification>;
    pick?: string[];
    orderRoot?: string[] | ((originalOrder: string[]) => string[]);
    muteLogging?: boolean;
}
type WarningType = 'FIELD_TO_CHANGE_NOT_FOUND' | 'ORDER_MISSING_FIELDS' | 'FIELD_TO_CREATE_EXISTS' | 'PICK_MISSED_FIELD';
interface Warning {
    type: WarningType;
    message: string;
    meta?: Record<string, any>;
}
/**
 * Modifies the schema
 * Use modify() when you need to customize the generated fields. This function creates a new version of JSON schema based on a provided configuration. Then you pass the new schema to createHeadlessForm()
 *
 * @example
 * const modifiedSchema = modify(schema, {
 *   fields: {
 *     name: { type: 'string', title: 'Name' },
 *   },
 * })
 * @param {JsfSchema} originalSchema - The original schema
 * @param {ModifyConfig} config - The config
 * @returns {ModifyResult} The new schema and the warnings that occurred during the modifications
 */
declare function modifySchema(originalSchema: JsfSchema, config: ModifyConfig): {
    schema: JsfSchema;
    warnings: (Warning | null)[];
};

/**
 * Options for generating fake data from a JSON Schema.
 */
interface GenerateOptions {
    /** Seed for deterministic generation. If omitted, generation is non-deterministic. */
    seed?: string | number;
    /** Number of instances to generate. Default: 1. When >1, returns an array. */
    count?: number;
    /** Probability of including optional properties (0-1). Default: 0.3. */
    includeOptionalProbability?: number;
    /** Maximum number of fresh random generations. Default: 100. */
    maxGenerations?: number;
    /** Maximum fixes per generation (resets on progress). Default: 5. */
    maxFixesPerGeneration?: number;
    /** Absolute maximum attempts (generations + fixes). Default: 1000. */
    maxAttempts?: number;
    /** Use `default` values from schema when present. Default: false. */
    useDefaults?: boolean;
    /** Use `examples` values from schema when present. Default: false. */
    useExamples?: boolean;
    /** Generation mode. Default: 'random'. Other modes deferred. */
    mode?: 'random' | 'faker' | 'ai';
    /**
     * Replace 'const' values with their 'title' in the final output.
     * Only applies to oneOf/anyOf options with both const and title.
     * Generated value validates before substitution occurs.
     * Default: false.
     */
    useConstTitles?: boolean;
}
/**
 * Result of generation including metadata about the process.
 */
interface GenerationResult {
    /** The generated value */
    value: SchemaValue;
    /** Number of attempts required to generate valid data */
    attempts: number;
}
/**
 * Generate fake data that validates against the provided JSON Schema.
 *
 * @param schema - The JSON Schema to generate data for
 * @param options - Generation options
 * @returns Generated value(s) that validate against the schema
 * @throws {UnsupportedGenerationError} When schema contains unsupported features
 * @throws {UnsatisfiableSchemaError} When schema constraints are contradictory
 * @throws {MaxAttemptsExceededError} When generation fails after maxAttempts
 *
 * @example
 * ```ts
 * const schema = { type: 'string', format: 'email' }
 * const email = generateFromSchema(schema, { seed: 42 })
 * ```
 */
declare function generateFromSchema(schema: JsfSchema, options?: GenerateOptions): SchemaValue | SchemaValue[];
/**
 * Generate fake data with metadata about the generation process.
 * Use this when you need to know how many attempts were required.
 *
 * @param schema - The JSON Schema to generate data for
 * @param options - Generation options
 * @returns Generated value(s) with metadata
 */
declare function generateFromSchemaWithMetadata(schema: JsfSchema, options?: GenerateOptions): GenerationResult | GenerationResult[];

/**
 * Base class for generation errors.
 */
declare class GenerationError extends Error {
    constructor(message: string);
}
/**
 * Thrown when a schema contains features we explicitly do not support.
 * Example: multiple patterns under allOf.
 */
declare class UnsupportedGenerationError extends GenerationError {
    schema: JsfSchema;
    constructor(message: string, schema: JsfSchema);
}
/**
 * Thrown when a schema has contradictory constraints.
 * Example: minLength > maxLength.
 */
declare class UnsatisfiableSchemaError extends GenerationError {
    schema: JsfSchema;
    constructor(message: string, schema: JsfSchema);
}
/**
 * Thrown when generation fails after maxAttempts.
 */
declare class MaxAttemptsExceededError extends GenerationError {
    attempts: number;
    lastErrors: unknown[];
    constructor(message: string, attempts: number, lastErrors: unknown[]);
}

export { type CreateHeadlessFormOptions, type Field, type FieldType, type FormErrors, type GenerateOptions, GenerationError, type GenerationResult, type LegacyOptions, MaxAttemptsExceededError, UnsatisfiableSchemaError, UnsupportedGenerationError, type ValidationResult, createHeadlessForm, generateFromSchema, generateFromSchemaWithMetadata, modifySchema as modify };
