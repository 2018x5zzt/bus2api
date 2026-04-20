import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readSource(relativePath: string) {
  return readFileSync(resolve('/root/bus2api/frontend', relativePath), 'utf8')
}

describe('console balance priority copy', () => {
  it('removes generic overview copy from the dashboard header', () => {
    const consoleIndexPage = readSource('pages/console/index.vue')

    expect(consoleIndexPage.includes('用户控制台总览')).toBe(false)
    expect(consoleIndexPage.includes('这里先聚焦可运营的核心指标')).toBe(false)
    expect(consoleIndexPage.includes('账户余额')).toBe(true)
  })

  it('removes the redundant balance and concurrency summary from the sidebar', () => {
    const consoleLayout = readSource('layouts/console.vue')

    expect(consoleLayout.includes('余额 {{ authStore.user?.balance ?? 0 }} / 并发 {{ authStore.user?.concurrency ?? 0 }}')).toBe(false)
  })
})
