/**
 * CSV and TSV formatters.
 */

function isISOTimestamp(value: unknown): boolean {
	if (typeof value !== 'string') return false
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
}

function compressTimestamp(value: string): string {
	return value.slice(0, 10)
}

function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) return ''

	if (value instanceof Date) {
		return compressTimestamp(value.toISOString())
	}

	if (Array.isArray(value)) {
		return `[${value.length}]`
	}

	if (typeof value === 'object' && value !== null) {
		const obj = value as Record<string, unknown>
		if ('id' in obj) return String(obj.id)
		return `{${Object.keys(obj).length} keys}`
	}

	if (isISOTimestamp(value)) {
		return compressTimestamp(value as string)
	}

	return String(value)
}

function escapeCell(value: string, delimiter: string): string {
	if (
		value.includes(delimiter) ||
		value.includes('\n') ||
		value.includes('"')
	) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function formatCSV(
	items: Record<string, unknown>[],
	options?: { delimiter?: string }
): string {
	if (items.length === 0) return ''

	const delimiter = options?.delimiter ?? ','

	// Gather all column names preserving insertion order
	const columns: string[] = []
	for (const item of items) {
		for (const key of Object.keys(item)) {
			if (!columns.includes(key)) columns.push(key)
		}
	}

	const header = columns
		.map(col => escapeCell(col, delimiter))
		.join(delimiter)

	const rows = items.map(item =>
		columns
			.map(col => escapeCell(formatCellValue(item[col]), delimiter))
			.join(delimiter)
	)

	return [header, ...rows].join('\n')
}

export function formatTSV(items: Record<string, unknown>[]): string {
	return formatCSV(items, { delimiter: '\t' })
}
