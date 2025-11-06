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
})
