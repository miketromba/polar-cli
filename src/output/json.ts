/**
 * JSON and JSON Lines formatters.
 */

export function formatJSON(data: unknown): string {
	return JSON.stringify(data)
}

export function formatJSONPretty(data: unknown): string {
	return JSON.stringify(data, null, 2)
}

export function formatJSONL(items: unknown[]): string {
	return items.map(item => JSON.stringify(item)).join('\n')
}

export function formatJSONList(
	items: unknown[],
	pagination: { page: number; limit: number; totalCount: number }
): string {
	return JSON.stringify({ items, pagination })
}
