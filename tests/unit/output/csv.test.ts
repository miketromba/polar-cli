import { describe, expect, test } from 'bun:test'
import { formatCSV, formatTSV } from '../../../src/output/csv'

describe('formatCSV', () => {
	test('produces header row and data rows', () => {
		const result = formatCSV([
			{ id: 'prod_123', name: 'Pro Plan', active: true },
			{ id: 'prod_456', name: 'Starter', active: false }
		])
		const lines = result.split('\n')
		expect(lines[0]).toBe('id,name,active')
		expect(lines[1]).toContain('prod_123')
		expect(lines[1]).toContain('Pro Plan')
	})

	test('quotes values containing commas', () => {
		const result = formatCSV([{ id: 'a', name: 'Plan, Pro' }])
		expect(result).toContain('"Plan, Pro"')
	})

	test('returns empty string for no items', () => {
		const result = formatCSV([])
		expect(result).toBe('')
	})
})

describe('formatTSV', () => {
	test('uses tabs as delimiter', () => {
		const result = formatTSV([{ id: 'a', name: 'Pro' }])
		expect(result).toContain('id\tname')
		expect(result).toContain('a\tPro')
	})
})
