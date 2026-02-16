/**
 * AI-agent optimized compact output formatter.
 *
 * Design: minimum tokens, maximum signal. See SPEC.md §4.3.
 */

const MAX_STRING_LENGTH = 80

export interface CompactOptions {
	fields?: string[]
}

export interface PaginationMeta {
	page: number
	limit: number
	totalCount: number
}

export interface ListData {
	items: Record<string, unknown>[]
	pagination: PaginationMeta
}

function formatValue(value: unknown): string {
	if (typeof value === 'string') {
		if (value.length > MAX_STRING_LENGTH) {
			value = `${value.slice(0, MAX_STRING_LENGTH)}...`
		}
		if ((value as string).includes(' ')) {
			return `"${value}"`
		}
		return value as string
	}
	if (typeof value === 'boolean' || typeof value === 'number') {
		return String(value)
	}
	return String(value)
}

function isISOTimestamp(value: unknown): boolean {
	if (typeof value !== 'string') return false
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
}

function compressTimestamp(value: string): string {
	return value.slice(0, 10)
}

function flattenObject(
	obj: Record<string, unknown>,
	prefix = ''
): Array<[string, unknown]> {
	const entries: Array<[string, unknown]> = []

	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key

		if (value === null || value === undefined || value === '') {
			continue
		}

		if (Array.isArray(value)) {
			entries.push([fullKey, value.length])
			continue
		}

		if (typeof value === 'object' && value !== null) {
			entries.push(
				...flattenObject(value as Record<string, unknown>, fullKey)
			)
			continue
		}

		if (isISOTimestamp(value)) {
			entries.push([fullKey, compressTimestamp(value as string)])
			continue
		}

		entries.push([fullKey, value])
	}

	return entries
}

function filterFields(
	entries: Array<[string, unknown]>,
	fields?: string[]
): Array<[string, unknown]> {
	if (!fields) return entries
	return entries.filter(([key]) => fields.includes(key))
}

export function formatCompactItem(
	type: string,
	data: Record<string, unknown>,
	options?: CompactOptions
): string {
	const entries = flattenObject(data)
	const filtered = filterFields(entries, options?.fields)
	const pairs = filtered.map(([k, v]) => `${k}=${formatValue(v)}`)
	return `${type} ${pairs.join(' ')}`
}

export function formatCompactList(
	type: string,
	data: ListData,
	options?: CompactOptions
): string {
	const { items, pagination } = data
	const { page, limit, totalCount } = pagination

	if (totalCount === 0 && items.length === 0) {
		return `${type} 0/0`
	}

	const rangeStart = (page - 1) * limit + 1
	const rangeEnd = rangeStart + items.length - 1
	const header = `${type} ${rangeStart}-${rangeEnd}/${totalCount} page=${page}`

	const lines = [header]

	for (let i = 0; i < items.length; i++) {
		const item = items[i] ?? {}
		const entries = flattenObject(item)
		const filtered = filterFields(entries, options?.fields)
		const pairs = filtered.map(([k, v]) => `${k}=${formatValue(v)}`)
		lines.push(`  [${i + 1}] ${pairs.join(' ')}`)
	}

	const hasMorePages = rangeEnd < totalCount
	if (hasMorePages) {
		lines.push(
			`next: polar ${type} list --page ${page + 1} --limit ${limit}`
		)
	}

	return lines.join('\n')
}

export function formatCompactCount(count: number): string {
	return String(count)
}
