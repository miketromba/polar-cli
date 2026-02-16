import { describe, expect, mock, test } from 'bun:test'
import {
	type ExecuteOptions,
	executeOperation
} from '../../../src/resources/handler'
import type { OperationDef, ResourceDef } from '../../../src/resources/types'

const testResource: ResourceDef = {
	name: 'testItem',
	plural: 'testItems',
	cliName: 'test-items',
	sdkNamespace: 'testItems',
	description: 'Test resource',
	defaultFields: ['id', 'name'],
	operations: []
}

const listOp: OperationDef = {
	type: 'list',
	sdkMethod: 'list',
	description: 'List items',
	paginatable: true
}

const getOp: OperationDef = {
	type: 'get',
	sdkMethod: 'get',
	description: 'Get item'
}

function makeClient(): any {
	return {
		testItems: {
			list: mock(async () => ({
				result: {
					items: [
						{ id: 't_1', name: 'Alpha', extra: 'data' },
						{ id: 't_2', name: 'Beta', extra: 'more' }
					],
					pagination: { totalCount: 2, maxPage: 1 }
				}
			})),
			get: mock(async () => ({
				id: 't_1',
				name: 'Alpha',
				extra: 'data',
				nested: { key: 'value' }
			}))
		}
	}
}

function opts(overrides: Partial<ExecuteOptions> = {}): ExecuteOptions {
	return {
		args: {},
		flags: {},
		output: { format: 'compact' },
		limit: 10,
		page: 1,
		...overrides
	}
}

describe('handler output formats - list', () => {
	for (const format of [
		'compact',
		'json',
		'jsonl',
		'csv',
		'tsv',
		'id',
		'count'
	] as const) {
		test(`list as ${format} produces output`, async () => {
			const client = makeClient()
			const result = await executeOperation(
				client,
				testResource,
				listOp,
				opts({ output: { format } })
			)
			expect(result.exitCode).toBe(0)
			expect(result.stdout).toBeTruthy()
		})
	}

	test('compact list has pagination header', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			listOp,
			opts()
		)
		expect(result.stdout).toContain('testItems 1-2/2')
	})

	test('json list has items and pagination', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			listOp,
			opts({ output: { format: 'json' } })
		)
		const parsed = JSON.parse(result.stdout)
		expect(parsed.items).toBeDefined()
		expect(parsed.pagination).toBeDefined()
	})

	test('id list returns only IDs', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			listOp,
			opts({ output: { format: 'id' } })
		)
		expect(result.stdout).toBe('t_1\nt_2')
	})

	test('count returns integer', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			listOp,
			opts({ output: { format: 'count' } })
		)
		expect(result.stdout).toBe('2')
	})

	test('csv has header row', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			listOp,
			opts({ output: { format: 'csv' } })
		)
		expect(result.stdout.split('\n')[0]).toContain('id')
		expect(result.stdout.split('\n')[0]).toContain('name')
	})
})

describe('handler output formats - get', () => {
	for (const format of ['compact', 'json', 'csv', 'id'] as const) {
		test(`get as ${format} produces output`, async () => {
			const client = makeClient()
			const result = await executeOperation(
				client,
				testResource,
				getOp,
				opts({ args: { id: 't_1' }, output: { format } })
			)
			expect(result.exitCode).toBe(0)
			expect(result.stdout).toBeTruthy()
		})
	}

	test('compact get has type prefix', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			getOp,
			opts({ args: { id: 't_1' } })
		)
		expect(result.stdout).toContain('testItem ')
	})

	test('json get is valid JSON', async () => {
		const result = await executeOperation(
			makeClient(),
			testResource,
			getOp,
			opts({ args: { id: 't_1' }, output: { format: 'json' } })
		)
		expect(() => JSON.parse(result.stdout)).not.toThrow()
	})
})
