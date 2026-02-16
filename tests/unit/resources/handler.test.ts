import { describe, expect, mock, test } from 'bun:test'
import {
	type ExecuteOptions,
	executeOperation
} from '../../../src/resources/handler'
import type { OperationDef, ResourceDef } from '../../../src/resources/types'

const productResource: ResourceDef = {
	name: 'product',
	plural: 'products',
	cliName: 'products',
	sdkNamespace: 'products',
	description: 'Manage products',
	defaultFields: ['id', 'name', 'isRecurring'],
	operations: []
}

const listOp: OperationDef = {
	type: 'list',
	sdkMethod: 'list',
	description: 'List products',
	paginatable: true,
	flags: [
		{
			name: 'is-recurring',
			sdkField: 'isRecurring',
			description: 'Filter recurring',
			type: 'boolean'
		},
		{
			name: 'query',
			sdkField: 'query',
			description: 'Search',
			type: 'string'
		}
	]
}

const getOp: OperationDef = {
	type: 'get',
	sdkMethod: 'get',
	description: 'Get product'
}

const createOp: OperationDef = {
	type: 'create',
	sdkMethod: 'create',
	description: 'Create product',
	flags: [
		{
			name: 'name',
			sdkField: 'name',
			description: 'Name',
			type: 'string',
			required: true
		},
		{
			name: 'description',
			sdkField: 'description',
			description: 'Description',
			type: 'string'
		}
	]
}

const updateOp: OperationDef = {
	type: 'update',
	sdkMethod: 'update',
	description: 'Update product',
	flags: [
		{ name: 'name', sdkField: 'name', description: 'Name', type: 'string' }
	]
}

const deleteOp: OperationDef = {
	type: 'delete',
	sdkMethod: 'delete',
	description: 'Delete product'
}

function createMockClient(overrides: Record<string, any> = {}): any {
	return {
		products: {
			list: mock(async () => ({
				result: {
					items: [
						{ id: 'prod_1', name: 'Pro', isRecurring: true },
						{ id: 'prod_2', name: 'Free', isRecurring: false }
					],
					pagination: { totalCount: 2, maxPage: 1 }
				}
			})),
			get: mock(async () => ({
				id: 'prod_1',
				name: 'Pro',
				isRecurring: true
			})),
			create: mock(async () => ({
				id: 'prod_new',
				name: 'New Product',
				isRecurring: false
			})),
			update: mock(async () => ({
				id: 'prod_1',
				name: 'Updated',
				isRecurring: true
			})),
			delete: mock(async () => undefined),
			...overrides
		}
	}
}

function makeOptions(overrides: Partial<ExecuteOptions> = {}): ExecuteOptions {
	return {
		args: {},
		flags: {},
		output: { format: 'compact' },
		limit: 10,
		page: 1,
		...overrides
	}
}

describe('executeOperation - list', () => {
	test('calls SDK list with pagination', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ limit: 5, page: 2 })
		)
		expect(client.products.list).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 5, page: 2 })
		)
		expect(result.exitCode).toBe(0)
	})

	test('passes filter flags to SDK', async () => {
		const client = createMockClient()
		await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ flags: { isRecurring: true } })
		)
		expect(client.products.list).toHaveBeenCalledWith(
			expect.objectContaining({ isRecurring: true })
		)
	})

	test('formats list output as compact', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions()
		)
		expect(result.stdout).toContain('products 1-2/2')
		expect(result.stdout).toContain('[1]')
		expect(result.stdout).toContain('[2]')
	})

	test('formats list as count', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ output: { format: 'count' } })
		)
		expect(result.stdout).toBe('2')
	})

	test('formats list as id', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ output: { format: 'id' } })
		)
		expect(result.stdout).toBe('prod_1\nprod_2')
	})

	test('formats list as json', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ output: { format: 'json' } })
		)
		const parsed = JSON.parse(result.stdout)
		expect(parsed.items).toHaveLength(2)
		expect(parsed.pagination.totalCount).toBe(2)
	})
})

describe('executeOperation - get', () => {
	test('calls SDK get with id', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			getOp,
			makeOptions({ args: { id: 'prod_1' } })
		)
		expect(client.products.get).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'prod_1' })
		)
		expect(result.exitCode).toBe(0)
		expect(result.stdout).toContain('product id=prod_1')
	})
})

describe('executeOperation - create', () => {
	test('calls SDK create with flags', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			createOp,
			makeOptions({ flags: { name: 'New' } })
		)
		expect(client.products.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'New' })
		)
		expect(result.exitCode).toBe(0)
		expect(result.stdout).toContain('prod_new')
	})
})

describe('executeOperation - update', () => {
	test('calls SDK update with id and flags', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			updateOp,
			makeOptions({ args: { id: 'prod_1' }, flags: { name: 'Updated' } })
		)
		expect(client.products.update).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'prod_1', name: 'Updated' })
		)
		expect(result.exitCode).toBe(0)
	})
})

describe('executeOperation - delete', () => {
	test('calls SDK delete with id', async () => {
		const client = createMockClient()
		const result = await executeOperation(
			client,
			productResource,
			deleteOp,
			makeOptions({ args: { id: 'prod_1' } })
		)
		expect(client.products.delete).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'prod_1' })
		)
		expect(result.exitCode).toBe(0)
		expect(result.stdout).toContain('deleted product id=prod_1')
	})
})

describe('executeOperation - error handling', () => {
	test('returns error on SDK failure', async () => {
		const client = createMockClient({
			get: mock(async () => {
				throw Object.assign(new Error('Not found'), { statusCode: 404 })
			})
		})
		const result = await executeOperation(
			client,
			productResource,
			getOp,
			makeOptions({ args: { id: 'bad' } })
		)
		expect(result.exitCode).toBe(1)
		expect(result.stderr.toLowerCase()).toContain('error')
		expect(result.stderr).toContain('404')
	})
})

describe('executeOperation - organization filter', () => {
	test('passes organizationId from flags', async () => {
		const client = createMockClient()
		await executeOperation(
			client,
			productResource,
			listOp,
			makeOptions({ flags: { organizationId: 'org_123' } })
		)
		expect(client.products.list).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org_123' })
		)
	})
})
