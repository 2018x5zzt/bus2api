import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const currentDir = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(currentDir, '../..')
const runtimeConfigPath = resolve(frontendRoot, 'utils/runtime-config.ts')

async function importRuntimeConfigModule() {
  const source = readFileSync(runtimeConfigPath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: runtimeConfigPath,
  })

  const encoded = Buffer.from(outputText, 'utf8').toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

test('resolvePublicApiBaseUrlEnv prefers the dedicated public api upstream', async () => {
  const runtimeConfig = await importRuntimeConfigModule()

  assert.equal(
    runtimeConfig.resolvePublicApiBaseUrlEnv({
      NUXT_API_PROXY_BASE_URL: 'http://sub2api:8080',
      NUXT_SUB2API_BASE_URL: 'http://enterprise-bff:8090',
    }),
    'http://sub2api:8080',
  )
})

test('resolvePublicApiBaseUrlEnv falls back to the shared backend target', async () => {
  const runtimeConfig = await importRuntimeConfigModule()

  assert.equal(
    runtimeConfig.resolvePublicApiBaseUrlEnv({
      NUXT_SUB2API_BASE_URL: 'http://enterprise-bff:8090',
    }),
    'http://enterprise-bff:8090',
  )
})
