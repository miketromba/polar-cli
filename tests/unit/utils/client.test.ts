import { describe, expect, test } from 'bun:test'
import { createClient } from '../../../src/client'

describe('createClient', () => {
	test('creates a Polar client with access token', () => {
		const client = createClient({
			accessToken: 'polar_pat_test_token',
			server: 'production'
		})
		expect(client).toBeDefined()
		expect(client.products).toBeDefined()
		expect(client.customers).toBeDefined()
		expect(client.subscriptions).toBeDefined()
		expect(client.orders).toBeDefined()
	})

	test('creates a sandbox client', () => {
		const client = createClient({
			accessToken: 'polar_pat_test_token',
			server: 'sandbox'
		})
		expect(client).toBeDefined()
	})

	test('throws when no access token provided', () => {
		expect(() =>
			createClient({ accessToken: '', server: 'production' })
		).toThrow()
	})
})
