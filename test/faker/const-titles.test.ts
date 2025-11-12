import { describe, expect, it } from '@jest/globals'
import { generateFromSchema } from '../../src/faker'

describe('const title replacement', () => {
  it('should use const value by default', () => {
    const schema = {
      type: 'object',
      properties: {
        status: {
          oneOf: [
            { const: 'active', title: 'Active User' },
            { const: 'inactive', title: 'Inactive User' },
          ],
        },
      },
      required: ['status'],
    } as const

    const result = generateFromSchema(schema, { seed: 42 }) as any

    expect(result).toHaveProperty('status')
    expect(['active', 'inactive']).toContain(result.status)
    expect(['Active User', 'Inactive User']).not.toContain(result.status)
  })

  it('should replace const with title when useConstTitles is true', () => {
    const schema = {
      type: 'object',
      properties: {
        status: {
          oneOf: [
            { const: 'active', title: 'Active User' },
            { const: 'inactive', title: 'Inactive User' },
          ],
        },
      },
      required: ['status'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 42,
      useConstTitles: true,
    }) as any

    expect(result).toHaveProperty('status')
    expect(['Active User', 'Inactive User']).toContain(result.status)
    expect(['active', 'inactive']).not.toContain(result.status)
  })

  it('should handle anyOf with const+title', () => {
    const schema = {
      type: 'object',
      properties: {
        role: {
          anyOf: [
            { const: 'admin', title: 'Administrator' },
            { const: 'user', title: 'Regular User' },
          ],
        },
      },
      required: ['role'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 123,
      useConstTitles: true,
    }) as any

    expect(result).toHaveProperty('role')
    expect(['Administrator', 'Regular User']).toContain(result.role)
  })

  it('should handle nested objects with const+title', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            status: {
              oneOf: [
                { const: 'active', title: 'Active' },
                { const: 'pending', title: 'Pending' },
              ],
            },
          },
          required: ['status'],
        },
      },
      required: ['user'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 42,
      useConstTitles: true,
    }) as any

    expect(result.user).toHaveProperty('status')
    expect(['Active', 'Pending']).toContain(result.user.status)
  })

  it('should handle arrays with const+title', () => {
    const schema = {
      type: 'object',
      properties: {
        statuses: {
          type: 'array',
          items: {
            oneOf: [
              { const: 'new', title: 'New Item' },
              { const: 'old', title: 'Old Item' },
            ],
          },
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ['statuses'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 42,
      useConstTitles: true,
    }) as any

    expect(result.statuses).toHaveLength(2)
    result.statuses.forEach((status: string) => {
      expect(['New Item', 'Old Item']).toContain(status)
    })
  })

  it('should avoid collisions with same const values in different fields', () => {
    const schema = {
      type: 'object',
      properties: {
        userStatus: {
          oneOf: [
            { const: 'active', title: 'Active User' },
            { const: 'inactive', title: 'Inactive User' },
          ],
        },
        projectStatus: {
          oneOf: [
            { const: 'active', title: 'Active Project' },
            { const: 'inactive', title: 'Inactive Project' },
          ],
        },
      },
      required: ['userStatus', 'projectStatus'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 42,
      useConstTitles: true,
    }) as any

    expect(result).toHaveProperty('userStatus')
    expect(result).toHaveProperty('projectStatus')
    
    // userStatus should have "User" in the title
    expect(['Active User', 'Inactive User']).toContain(result.userStatus)
    
    // projectStatus should have "Project" in the title
    expect(['Active Project', 'Inactive Project']).toContain(result.projectStatus)
  })

  it('should not replace values without const+title pair', () => {
    const schema = {
      type: 'object',
      properties: {
        status: {
          oneOf: [
            { const: 'active' }, // No title
            { const: 'inactive', title: 'Inactive' },
          ],
        },
      },
      required: ['status'],
    } as const

    const result = generateFromSchema(schema, { 
      seed: 42,
      useConstTitles: true,
    }) as any

    expect(result).toHaveProperty('status')
    // Should be either the const value 'active' or title 'Inactive'
    expect(['active', 'Inactive']).toContain(result.status)
  })

  describe('function-based useConstTitles', () => {
    it('should use function predicate to selectively apply titles', () => {
      const schema = {
        type: 'object',
        properties: {
          selectField: {
            oneOf: [
              { const: 'option1', title: 'Option One' },
              { const: 'option2', title: 'Option Two' },
            ],
            'x-jsf-presentation': { inputType: 'select' },
          },
          radioField: {
            oneOf: [
              { const: 'radio1', title: 'Radio One' },
              { const: 'radio2', title: 'Radio Two' },
            ],
            'x-jsf-presentation': { inputType: 'radio' },
          },
        },
        required: ['selectField', 'radioField'],
      } as const

      const result = generateFromSchema(schema, { 
        seed: 42,
        useConstTitles: (path, schema) => {
          const presentation = schema['x-jsf-presentation'] as any
          return presentation?.inputType === 'select'
        },
      }) as any

      expect(result).toHaveProperty('selectField')
      expect(result).toHaveProperty('radioField')
      
      // Select field should use title
      expect(['Option One', 'Option Two']).toContain(result.selectField)
      
      // Radio field should use const
      expect(['radio1', 'radio2']).toContain(result.radioField)
    })

    it('should use function predicate based on path', () => {
      const schema = {
        type: 'object',
        properties: {
          display: {
            type: 'object',
            properties: {
              status: {
                oneOf: [
                  { const: 'active', title: 'Active Display' },
                  { const: 'inactive', title: 'Inactive Display' },
                ],
              },
            },
            required: ['status'],
          },
          internal: {
            type: 'object',
            properties: {
              status: {
                oneOf: [
                  { const: 'active', title: 'Active Internal' },
                  { const: 'inactive', title: 'Inactive Internal' },
                ],
              },
            },
            required: ['status'],
          },
        },
        required: ['display', 'internal'],
      } as const

      const result = generateFromSchema(schema, { 
        seed: 42,
        useConstTitles: (path) => path.startsWith('display.'),
      }) as any

      expect(result.display).toHaveProperty('status')
      expect(result.internal).toHaveProperty('status')
      
      // Display path should use title
      expect(['Active Display', 'Inactive Display']).toContain(result.display.status)
      
      // Internal path should use const
      expect(['active', 'inactive']).toContain(result.internal.status)
    })

    it('should handle complex predicate logic', () => {
      const schema = {
        type: 'object',
        properties: {
          category: {
            oneOf: [
              { const: 'cat1', title: 'Category 1' },
              { const: 'cat2', title: 'Category 2' },
            ],
            'x-jsf-presentation': { inputType: 'select', displayMode: 'dropdown' },
          },
          type: {
            oneOf: [
              { const: 'type1', title: 'Type 1' },
              { const: 'type2', title: 'Type 2' },
            ],
            'x-jsf-presentation': { inputType: 'select', displayMode: 'buttons' },
          },
        },
        required: ['category', 'type'],
      } as const

      const result = generateFromSchema(schema, { 
        seed: 42,
        useConstTitles: (path, schema) => {
          const presentation = schema['x-jsf-presentation'] as any
          return presentation?.inputType === 'select' && 
                 presentation?.displayMode === 'dropdown'
        },
      }) as any

      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('type')
      
      // Category should use title (dropdown)
      expect(['Category 1', 'Category 2']).toContain(result.category)
      
      // Type should use const (buttons, not dropdown)
      expect(['type1', 'type2']).toContain(result.type)
    })
  })

  describe('enum with oneOf/anyOf', () => {
    it('should handle enum + oneOf with useConstTitles', () => {
      // Test for schemas that have both enum and oneOf with const+title pairs
      // This was previously broken - enum was checked before oneOf, bypassing const→title mappings
      const schema = {
        type: 'object',
        properties: {
          work_schedule_type: {
            enum: ['flexible', 'core_business_hours', 'fixed_hours'],
            oneOf: [
              { const: 'flexible', title: "Employee's hours are flexible" },
              { const: 'core_business_hours', title: "Employee to work client's core business hours" },
              { const: 'fixed_hours', title: 'Employee to work fixed hours' },
            ],
            'x-jsf-presentation': {
              inputType: 'select' as const,
            },
          },
        },
        required: ['work_schedule_type'],
      }

      const result = generateFromSchema(schema, {
        seed: 1762981347542,
        includeOptionalProbability: 0.8,
        useDefaults: true,
        useConstTitles: (fieldPath: string, fieldSchema: any) => {
          return fieldSchema['x-jsf-presentation']?.inputType === 'select'
        },
      }) as any

      expect(result).toHaveProperty('work_schedule_type')
      
      // Should use title, not const value
      expect([
        "Employee's hours are flexible",
        "Employee to work client's core business hours",
        'Employee to work fixed hours',
      ]).toContain(result.work_schedule_type)
    })

    it('should handle oneOf alone (without enum) for comparison', () => {
      // This test confirms that oneOf alone always worked correctly
      const schema = {
        type: 'object',
        properties: {
          work_schedule_type: {
            oneOf: [
              { const: 'flexible', title: "Employee's hours are flexible" },
              { const: 'core_business_hours', title: "Employee to work client's core business hours" },
              { const: 'fixed_hours', title: 'Employee to work fixed hours' },
            ],
            'x-jsf-presentation': {
              inputType: 'select' as const,
            },
          },
        },
        required: ['work_schedule_type'],
      }

      const result = generateFromSchema(schema, {
        seed: 42,
        useConstTitles: (fieldPath: string, fieldSchema: any) => {
          return fieldSchema['x-jsf-presentation']?.inputType === 'select'
        },
      }) as any

      expect(result).toHaveProperty('work_schedule_type')
      expect([
        "Employee's hours are flexible",
        "Employee to work client's core business hours",
        'Employee to work fixed hours',
      ]).toContain(result.work_schedule_type)
    })
  })
})
