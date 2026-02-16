import { describe, expect, test } from 'bun:test'
import { formatError, formatErrorCompact } from '../../../src/utils/errors'

describe('formatError (TTY / human-readable)', () => {
	test('formats a resource not found error', () => {
		const result = formatError({
			type: 'ResourceNotFound',
			code: 404,
			resource: 'product',
			id: 'prod_nonexistent'
		})
		expect(result).toContain('not found')
		expect(result).toContain('404')
		expect(result).toContain('prod_nonexistent')
		expect(result).toContain('polar products list')
	})

	test('formats a validation error with field details', () => {
		const result = formatError({
			type: 'ValidationError',
			code: 422,
			fields: {
				name: 'Field is required',
				recurring_interval: 'Must be one of: day, week, month, year'
			}
		})
		expect(result).toContain('Validation failed')
		expect(result).toContain('name: Field is required')
		expect(result).toContain('recurring_interval:')
	})

	test('formats an auth error with login hint', () => {
		const result = formatError({
			type: 'Unauthorized',
			code: 401
		})
		expect(result).toContain('Not authenticated')
		expect(result).toContain('polar auth login')
	})
})

describe('formatErrorCompact (non-TTY / agent-friendly)', () => {
	test('formats as single-line key=value', () => {
		const result = formatErrorCompact({
			type: 'ResourceNotFound',
			code: 404,
			resource: 'product',
			id: 'prod_nonexistent'
		})
		expect(result).toContain('error code=404 type=ResourceNotFound')
		expect(result).toContain('resource=product')
		expect(result).toContain('id=prod_nonexistent')
		expect(result).toContain('hint=')
	})

	test('formats validation error compactly', () => {
		const result = formatErrorCompact({
			type: 'ValidationError',
			code: 422,
			fields: { name: 'required' }
		})
		expect(result).toContain('error code=422 type=ValidationError')
		expect(result).toContain('fields="name: required"')
	})

	test('formats auth error with hint', () => {
		const result = formatErrorCompact({
			type: 'Unauthorized',
			code: 401
		})
		expect(result).toContain('error code=401 type=Unauthorized')
		expect(result).toContain('hint=')
		expect(result).toContain('polar auth login')
	})

	test('formats connection error', () => {
		const result = formatErrorCompact({
			type: 'ConnectionError'
		})
		expect(result).toContain('error type=ConnectionError')
		expect(result).toContain('hint=')
	})
})
