#!/usr/bin/env bun

/**
 * Build script: bundles the CLI into a single Node.js-compatible JS file.
 *
 * Output: dist/polar.js — runs on Node.js 18+ (no Bun required for end users).
 * Also generates standalone binaries for GitHub releases.
 */

import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const DIST = 'dist'

if (!existsSync(DIST)) {
	mkdirSync(DIST, { recursive: true })
}

console.log('Building Node.js bundle...')

const result = await Bun.build({
	entrypoints: ['bin/polar.ts'],
	outdir: DIST,
	target: 'node',
	minify: true,
	naming: 'polar.js'
})

if (!result.success) {
	console.error('Build failed:')
	for (const log of result.logs) {
		console.error(log)
	}
	process.exit(1)
}

// Prepend Node.js shebang and strip any bun shebangs from the bundle
const bundlePath = `${DIST}/polar.js`
let content = await Bun.file(bundlePath).text()
content = content.replace(/^#!\/usr\/bin\/env bun\n?/gm, '')
writeFileSync(bundlePath, `#!/usr/bin/env node\n${content}`)
chmodSync(bundlePath, 0o755)

const size = ((await Bun.file(bundlePath).size) / 1024).toFixed(0)
console.log(`  dist/polar.js  ${size} KB`)
console.log('Done.')
