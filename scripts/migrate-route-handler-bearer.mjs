#!/usr/bin/env node
/**
 * Migrates: import + await createClient() → createRouteHandlerClient(paramName)
 * Tracks export async function GET(POST/PATCH/DELETE)(param?) for param name.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      walk(p, acc)
    } else if (name === 'route.ts') acc.push(p)
  }
  return acc
}

const skipRel = (rel) =>
  rel.includes('stripe/webhook') ||
  rel.includes('fansly/webhook') ||
  rel.includes('onlyfans/webhook') ||
  rel.includes('/cron/')

function migrateFile(content, relPath) {
  if (!content.includes("from '@/lib/supabase/server'") || !content.includes('createClient')) {
    return content
  }

  let lines = content.split('\n')
  let handlerParam = null // 'request' | 'req' | null
  const newLines = []

  const exportRe = /^export async function (GET|POST|PUT|PATCH|DELETE)\s*\(\s*([^)]*)\)?\s*\{/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(exportRe)
    if (m) {
      const inner = m[2] || ''
      if (inner.includes('request')) handlerParam = 'request'
      else if (inner.includes('req')) handlerParam = 'req'
      else handlerParam = null
    }

    // Parameterless GET/POST — add request
    if (/^export async function (GET|POST)\(\)\s*\{/.test(line)) {
      newLines.push(line.replace(/^export async function (GET|POST)\(\)/, 'export async function $1(request: NextRequest)'))
      handlerParam = 'request'
      continue
    }

    newLines.push(line)
  }

  let out = newLines.join('\n')

  out = out.replace(
    /import \{ createClient \} from '@\/lib\/supabase\/server'/g,
    "import { createRouteHandlerClient } from '@/lib/supabase/route-handler'",
  )

  // Replace createClient calls with param from last export (simplified: use global state)
  let currentParam = null
  const lines2 = out.split('\n')
  const out2 = []
  for (const line of lines2) {
    const m = line.match(exportRe)
    if (m) {
      const inner = m[2] || ''
      if (inner.includes('request')) currentParam = 'request'
      else if (inner.includes('req')) currentParam = 'req'
      else if (inner.includes('NextRequest') || inner.includes('Request')) {
        currentParam = inner.match(/(\w+)\s*:\s*/) ? inner.match(/(\w+)\s*:\s*/)[1] : 'request'
      } else currentParam = null
    }
    if (line.includes('export async function GET(request: NextRequest)') || line.includes('export async function POST(request: NextRequest)')) {
      currentParam = 'request'
    }
    let l = line
    if (l.includes('await createClient()')) {
      const p = currentParam || 'request'
      l = l.replace(/await createClient\(\)/g, `await createRouteHandlerClient(${p})`)
    }
    out2.push(l)
  }
  out = out2.join('\n')

  // Ensure NextRequest import
  if (out.includes('NextRequest)') && !out.includes('NextRequest') && out.includes('createRouteHandlerClient')) {
    out = `import { NextRequest } from 'next/server'\n` + out
  }
  if (out.includes('request: NextRequest') && !out.match(/import.*NextRequest.*from 'next\/server'/)) {
    if (out.includes("from 'next/server'")) {
      out = out.replace(
        /import \{([^}]+)\} from 'next\/server'/,
        (m, inner) => {
          if (inner.includes('NextRequest')) return m
          return `import { NextRequest, ${inner.trim()} } from 'next/server'`
        },
      )
    } else {
      out = `import { NextRequest } from 'next/server'\n` + out
    }
  }

  return out
}

let changed = 0
for (const file of walk(path.join(root, 'app', 'api'))) {
  const rel = path.relative(root, file)
  if (skipRel(rel)) continue
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('createClient')) continue
  const next = migrateFile(c, rel)
  if (next !== c) {
    fs.writeFileSync(file, next)
    changed++
    console.log('migrated', rel)
  }
}
console.log('done, files changed:', changed)
