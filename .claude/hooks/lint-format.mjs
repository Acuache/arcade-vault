import { execSync } from 'node:child_process'

let input = ''
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  let file
  try {
    file = JSON.parse(input)?.tool_input?.file_path
  } catch {
    process.exit(0)
  }

  if (!file) process.exit(0)

  const ext = file.split('.').pop()?.toLowerCase()
  const prettierExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'md', 'mdx']
  const eslintExts = ['ts', 'tsx', 'js', 'jsx']

  const quoted = `"${file}"`

  if (prettierExts.includes(ext)) {
    try {
      execSync(`npx prettier --write ${quoted}`, { stdio: 'inherit' })
    } catch {
      // No bloquear la operación si Prettier falla.
    }
  }

  if (eslintExts.includes(ext)) {
    try {
      execSync(`npx eslint --fix ${quoted}`, { stdio: 'inherit' })
    } catch {
      // No bloquear la operación si ESLint encuentra errores.
    }
  }

  process.exit(0)
})
