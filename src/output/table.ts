/**
 * Table formatter for TTY (human) output.
 *
 * Renders aligned columns with optional color via chalk.
 */

import chalk from 'chalk'

export interface TableOptions {
	fields?: string[]
	noColor?: boolean
}

const MAX_VALUE_LENGTH = 40

function isISOTimestamp(value: unknown): boolean {
	if (typeof value !== 'string') return false
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
}

function compressTimestamp(value: string): string {
	return value.slice(0, 10)
}

function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) return ''

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

	const str = String(value)
	if (str.length > MAX_VALUE_LENGTH) {
		return `${str.slice(0, MAX_VALUE_LENGTH - 3)}...`
	}
	return str
}

export function formatTable(
	items: Record<string, unknown>[],
	options?: TableOptions
): string {
	if (items.length === 0) return 'No results.'

	const useColor = !options?.noColor

	// Gather all column names preserving insertion order
	const columns: string[] = []
	for (const item of items) {
		for (const key of Object.keys(item)) {
			if (!columns.includes(key)) columns.push(key)
		}
	}

	// Build cell values
	const rows = items.map(item =>
		columns.map(col => formatCellValue(item[col]))
	)

	// Calculate column widths (minimum of header length or longest value)
	const widths = columns.map((col, i) => {
		const maxData = rows.reduce(
			(max, row) => Math.max(max, (row[i] ?? '').length),
			0
		)
		return Math.max(col.length, maxData)
	})

	// Build header
	const header = columns
		.map((col, i) => col.padEnd(widths[i] ?? 0))
		.join('  ')

	// Build separator
	const separator = widths.map(w => '─'.repeat(w)).join('  ')

	// Build data rows
	const dataLines = rows.map(row =>
		row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ')
	)

	if (useColor) {
		return [chalk.bold(header), separator, ...dataLines].join('\n')
	}

	return [header, separator, ...dataLines].join('\n')
}

export function formatTableItem(
	type: string,
	data: Record<string, unknown>,
	options?: TableOptions
): string {
	const useColor = !options?.noColor
	const entries = Object.entries(data)

	if (entries.length === 0) return `No ${type} data.`

	const keyWidth = Math.max(...entries.map(([k]) => k.length))
	const separator = `${'─'.repeat(keyWidth)}  ${'─'.repeat(MAX_VALUE_LENGTH)}`

	const headerKey = 'Key'.padEnd(keyWidth)
	const headerVal = 'Value'
	const header = `${headerKey}  ${headerVal}`

	const lines = entries.map(([key, value]) => {
		const paddedKey = key.padEnd(keyWidth)
		const val = formatCellValue(value)
		if (useColor) {
			return `${chalk.bold(paddedKey)}  ${val}`
		}
		return `${paddedKey}  ${val}`
	})

	if (useColor) {
		return [chalk.bold(header), separator, ...lines].join('\n')
	}
	return [header, separator, ...lines].join('\n')
}
