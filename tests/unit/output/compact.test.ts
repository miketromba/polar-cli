import { describe, expect, test } from 'bun:test'
import {
	formatCompactCount,
	formatCompactItem,
	formatCompactList
} from '../../../src/output/compact'

// ─── Single Entity Formatting ────────────────────────────────────────

describe('formatCompactItem', () => {
	test('formats a single entity with type prefix', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			name: 'Pro Plan',
			isRecurring: true
		})
		expect(result).toBe(
			'product id=prod_123 name="Pro Plan" isRecurring=true'
		)
	})

	test('omits null and undefined fields', () => {
		const result = formatCompactItem('customer', {
			id: 'cust_123',
			email: 'alice@example.com',
			name: null,
			deletedAt: undefined
		})
		expect(result).toBe('customer id=cust_123 email=alice@example.com')
		expect(result).not.toContain('name=')
		expect(result).not.toContain('deletedAt=')
	})

	test('omits empty strings', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			name: 'Test',
			description: ''
		})
		expect(result).toBe('product id=prod_123 name=Test')
	})

	test('quotes strings with spaces', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			name: 'Pro Plan'
		})
		expect(result).toContain('name="Pro Plan"')
	})

	test('does not quote strings without spaces', () => {
		const result = formatCompactItem('customer', {
			id: 'cust_123',
			email: 'alice@example.com'
		})
		expect(result).toContain('email=alice@example.com')
		expect(result).not.toContain('"alice@example.com"')
	})

	test('compresses ISO timestamps to date-only', () => {
		const result = formatCompactItem('order', {
			id: 'ord_123',
			createdAt: '2024-01-15T10:30:00.000Z'
		})
		expect(result).toContain('createdAt=2024-01-15')
		expect(result).not.toContain('T10:30')
	})

	test('flattens nested objects with dot notation', () => {
		const result = formatCompactItem('subscription', {
			id: 'sub_123',
			customer: { id: 'cust_456', email: 'alice@example.com' }
		})
		expect(result).toContain('customer.id=cust_456')
		expect(result).toContain('customer.email=alice@example.com')
	})

	test('summarizes arrays as count', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			benefits: [{ id: 'ben_1' }, { id: 'ben_2' }, { id: 'ben_3' }]
		})
		expect(result).toContain('benefits=3')
	})

	test('shows empty arrays as 0', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			benefits: []
		})
		expect(result).toContain('benefits=0')
	})

	test('truncates long string values at 80 chars', () => {
		const longDesc = 'A'.repeat(120)
		const result = formatCompactItem('product', {
			id: 'prod_123',
			description: longDesc
		})
		// Should be truncated with ellipsis
		expect(result).toContain('...')
		// The value portion should not exceed ~83 chars (80 + "...")
		const descMatch =
			result.match(/description="([^"]+)"/)?.[1] ??
			result.match(/description=(\S+)/)?.[1]
		expect(descMatch).toBeDefined()
		expect(descMatch?.length).toBeLessThanOrEqual(83)
	})

	test('handles boolean values', () => {
		const result = formatCompactItem('product', {
			id: 'prod_123',
			isArchived: false,
			isRecurring: true
		})
		expect(result).toContain('isArchived=false')
		expect(result).toContain('isRecurring=true')
	})

	test('handles numeric values', () => {
		const result = formatCompactItem('order', {
			id: 'ord_123',
			totalAmount: 2000,
			taxAmount: 0
		})
		expect(result).toContain('totalAmount=2000')
		expect(result).toContain('taxAmount=0')
	})

	test('respects field selection', () => {
		const result = formatCompactItem(
			'product',
			{
				id: 'prod_123',
				name: 'Pro Plan',
				description: 'A great plan',
				isRecurring: true
			},
			{ fields: ['id', 'name'] }
		)
		expect(result).toContain('id=prod_123')
		expect(result).toContain('name=')
		expect(result).not.toContain('description=')
		expect(result).not.toContain('isRecurring=')
	})
})

// ─── List Formatting ─────────────────────────────────────────────────

describe('formatCompactList', () => {
	test('formats list with pagination header', () => {
		const result = formatCompactList('products', {
			items: [
				{ id: 'prod_123', name: 'Pro Plan' },
				{ id: 'prod_456', name: 'Starter' }
			],
			pagination: { page: 1, limit: 10, totalCount: 2 }
		})
		const lines = result.split('\n')
		expect(lines[0]).toBe('products 1-2/2 page=1')
	})

	test('formats each item with index marker', () => {
		const result = formatCompactList('products', {
			items: [
				{ id: 'prod_123', name: 'Pro' },
				{ id: 'prod_456', name: 'Starter' }
			],
			pagination: { page: 1, limit: 10, totalCount: 2 }
		})
		const lines = result.split('\n')
		expect(lines[1]).toMatch(/^\s+\[1\] id=prod_123/)
		expect(lines[2]).toMatch(/^\s+\[2\] id=prod_456/)
	})

	test('includes next command hint when more pages exist', () => {
		const result = formatCompactList('products', {
			items: [{ id: 'prod_123', name: 'Pro' }],
			pagination: { page: 1, limit: 1, totalCount: 5 }
		})
		expect(result).toContain('next: polar products list --page 2 --limit 1')
	})

	test('omits next hint on last page', () => {
		const result = formatCompactList('products', {
			items: [{ id: 'prod_123', name: 'Pro' }],
			pagination: { page: 5, limit: 1, totalCount: 5 }
		})
		expect(result).not.toContain('next:')
	})

	test('formats empty results correctly', () => {
		const result = formatCompactList('products', {
			items: [],
			pagination: { page: 1, limit: 10, totalCount: 0 }
		})
		expect(result).toBe('products 0/0')
	})

	test('calculates correct range for middle pages', () => {
		const result = formatCompactList('customers', {
			items: [{ id: 'cust_1' }, { id: 'cust_2' }, { id: 'cust_3' }],
			pagination: { page: 3, limit: 3, totalCount: 25 }
		})
		const lines = result.split('\n')
		expect(lines[0]).toBe('customers 7-9/25 page=3')
	})

	test('respects field selection for list items', () => {
		const result = formatCompactList(
			'products',
			{
				items: [
					{
						id: 'prod_123',
						name: 'Pro',
						description: 'A plan',
						isRecurring: true
					}
				],
				pagination: { page: 1, limit: 10, totalCount: 1 }
			},
			{ fields: ['id', 'name'] }
		)
		expect(result).toContain('id=prod_123')
		expect(result).toContain('name=Pro')
		expect(result).not.toContain('description=')
		expect(result).not.toContain('isRecurring=')
	})
})

// ─── Count Formatting ────────────────────────────────────────────────

describe('formatCompactCount', () => {
	test('returns just the count as a string', () => {
		const result = formatCompactCount(142)
		expect(result).toBe('142')
	})

	test('returns 0 for empty results', () => {
		const result = formatCompactCount(0)
		expect(result).toBe('0')
	})
})
