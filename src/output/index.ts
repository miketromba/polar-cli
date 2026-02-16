/**
 * Central output dispatcher.
 *
 * Routes to the right formatter based on the requested output format.
 */

import {
	formatCompactCount,
	formatCompactItem,
	formatCompactList,
	type PaginationMeta
} from './compact'
import { formatCSV, formatTSV } from './csv'
import { type FieldSelector, getDefaultFields, selectFields } from './fields'
import { formatJSON, formatJSONL, formatJSONList } from './json'
import { formatTable, formatTableItem } from './table'

export type OutputFormat =
	| 'table'
	| 'compact'
	| 'json'
	| 'jsonl'
	| 'csv'
	| 'tsv'
	| 'id'
	| 'count'

export interface OutputOptions {
	format: OutputFormat
	fields?: string[]
	detail?: boolean
	quiet?: boolean
	noColor?: boolean
}

export function resolveFormat(
	explicit?: string,
	envVar?: string,
	isTTY?: boolean
): OutputFormat {
	if (explicit) return explicit as OutputFormat
	if (envVar) return envVar as OutputFormat
	return isTTY ? 'table' : 'compact'
}

export function formatList(
	resourceType: string,
	items: Record<string, unknown>[],
	pagination: PaginationMeta,
	options: OutputOptions
): string {
	const defaultFields = getDefaultFields(resourceType)
	const fieldSelector: FieldSelector = options.fields ?? defaultFields

	// Apply field selection for human-readable formats; machine-readable
	// formats preserve all fields unless the user explicitly requested a subset.
	const filtered = items.map(item =>
		selectFields(item as Record<string, unknown>, fieldSelector)
	)
	const useFiltered = options.fields != null

	switch (options.format) {
		case 'count':
			return formatCompactCount(pagination.totalCount)
		case 'id':
			return items
				.map((item: Record<string, unknown>) => item.id)
				.join('\n')
		case 'json':
			return formatJSONList(useFiltered ? filtered : items, pagination)
		case 'jsonl':
			return formatJSONL(useFiltered ? filtered : items)
		case 'csv':
			return formatCSV(
				useFiltered
					? (filtered as Record<string, unknown>[])
					: (items as Record<string, unknown>[])
			)
		case 'tsv':
			return formatTSV(
				useFiltered
					? (filtered as Record<string, unknown>[])
					: (items as Record<string, unknown>[])
			)
		case 'table':
			return formatTable(filtered as Record<string, unknown>[], {
				noColor: options.noColor
			})
		default:
			return formatCompactList(
				resourceType,
				{ items: filtered as Record<string, unknown>[], pagination },
				{ fields: options.fields }
			)
	}
}

export function formatItem(
	resourceType: string,
	data: Record<string, unknown>,
	options: OutputOptions
): string {
	const defaultFields = options.detail
		? ('all' as const)
		: (options.fields ?? getDefaultFields(resourceType))
	const filtered = selectFields(data, defaultFields)

	switch (options.format) {
		case 'id':
			return String(data.id ?? '')
		case 'json':
			return formatJSON(
				options.fields || options.detail ? filtered : data
			)
		case 'csv':
			return formatCSV([filtered])
		case 'tsv':
			return formatTSV([filtered])
		case 'table':
			return formatTableItem(resourceType, filtered, {
				noColor: options.noColor
			})
		default:
			return formatCompactItem(resourceType, filtered)
	}
}

export function formatDeleted(
	resourceType: string,
	id: string,
	_data?: Record<string, unknown>,
	options?: OutputOptions
): string {
	const format = options?.format ?? 'compact'
	if (format === 'json')
		return JSON.stringify({ deleted: true, id, type: resourceType })
	if (format === 'id') return id
	return `deleted ${resourceType} id=${id}`
}

export type { PaginationMeta } from './compact'
