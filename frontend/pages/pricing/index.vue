<template>
  <section class="mx-auto max-w-6xl px-4 py-16 lg:px-8">
    <div class="max-w-3xl">
      <p class="text-sm font-medium uppercase tracking-[0.24em] text-teal-700">Pricing</p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight text-slate-950">第一版价格页先做到清晰可信，不做无法保证准确的花哨展示。</h1>
      <p class="mt-4 text-lg leading-8 text-slate-600">
        目前价格与套餐以控制台中的实际订阅、额度和调用明细为准。这个页面保留公开说明，避免上线初期因为静态价格页失真而造成认知偏差。
      </p>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-2">
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">按实际用量结算</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">控制台会展示调用次数、Token 总量、实际消费和 API Key 粒度的费用归因。</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-slate-950">套餐信息以账单页为准</h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">订阅套餐、有效期、额度窗口和兑换码状态都在登录后的账单页查看。</p>
      </div>
    </div>

    <div class="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
      如果你准备上线公开售卖页面，下一步应当把后端稳定返回的套餐公开字段补齐，再把这页改成真实可营销版本。
    </div>
  </section>
</template>
