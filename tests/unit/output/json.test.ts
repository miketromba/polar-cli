import { describe, expect, test } from 'bun:test'
import {
	formatJSON,
	formatJSONL,
	formatJSONList
} from '../../../src/output/json'

describe('formatJSON', () => {
	test('returns minified JSON', () => {
		const result = formatJSON({ id: 'test', name: 'Pro' })
		expect(result).toBe('{"id":"test","name":"Pro"}')
		expect(result).not.toContain('\n')
	})
})

describe('formatJSONL', () => {
	test('returns one JSON object per line', () => {
		const result = formatJSONL([{ id: 'a' }, { id: 'b' }])
		const lines = result.split('\n')
		expect(lines).toHaveLength(2)
		expect(JSON.parse(lines[0]!)).toEqual({ id: 'a' })
		expect(JSON.parse(lines[1]!)).toEqual({ id: 'b' })
	})
})

describe('formatJSONList', () => {
	test('wraps items with pagination', () => {
		const result = formatJSONList([{ id: 'a' }], {
			page: 1,
			limit: 10,
			totalCount: 1
		})
		const parsed = JSON.parse(result)
		expect(parsed.items).toHaveLength(1)
		expect(parsed.pagination.totalCount).toBe(1)
	})
})
