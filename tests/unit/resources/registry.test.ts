import { describe, expect, test } from 'bun:test'
import { getResource, RESOURCES } from '../../../src/resources/registry'

describe('RESOURCES registry', () => {
	test('has at least 40 resource definitions', () => {
		// 30 main + portal sub-resources
		expect(RESOURCES.length).toBeGreaterThanOrEqual(40)
	})

	test('every resource has required fields', () => {
		for (const r of RESOURCES) {
			expect(r.name, `${r.cliName} missing name`).toBeTruthy()
			expect(r.plural, `${r.cliName} missing plural`).toBeTruthy()
			expect(r.cliName, `${r.cliName} missing cliName`).toBeTruthy()
			expect(
				r.sdkNamespace,
				`${r.cliName} missing sdkNamespace`
			).toBeTruthy()
			expect(
				r.description,
				`${r.cliName} missing description`
			).toBeTruthy()
			expect(
				r.defaultFields.length,
				`${r.cliName} has no defaultFields`
			).toBeGreaterThan(0)
			expect(
				r.operations.length,
				`${r.cliName} has no operations`
			).toBeGreaterThan(0)
		}
	})

	test("every resource has 'id' in defaultFields", () => {
		for (const r of RESOURCES) {
			expect(
				r.defaultFields,
				`${r.cliName} missing 'id' in defaults`
			).toContain('id')
		}
	})

	test('every operation has required fields', () => {
		for (const r of RESOURCES) {
			for (const op of r.operations) {
				expect(op.type, `${r.cliName} op missing type`).toBeTruthy()
				expect(
					op.sdkMethod,
					`${r.cliName} op missing sdkMethod`
				).toBeTruthy()
				expect(
					op.description,
					`${r.cliName}.${op.sdkMethod} missing description`
				).toBeTruthy()
			}
		}
	})

	test('all list operations have paginatable=true', () => {
		for (const r of RESOURCES) {
			for (const op of r.operations) {
				if (op.type === 'list') {
					expect(
						op.paginatable,
						`${r.cliName}.list should be paginatable`
					).toBe(true)
				}
			}
		}
	})

	test('all delete operations have confirmRequired=true', () => {
		for (const r of RESOURCES) {
			for (const op of r.operations) {
				if (op.type === 'delete') {
					expect(
						op.confirmRequired,
						`${r.cliName}.delete should require confirmation`
					).toBe(true)
				}
			}
		}
	})

	test('all flag definitions have required fields', () => {
		for (const r of RESOURCES) {
			for (const op of r.operations) {
				if (op.flags) {
					for (const flag of op.flags) {
						expect(
							flag.name,
							`${r.cliName}.${op.sdkMethod} flag missing name`
						).toBeTruthy()
						expect(
							flag.sdkField,
							`${r.cliName}.${op.sdkMethod} flag missing sdkField`
						).toBeTruthy()
						expect(
							flag.description,
							`${r.cliName}.${op.sdkMethod}.${flag.name} missing description`
						).toBeTruthy()
						expect([
							'string',
							'boolean',
							'number',
							'string[]',
							'json',
							'date',
							'rfcdate'
						]).toContain(flag.type)
					}
				}
			}
		}
	})

	// Check ALL expected top-level resources exist
	const expectedResources = [
		'orgs',
		'products',
		'subscriptions',
		'orders',
		'customers',
		'checkouts',
		'checkout-links',
		'benefits',
		'benefit-grants',
		'license-keys',
		'discounts',
		'custom-fields',
		'files',
		'refunds',
		'disputes',
		'payments',
		'meters',
		'customer-meters',
		'events',
		'event-types',
		'metrics',
		'members',
		'customer-seats',
		'customer-sessions',
		'member-sessions',
		'webhooks',
		'oauth2',
		'org-tokens'
	]

	for (const name of expectedResources) {
		test(`has resource: ${name}`, () => {
			const resource = getResource(name)
			expect(resource, `Missing resource: ${name}`).toBeDefined()
		})
	}

	// Check expected portal resources exist
	const expectedPortalResources = [
		'portal-benefit-grants',
		'portal-customer',
		'portal-subscriptions',
		'portal-orders',
		'portal-license-keys',
		'portal-downloadables',
		'portal-members',
		'portal-seats',
		'portal-meters',
		'portal-session',
		'portal-org',
		'portal-wallets'
	]

	for (const name of expectedPortalResources) {
		test(`has portal resource: ${name}`, () => {
			const resource = getResource(name)
			expect(resource, `Missing portal resource: ${name}`).toBeDefined()
		})
	}
})

describe('getResource', () => {
	test('returns resource by cliName', () => {
		const product = getResource('products')
		expect(product).toBeDefined()
		expect(product?.name).toBe('product')
	})

	test('returns undefined for unknown resource', () => {
		expect(getResource('nonexistent')).toBeUndefined()
	})
})

describe('operation counts (feature parity)', () => {
	// Verify total operation count matches expected 170
	test('total operations across all resources is at least 170', () => {
		let total = 0
		for (const r of RESOURCES) {
			total += r.operations.length
		}
		expect(total).toBeGreaterThanOrEqual(170)
	})

	// Spot-check specific resources have the right number of operations
	test('products has 5 operations (list, get, create, update, updateBenefits)', () => {
		const r = getResource('products')
		expect(r?.operations.length).toBe(5)
	})

	test('customers has 11 operations', () => {
		const r = getResource('customers')
		expect(r?.operations.length).toBe(11)
	})

	test('subscriptions has 6 operations', () => {
		const r = getResource('subscriptions')
		expect(r?.operations.length).toBe(6)
	})

	test('webhooks has 8 operations', () => {
		const r = getResource('webhooks')
		expect(r?.operations.length).toBe(8)
	})

	test('checkouts has 7 operations', () => {
		const r = getResource('checkouts')
		expect(r?.operations.length).toBe(7)
	})

	test('license-keys has 7 operations', () => {
		const r = getResource('license-keys')
		expect(r?.operations.length).toBe(7)
	})

	test('orders has 6 operations', () => {
		const r = getResource('orders')
		expect(r?.operations.length).toBe(6)
	})
})
