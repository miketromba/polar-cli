/**
 * Error formatting for TTY (human) and non-TTY (agent) output.
 *
 * See SPEC.md §8.
 */

export interface CLIError {
	type: string
	code?: number
	resource?: string
	id?: string
	fields?: Record<string, string>
	message?: string
}

function getHint(error: CLIError): string | undefined {
	switch (error.type) {
		case 'Unauthorized':
			return "Run 'polar auth login --token <your-access-token>' to authenticate. Get your token at https://polar.sh/settings"
		case 'Forbidden':
			return 'Check that your token has the required scopes, or use --org to specify an organization'
		case 'ResourceNotFound':
			return error.resource
				? `Run 'polar ${error.resource}s list' to see available ${error.resource}s`
				: 'Verify the resource ID is correct'
		case 'ValidationError':
			return error.resource
				? `Run 'polar ${error.resource}s create --help' for required flags and usage`
				: 'Check the flag values and try again'
		case 'RateLimited':
			return 'Wait a moment and try again. Use --limit to fetch fewer items per request'
		case 'ServerError':
			return 'This is a Polar API issue. Check https://status.polar.sh or try again later'
		case 'ConnectionError':
			return 'Check your network connection and try again'
		case 'ConfirmationRequired':
			return "Add '--yes' to confirm destructive actions in non-interactive mode"
		case 'NotImplemented':
			return 'This operation may not be available in the current API version'
		default:
			return undefined
	}
}

export function formatError(error: CLIError): string {
	const lines: string[] = []

	switch (error.type) {
		case 'Unauthorized':
			lines.push('Error: Not authenticated')
			lines.push(
				"  Run 'polar auth login --token <your-access-token>' to authenticate."
			)
			lines.push('  Get your token at https://polar.sh/settings')
			if (
				error.message &&
				error.message !== 'No access token found' &&
				error.message !== 'Unauthorized'
			) {
				lines.push(`  Detail: ${error.message}`)
			}
			break

		case 'Forbidden':
			lines.push(
				`Error: Access denied${error.resource ? ` for ${error.resource}` : ''} (403)`
			)
			if (error.message) lines.push(`  Detail: ${error.message}`)
			lines.push(
				'  Hint: Check that your token has the required scopes for this operation.'
			)
			lines.push(
				'  Hint: If accessing an organization resource, use --org <id> to specify the organization.'
			)
			break

		case 'ResourceNotFound':
			lines.push(`Error: ${error.resource ?? 'Resource'} not found (404)`)
			if (error.id) lines.push(`  ID: ${error.id}`)
			if (error.resource) {
				lines.push(
					`  Hint: Run 'polar ${error.resource}s list' to see available ${error.resource}s.`
				)
			} else {
				lines.push('  Hint: Verify the resource ID is correct.')
			}
			break

		case 'ValidationError':
			lines.push('Error: Validation failed (422)')
			if (error.fields) {
				for (const [field, msg] of Object.entries(error.fields)) {
					lines.push(`  - ${field}: ${msg}`)
				}
			}
			if (error.message && !error.fields) {
				lines.push(`  Detail: ${error.message}`)
			}
			if (error.resource) {
				lines.push(
					`  Hint: Run 'polar ${error.resource}s create --help' for required flags and usage.`
				)
			}
			break

		case 'RateLimited':
			lines.push('Error: Rate limit exceeded (429)')
			lines.push(
				'  Hint: Wait a moment and try again. Use --limit to fetch fewer items per request.'
			)
			break

		case 'ServerError':
			lines.push(`Error: Polar API error (${error.code ?? 500})`)
			if (error.message) lines.push(`  Detail: ${error.message}`)
			lines.push(
				'  Hint: This is a server-side issue. Check https://status.polar.sh or try again later.'
			)
			break

		case 'ConnectionError':
			lines.push('Error: Could not connect to the Polar API')
			if (error.message) lines.push(`  Detail: ${error.message}`)
			lines.push('  Hint: Check your network connection and try again.')
			break

		case 'ConfirmationRequired':
			lines.push('Error: Confirmation required for destructive action')
			lines.push(
				"  Hint: Add '--yes' to confirm, or run in an interactive terminal."
			)
			break

		default:
			lines.push(
				`Error: ${error.message ?? error.type}${error.code ? ` (${error.code})` : ''}`
			)
			break
	}

	return lines.join('\n')
}

export function formatErrorCompact(error: CLIError): string {
	const parts: string[] = ['error']

	if (error.code !== undefined) {
		parts.push(`code=${error.code}`)
	}

	parts.push(`type=${error.type}`)

	if (error.resource) {
		parts.push(`resource=${error.resource}`)
	}

	if (error.id) {
		parts.push(`id=${error.id}`)
	}

	if (error.fields) {
		const fieldStr = Object.entries(error.fields)
			.map(([k, v]) => `${k}: ${v}`)
			.join('; ')
		parts.push(`fields="${fieldStr}"`)
	}

	if (error.message) {
		parts.push(`message="${error.message.slice(0, 200)}"`)
	}

	const hint = getHint(error)
	if (hint) {
		parts.push(`hint="${hint}"`)
	}

	return parts.join(' ')
}

/**
 * Classify a raw SDK/network error into a structured CLIError.
 */
export function classifySDKError(err: any, resourceName?: string): CLIError {
	const statusCode: number | undefined =
		err.statusCode ?? err.status ?? err.response?.status
	const message: string =
		err.body?.detail ?? err.body?.message ?? err.message ?? String(err)

	// Parse validation error fields from SDK response
	let fields: Record<string, string> | undefined
	if (err.body?.detail && Array.isArray(err.body.detail)) {
		fields = {}
		for (const d of err.body.detail) {
			const loc = Array.isArray(d.loc)
				? d.loc.filter((l: any) => l !== 'body').join('.')
				: 'unknown'
			fields[loc] = d.msg ?? d.message ?? String(d)
		}
	}

	// Network/connection errors
	if (
		err.code === 'ECONNREFUSED' ||
		err.code === 'ENOTFOUND' ||
		err.code === 'ETIMEDOUT' ||
		err.cause?.code === 'ECONNREFUSED' ||
		err.cause?.code === 'ENOTFOUND' ||
		(err.name === 'TypeError' && message.includes('fetch'))
	) {
		return {
			type: 'ConnectionError',
			message: message.slice(0, 200),
			resource: resourceName
		}
	}

	switch (statusCode) {
		case 401:
			return {
				type: 'Unauthorized',
				code: 401,
				message: message.slice(0, 200),
				resource: resourceName
			}
		case 403:
			return {
				type: 'Forbidden',
				code: 403,
				message: message.slice(0, 200),
				resource: resourceName
			}
		case 404:
			return {
				type: 'ResourceNotFound',
				code: 404,
				resource: resourceName,
				message: message.slice(0, 200)
			}
		case 422:
			return {
				type: 'ValidationError',
				code: 422,
				resource: resourceName,
				fields,
				message: fields ? undefined : message.slice(0, 200)
			}
		case 429:
			return {
				type: 'RateLimited',
				code: 429,
				resource: resourceName
			}
		default:
			if (statusCode && statusCode >= 500) {
				return {
					type: 'ServerError',
					code: statusCode,
					message: message.slice(0, 200),
					resource: resourceName
				}
			}
			return {
				type: err.constructor?.name ?? 'UnexpectedError',
				code: statusCode,
				message: message.slice(0, 200),
				resource: resourceName
			}
	}
}
