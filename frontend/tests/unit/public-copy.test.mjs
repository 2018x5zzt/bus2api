import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(currentDir, '../..')

function readPage(relativePath) {
  return readFileSync(resolve(frontendRoot, relativePath), 'utf8')
}

test('user-facing pages do not ship internal implementation notes', () => {
  const indexPage = readPage('pages/index.vue')
  const modelsPage = readPage('pages/models/index.vue')
  const pricingPage = readPage('pages/pricing/index.vue')
  const loginPage = readPage('pages/auth/login.vue')
  const registerPage = readPage('pages/auth/register.vue')
  const verifyEmailPage = readPage('pages/auth/verify-email.vue')
  const announcementsPage = readPage('pages/announcements/index.vue')
  const announcementDetailPage = readPage('pages/announcements/[id].vue')
  const keysPage = readPage('pages/console/keys/index.vue')
  const usagePage = readPage('pages/console/usage/index.vue')
  const securityPage = readPage('pages/console/security.vue')

  assert.equal(indexPage.includes('现在的目标不是重做炫酷官网'), false)
  assert.equal(indexPage.includes('最短时间内具备可登录、可管理、可查账的前端'), false)
  assert.equal(indexPage.includes('OpenAI 兼容接口'), true)

  assert.equal(modelsPage.includes('当前前台先强调能力边界'), false)
  assert.equal(modelsPage.includes('等主链稳定后'), false)
  assert.equal(modelsPage.includes('统一接入多家模型能力'), true)

  assert.equal(pricingPage.includes('第一版价格页先做到清晰可信'), false)
  assert.equal(pricingPage.includes('如果你准备上线公开售卖页面'), false)
  assert.equal(pricingPage.includes('价格、额度与消费记录保持清晰透明'), true)

  assert.equal(loginPage.includes('先把最常用的登录链路做稳'), false)
  assert.equal(loginPage.includes('不再依赖旧前端本地存 token 的方式'), false)
  assert.equal(loginPage.includes('登录后继续管理你的 API 与账单'), true)

  assert.equal(registerPage.includes('公开注册先做基础闭环'), false)
  assert.equal(registerPage.includes('这里直接对接当前后端的注册能力'), false)
  assert.equal(registerPage.includes('创建账户，开始接入与管理 API'), true)

  assert.equal(verifyEmailPage.includes('当前后端合同里没有单独的邮箱验证落地接口'), false)
  assert.equal(verifyEmailPage.includes('用于承接邮件跳转，并提示下一步操作'), true)

  assert.equal(announcementsPage.includes('当前公告接口是用户登录态接口'), false)
  assert.equal(announcementsPage.includes('公告内容仅对已登录用户开放'), true)

  assert.equal(announcementDetailPage.includes('这个入口保留给控制台内的公告跳转'), false)
  assert.equal(announcementDetailPage.includes('该公告仅对登录用户开放'), true)

  assert.equal(keysPage.includes('第一版先保留最必要的动作'), false)
  assert.equal(keysPage.includes('统一查看、创建、启停和删除 API Key'), true)

  assert.equal(usagePage.includes('MVP 版本先把筛选、分页和详情核对做出来'), false)
  assert.equal(usagePage.includes('快速核对请求详情、Token 用量与实际消费'), true)

  assert.equal(securityPage.includes('现阶段先把 TOTP 状态查看和一键撤销会话做出来'), false)
  assert.equal(securityPage.includes('查看双重验证状态，并在需要时一键撤销全部会话'), true)
})
