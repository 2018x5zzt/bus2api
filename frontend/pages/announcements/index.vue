<template>
  <section class="mx-auto max-w-5xl px-4 py-16 lg:px-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-8">
      <h1 class="text-3xl font-semibold text-slate-950">公告会在登录后展示</h1>
      <p class="mt-4 text-sm leading-6 text-slate-600">
        公告内容仅对已登录用户开放。登录后可查看系统通知、维护公告和账户相关消息。
      </p>
      <NuxtLink to="/auth/login" class="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
        登录查看
      </NuxtLink>
    </div>
  </section>
</template>
