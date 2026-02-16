import { describe, expect, test } from 'bun:test'
import {
	formatDeleted,
	formatItem,
	formatList,
	resolveFormat
} from '../../../src/output/index'

describe('resolveFormat', () => {
	test('returns explicit format when provided', () => {
		expect(resolveFormat('json')).toBe('json')
	})
	test('returns env var when no explicit', () => {
		expect(resolveFormat(undefined, 'csv')).toBe('csv')
	})
	test('returns table for TTY', () => {
		expect(resolveFormat(undefined, undefined, true)).toBe('table')
	})
	test('returns compact for non-TTY', () => {
		expect(resolveFormat(undefined, undefined, false)).toBe('compact')
	})
})

describe('formatList', () => {
	const items = [
		{ id: 'prod_123', name: 'Pro Plan', isRecurring: true },
		{ id: 'prod_456', name: 'Starter', isRecurring: false }
	]
	const pagination = { page: 1, limit: 10, totalCount: 2 }

	test('formats as compact', () => {
		const result = formatList('products', items, pagination, {
			format: 'compact'
		})
		expect(result).toContain('products 1-2/2')
		expect(result).toContain('[1]')
	})

	test('formats as count', () => {
		const result = formatList('products', items, pagination, {
			format: 'count'
		})
		expect(result).toBe('2')
	})

	test('formats as id', () => {
		const result = formatList('products', items, pagination, {
			format: 'id'
		})
		expect(result).toBe('prod_123\nprod_456')
	})

	test('formats as json', () => {
		const result = formatList('products', items, pagination, {
			format: 'json'
		})
		const parsed = JSON.parse(result)
		expect(parsed.items).toHaveLength(2)
		expect(parsed.pagination.totalCount).toBe(2)
	})

	test('formats as jsonl', () => {
		const result = formatList('products', items, pagination, {
			format: 'jsonl'
		})
		const lines = result.split('\n')
		expect(lines).toHaveLength(2)
	})

	test('formats as csv', () => {
		const result = formatList('products', items, pagination, {
			format: 'csv'
		})
		expect(result).toContain('id,name,isRecurring')
	})
})

describe('formatItem', () => {
	const data = {
		id: 'prod_123',
		name: 'Pro Plan',
		isRecurring: true,
		description: 'Great plan'
	}

	test('formats as compact', () => {
		const result = formatItem('product', data, { format: 'compact' })
		expect(result).toContain('product id=prod_123')
	})

	test('formats as json', () => {
		const result = formatItem('product', data, { format: 'json' })
		const parsed = JSON.parse(result)
		expect(parsed.id).toBe('prod_123')
	})

	test('formats as id', () => {
		const result = formatItem('product', data, { format: 'id' })
		expect(result).toBe('prod_123')
	})
})

describe('formatDeleted', () => {
	test('compact format', () => {
		const result = formatDeleted('customer', 'cust_123')
		expect(result).toBe('deleted customer id=cust_123')
	})

	test('json format', () => {
		const result = formatDeleted('customer', 'cust_123', undefined, {
			format: 'json'
		} as any)
		const parsed = JSON.parse(result)
		expect(parsed.deleted).toBe(true)
		expect(parsed.id).toBe('cust_123')
	})
})
