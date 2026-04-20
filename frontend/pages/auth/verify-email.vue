<template>
  <section class="mx-auto max-w-3xl px-4 py-16 lg:px-8">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm uppercase tracking-[0.24em] text-teal-700">Verify Email</p>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">邮箱验证</h1>
      <p class="mt-4 text-sm leading-7 text-slate-600">
        当前后端合同里没有单独的邮箱验证落地接口，这个页面先作为邮件跳转落点和状态说明页保留。注册时如果后端开启验证码验证，实际验证会在注册表单中完成。
      </p>
      <div class="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
        如果你已经收到验证邮件或验证码，请返回注册页继续完成流程；如果仍未收到，请稍后重试或联系管理员排查发信配置。
      </div>
      <div class="mt-6 flex gap-3">
        <NuxtLink to="/auth/register" class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">返回注册</NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700">去登录</NuxtLink>
      </div>
    </div>
  </section>
</template>
