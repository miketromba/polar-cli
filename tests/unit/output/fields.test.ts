import { describe, expect, test } from 'bun:test'
import {
	getDefaultFields,
	RESOURCE_DEFAULT_FIELDS,
	selectFields
} from '../../../src/output/fields'

describe('selectFields', () => {
	const data = {
		id: 'prod_123',
		name: 'Pro Plan',
		description: 'Our best plan',
		isRecurring: true,
		isArchived: false,
		organizationId: 'org_456',
		createdAt: '2024-01-15T10:30:00.000Z',
		modifiedAt: '2024-06-20T12:00:00.000Z',
		metadata: { tier: 'pro' }
	}

	test("returns all fields when 'all' is specified", () => {
		const result = selectFields(data, 'all')
		expect(Object.keys(result)).toEqual(Object.keys(data))
	})

	test('returns only specified fields', () => {
		const result = selectFields(data, ['id', 'name', 'isRecurring'])
		expect(Object.keys(result)).toEqual(['id', 'name', 'isRecurring'])
		expect(result.id).toBe('prod_123')
		expect(result.name).toBe('Pro Plan')
		expect(result.isRecurring).toBe(true)
	})

	test("ignores fields that don't exist in the data", () => {
		const result = selectFields(data, ['id', 'nonExistentField'])
		expect(Object.keys(result)).toEqual(['id'])
	})

	test("returns minimal fields when 'minimal' is specified", () => {
		const result = selectFields(data, 'minimal')
		// minimal always includes id + primary identifier
		expect(result).toHaveProperty('id')
		expect(Object.keys(result).length).toBeLessThanOrEqual(3)
	})

	test('returns default fields for a resource type', () => {
		const defaults = getDefaultFields('product')
		expect(defaults).toContain('id')
		expect(defaults).toContain('name')
		expect(defaults.length).toBeGreaterThan(2)
		expect(defaults.length).toBeLessThan(15)
	})
})

describe('RESOURCE_DEFAULT_FIELDS', () => {
	test('has defaults for all core resources', () => {
		const requiredResources = [
			'organization',
			'product',
			'subscription',
			'order',
			'customer',
			'checkout',
			'checkoutLink',
			'benefit',
			'benefitGrant',
			'licenseKey',
			'discount',
			'customField',
			'file',
			'refund',
			'dispute',
			'payment',
			'meter',
			'customerMeter',
			'event',
			'eventType',
			'webhook',
			'member',
			'orgToken'
		]
		for (const resource of requiredResources) {
			expect(RESOURCE_DEFAULT_FIELDS).toHaveProperty(resource)
			expect(RESOURCE_DEFAULT_FIELDS[resource]!.length).toBeGreaterThan(0)
		}
	})

	test("every resource default includes 'id'", () => {
		for (const [resource, fields] of Object.entries(
			RESOURCE_DEFAULT_FIELDS
		)) {
			expect(fields, `${resource} should include 'id'`).toContain('id')
		}
	})
})
