import type { Polar } from '@polar-sh/sdk'
import {
	formatDeleted,
	formatItem,
	formatList,
	type OutputOptions,
	type PaginationMeta
} from '../output/index'
import {
	classifySDKError,
	formatError,
	formatErrorCompact
} from '../utils/errors'
import type { OperationDef, ResourceDef } from './types'

export interface CommandResult {
	stdout: string
	stderr: string
	exitCode: number
}

export interface ExecuteOptions {
	args: Record<string, string> // positional args by name
	flags: Record<string, unknown> // named flags
	output: OutputOptions
	limit?: number
	page?: number
}

function getSDKNamespace(client: Polar, resource: ResourceDef): any {
	// Handle nested namespaces like "customerPortal.benefitGrants"
	if (resource.subNamespace) {
		const parts = resource.subNamespace.split('.')
		let ns: any = client
		for (const part of parts) {
			ns = ns[part]
		}
		return ns
	}
	return (client as any)[resource.sdkNamespace]
}

function buildListRequest(
	operation: OperationDef,
	options: ExecuteOptions
): Record<string, unknown> {
	const req: Record<string, unknown> = {}

	// Add pagination
	if (operation.paginatable !== false) {
		req.limit = options.limit ?? 10
		req.page = options.page ?? 1
	}

	// Map flags to SDK fields
	if (operation.flags) {
		for (const flag of operation.flags) {
			const value =
				options.flags[flag.sdkField] ?? options.flags[flag.name]
			if (value !== undefined && value !== null) {
				req[flag.sdkField] = value
			}
		}
	}

	// Add org if present
	if (options.flags.organizationId) {
		req.organizationId = options.flags.organizationId
	}

	return req
}

function buildGetRequest(
	operation: OperationDef,
	options: ExecuteOptions
): Record<string, unknown> {
	const idParam = operation.idParam ?? 'id'
	const req: Record<string, unknown> = { [idParam]: options.args.id }
	return req
}

function buildMutationRequest(
	operation: OperationDef,
	options: ExecuteOptions
): Record<string, unknown> {
	const req: Record<string, unknown> = {}

	// For update, include ID
	if (operation.type === 'update' && options.args.id) {
		const idParam = operation.idParam ?? 'id'
		req[idParam] = options.args.id
	}

	// Map flags to SDK fields
	if (operation.flags) {
		for (const flag of operation.flags) {
			const value =
				options.flags[flag.sdkField] ?? options.flags[flag.name]
			if (value !== undefined && value !== null) {
				if (flag.type === 'json' && typeof value === 'string') {
					try {
						req[flag.sdkField] = JSON.parse(value as string)
					} catch {
						req[flag.sdkField] = value
					}
				} else {
					req[flag.sdkField] = value
				}
			}
		}
	}

	if (options.flags.organizationId) {
		req.organizationId = options.flags.organizationId
	}

	return req
}

export async function executeOperation(
	client: Polar,
	resource: ResourceDef,
	operation: OperationDef,
	options: ExecuteOptions
): Promise<CommandResult> {
	const namespace = getSDKNamespace(client, resource)
	const method = namespace[operation.sdkMethod]

	if (!method) {
		const isTTY = process.stdout.isTTY ?? false
		const cliError = {
			type: 'NotImplemented' as const,
			resource: resource.name,
			message: `Method '${operation.sdkMethod}' is not available on '${resource.sdkNamespace}'`
		}
		return {
			stdout: '',
			stderr: isTTY
				? formatError(cliError)
				: formatErrorCompact(cliError),
			exitCode: 1
		}
	}

	try {
		switch (operation.type) {
			case 'list': {
				const req = buildListRequest(operation, options)
				const response = await method.call(namespace, req)

				// SDK list responses have a .result with items and pagination
				const result = response.result ?? response
				const items = result.items ?? []
				const pagination: PaginationMeta = {
					page: options.page ?? 1,
					limit: options.limit ?? 10,
					totalCount: result.pagination?.totalCount ?? items.length
				}

				const stdout = formatList(
					resource.plural,
					items,
					pagination,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			case 'get': {
				const req = buildGetRequest(operation, options)
				const data = await method.call(namespace, req)
				const stdout = formatItem(
					resource.name,
					data as Record<string, unknown>,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			case 'create': {
				const req = buildMutationRequest(operation, options)
				const data = await method.call(namespace, req)
				const stdout = formatItem(
					resource.name,
					data as Record<string, unknown>,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			case 'update': {
				const req = buildMutationRequest(operation, options)
				const data = await method.call(namespace, req)
				const stdout = formatItem(
					resource.name,
					data as Record<string, unknown>,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			case 'delete': {
				const idParam = operation.idParam ?? 'id'
				const id = options.args.id ?? ''
				await method.call(namespace, { [idParam]: id })
				const stdout = formatDeleted(
					resource.name,
					id,
					undefined,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			case 'custom': {
				// Custom operations: build request from all args + flags
				const req: Record<string, unknown> = { ...options.args }
				if (operation.flags) {
					for (const flag of operation.flags) {
						const value =
							options.flags[flag.sdkField] ??
							options.flags[flag.name]
						if (value !== undefined && value !== null) {
							if (
								flag.type === 'json' &&
								typeof value === 'string'
							) {
								try {
									req[flag.sdkField] = JSON.parse(
										value as string
									)
								} catch {
									req[flag.sdkField] = value
								}
							} else {
								req[flag.sdkField] = value
							}
						}
					}
				}
				if (options.flags.organizationId)
					req.organizationId = options.flags.organizationId

				const data = await method.call(namespace, req)

				// If response looks like a list, format as list
				if (
					data &&
					typeof data === 'object' &&
					'items' in (data as any)
				) {
					const r = (data as any).result ?? data
					const items = r.items ?? []
					const pagination: PaginationMeta = {
						page: options.page ?? 1,
						limit: options.limit ?? 10,
						totalCount: r.pagination?.totalCount ?? items.length
					}
					const stdout = formatList(
						resource.plural,
						items,
						pagination,
						options.output
					)
					return { stdout, stderr: '', exitCode: 0 }
				}

				// If void/null (like deactivate), return confirmation
				if (data === undefined || data === null) {
					return {
						stdout: `${operation.sdkMethod} completed`,
						stderr: '',
						exitCode: 0
					}
				}

				// Otherwise format as single item
				const stdout = formatItem(
					resource.name,
					data as Record<string, unknown>,
					options.output
				)
				return { stdout, stderr: '', exitCode: 0 }
			}

			default:
				return {
					stdout: '',
					stderr: `Unknown operation type: ${operation.type}`,
					exitCode: 1
				}
		}
	} catch (err: any) {
		const cliError = classifySDKError(err, resource.name)
		const isTTY = process.stdout.isTTY ?? false
		const formatted = isTTY
			? formatError(cliError)
			: formatErrorCompact(cliError)

		return {
			stdout: '',
			stderr: formatted,
			exitCode: 1
		}
	}
}
