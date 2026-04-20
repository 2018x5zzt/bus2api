<template>
  <section class="mx-auto max-w-6xl px-4 py-16 lg:px-8">
    <div class="max-w-3xl">
      <p class="text-sm font-medium uppercase tracking-[0.24em] text-teal-700">Quick Start</p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight text-slate-950">先把接入成本降到最低。</h1>
      <p class="mt-4 text-lg leading-8 text-slate-600">
        文档页当前提供最短接入路径。完整文档中心可以后补，但第一版至少要让用户知道如何拿 key、在哪里看账单、如何核对调用记录。
      </p>
    </div>

    <div class="mt-12 grid gap-4 lg:grid-cols-2">
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">1. 登录并创建 API Key</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">进入控制台后，打开 `API Keys` 页面创建密钥。建议按应用或团队拆分 key，方便后续核对成本。</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">2. 用 Usage 页校验调用</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">调用后可在 `调用记录` 页面按模型、日期、API Key 过滤查看详细日志和费用。</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">3. 用账单页检查额度</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">账单页会展示订阅摘要、额度窗口和兑换码记录，先满足运营和用户对账需求。</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">4. 安全策略</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">如果账户启用了 TOTP，可以在安全中心查看状态，并在必要时撤销全部会话。</p>
      </div>
    </div>
  </section>
</template>
