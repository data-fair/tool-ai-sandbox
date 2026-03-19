#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

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

// For opencode: merge project opencode.json with sandbox permissions on the host side
const sandboxSettingsDir = join(__dirname, '..', 'sandbox')
let mergedOpencodePath = null
if (command === 'opencode') {
  const projectConfig = join(process.cwd(), 'opencode.json')
  const sandboxConfig = JSON.parse(readFileSync(join(sandboxSettingsDir, 'opencode-settings.json'), 'utf8'))
  const base = existsSync(projectConfig) ? JSON.parse(readFileSync(projectConfig, 'utf8')) : {}
  const merged = deepMerge(base, sandboxConfig)
  mergedOpencodePath = join(tmpdir(), `opencode-sandbox-${process.pid}.json`)
  writeFileSync(mergedOpencodePath, JSON.stringify(merged, null, 2))
}

// Bind mounts
const commonMounts = [
  [process.cwd(), '/workspace', 'z'],
  [`${home}/.gitconfig`, '/home/node/.gitconfig', 'ro'],
  [`${home}/.cache/ms-playwright`, '/home/node/.cache/ms-playwright', 'z']
]

const claudeMounts = [
  [`${home}/.claude`, '/home/node/.claude', 'z'],
  [`${home}/.claude.json`, '/home/node/.claude.json', 'z']
]

const opencodeMounts = [
  [`${home}/.config/opencode`, '/home/node/.config/opencode', 'z'],
  [`${home}/.local/share/opencode`, '/home/node/.local/share/opencode', 'z'],
  [`${home}/.local/state/opencode`, '/home/node/.local/state/opencode', 'z'],
  [`${home}/.cache/opencode`, '/home/node/.cache/opencode', 'z']
]

const mounts = [
  ...commonMounts,
  ...(command === 'claude' ? claudeMounts : []),
  ...(command === 'opencode' ? opencodeMounts : [])
]
if (mergedOpencodePath) {
  mounts.push([mergedOpencodePath, '/workspace/opencode.json', 'ro'])
}

// If the workspace is a git worktree, mount the main repo's .git directory
// so that the gitdir reference resolves inside the container
const dotGitPath = join(process.cwd(), '.git')
if (existsSync(dotGitPath) && statSync(dotGitPath).isFile()) {
  const dotGitContent = readFileSync(dotGitPath, 'utf8').trim()
  const match = dotGitContent.match(/^gitdir:\s*(.+)$/)
  if (match) {
    // e.g. gitdir: /home/alban/repo/.git/worktrees/branch-name
    const gitdir = resolve(process.cwd(), match[1])
    // The main .git dir is two levels up from the worktree gitdir
    // /home/alban/repo/.git/worktrees/branch-name -> /home/alban/repo/.git
    const mainGitDir = resolve(gitdir, '..', '..')
    // Mount the main .git dir at its original host path so the gitdir reference works
    mounts.push([mainGitDir, mainGitDir, 'z'])
  }
}

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

try {
  execFileSync('podman', runArgs, { stdio: 'inherit' })
} finally {
  if (mergedOpencodePath) rmSync(mergedOpencodePath, { force: true })
}

function deepMerge (target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}
