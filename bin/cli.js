#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))
const IMAGE = `ghcr.io/data-fair/tool-ai-sandbox:${pkg.version}`
const home = homedir()

// Parse --env/-e flags before the command
const envVarsToForward = []
const args = process.argv.slice(2)
while (args.length > 0) {
  if (args[0] === '--env' || args[0] === '-e') {
    args.shift()
    if (args.length > 0) envVarsToForward.push(args.shift())
  } else {
    break
  }
}

const command = args[0]
const extraArgs = args.slice(1)

if (!command || !['claude', 'opencode', 'shell'].includes(command)) {
  console.error(`Usage: df-ai-sandbox [-e VAR]... {claude|opencode|shell} [args...]

  claude   - Run Claude Code in sandbox
  opencode - Run OpenCode in sandbox
  shell    - Open a bash shell in sandbox

Options:
  -e, --env VAR  Forward an environment variable to the container (repeatable)`)
  process.exit(1)
}

// Pull image if not present locally
try {
  execFileSync('podman', ['image', 'exists', IMAGE], { stdio: 'ignore' })
} catch {
  console.log(`Pulling ${IMAGE}...`)
  execFileSync('podman', ['pull', IMAGE], { stdio: 'inherit' })
}

const runArgs = [
  'run', '--rm', '-it',
  '--network=host',
  '--userns=keep-id'
]

// Forward requested env vars
for (const v of envVarsToForward) {
  if (process.env[v]) {
    runArgs.push('-e', `${v}=${process.env[v]}`)
  }
}

// Bind mounts
const mounts = [
  [process.cwd(), '/workspace', 'Z'],
  [`${home}/.gitconfig`, '/home/node/.gitconfig', 'ro'],
  [`${home}/.claude`, '/home/node/.claude', 'Z'],
  [`${home}/.claude.json`, '/home/node/.claude.json', 'Z'],
  [`${home}/.config/opencode`, '/home/node/.config/opencode', 'Z'],
  [`${home}/.local/share/opencode`, '/home/node/.local/share/opencode', 'Z'],
  [`${home}/.local/state/opencode`, '/home/node/.local/state/opencode', 'Z'],
  [`${home}/.cache/opencode`, '/home/node/.cache/opencode', 'Z'],
  [`${home}/.cache/ms-playwright`, '/home/node/.cache/ms-playwright', 'Z']
]

// Ensure host directories exist for bind mounts
for (const [src, , opts] of mounts) {
  if (opts !== 'ro' && !existsSync(src) && !src.endsWith('.json')) {
    mkdirSync(src, { recursive: true })
  }
}

for (const [src, dest, opts] of mounts) {
  if (existsSync(src)) {
    runArgs.push('-v', `${src}:${dest}:${opts}`)
  }
}

runArgs.push(IMAGE, command, ...extraArgs)

execFileSync('podman', runArgs, { stdio: 'inherit' })
