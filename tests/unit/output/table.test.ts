import { describe, expect, test } from 'bun:test'
import { formatTable, formatTableItem } from '../../../src/output/table'

describe('formatTable', () => {
	test('formats items as aligned columns', () => {
		const result = formatTable(
			[
				{ id: 'prod_123', name: 'Pro Plan', status: 'active' },
				{ id: 'prod_456', name: 'Starter', status: 'archived' }
			],
			{ noColor: true }
		)
		expect(result).toContain('id')
		expect(result).toContain('name')
		expect(result).toContain('prod_123')
		expect(result).toContain('Pro Plan')
	})

	test("returns 'No results.' for empty array", () => {
		const result = formatTable([], { noColor: true })
		expect(result).toBe('No results.')
	})

	test('truncates long values', () => {
		const result = formatTable(
			[{ id: 'prod_123', description: 'A'.repeat(100) }],
			{ noColor: true }
		)
		expect(result).toContain('...')
	})
})

describe('formatTableItem', () => {
	test('formats single item as vertical key-value', () => {
		const result = formatTableItem(
			'product',
			{
				id: 'prod_123',
				name: 'Pro Plan'
			},
			{ noColor: true }
		)
		expect(result).toContain('id')
		expect(result).toContain('prod_123')
		expect(result).toContain('name')
		expect(result).toContain('Pro Plan')
	})
})
