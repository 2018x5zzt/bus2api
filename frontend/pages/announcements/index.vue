<template>
  <section class="mx-auto max-w-5xl px-4 py-16 lg:px-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-8">
      <h1 class="text-3xl font-semibold text-slate-950">公告会在登录后展示</h1>
      <p class="mt-4 text-sm leading-6 text-slate-600">
        当前公告接口是用户登录态接口，因此公开页先不展示列表。后续如果要对外公开公告，需要单独补公开公告端点。
      </p>
      <NuxtLink to="/auth/login" class="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
        登录查看
      </NuxtLink>
    </div>
  </section>
</template>
