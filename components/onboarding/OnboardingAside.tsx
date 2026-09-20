/** Brand panel: a restrained blue gradient carrying abstract product UI. Purely decorative and
 *  not connected to any real data. Hidden on small screens (the form is the focus there). */
export default function OnboardingAside() {
  return (
    <aside aria-hidden className="relative m-3 hidden flex-1 overflow-hidden rounded-2xl bg-[linear-gradient(150deg,#3a54d6_0%,#4863e6_45%,#7a8fee_100%)] lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10">
      {/* soft light and grid texture */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 max-w-md text-white">
        <h2 className="font-display text-2xl leading-tight font-semibold text-balance xl:text-[28px]">Invoices, payments and reports in one calm workspace.</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">See what is owed, what is late and what has been paid.</p>
      </div>

      <div className="relative z-10 mx-auto my-6 w-full max-w-[400px]">
        {/* invoice card */}
        <div className="onb-float rounded-xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(15,23,60,0.55)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Invoice</p>
              <p className="font-mono text-sm font-semibold text-slate-900">INV/2026/0004</p>
            </div>
            <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full bg-slate-200" />
            <div className="h-2 w-1/2 rounded-full bg-slate-100" />
          </div>
          <div className="mt-3 divide-y divide-slate-100 rounded-lg bg-slate-50 px-3 text-xs">
            <div className="flex justify-between py-1.5 text-slate-500"><span>Subtotal</span><span className="tabular-nums">Rp 22.500</span></div>
            <div className="flex justify-between py-1.5 text-slate-500"><span>Tax</span><span className="tabular-nums">Rp 2.200</span></div>
            <div className="flex justify-between py-2 font-semibold text-slate-900"><span>Total</span><span className="tabular-nums text-[#3450cc]">Rp 24.700</span></div>
          </div>
        </div>

        {/* floating panels */}
        <div className="onb-float-slow absolute -bottom-12 -left-8 w-44 rounded-lg border border-white/50 bg-white/85 p-3 shadow-[0_14px_30px_-14px_rgba(15,23,60,0.5)] backdrop-blur">
          <p className="text-[11px] font-medium text-slate-500">Outstanding</p>
          <p className="font-display text-base font-semibold tabular-nums text-slate-900">Rp 1.900.000</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
        </div>
        <div className="onb-float-slow absolute -top-5 -left-6 flex items-center gap-2 rounded-full border border-white/50 bg-white/85 py-1.5 pr-3 pl-2 text-xs font-semibold text-slate-800 shadow-[0_10px_24px_-12px_rgba(15,23,60,0.5)] backdrop-blur [animation-delay:-2s]">
          <span className="grid size-5 place-items-center rounded-full bg-primary text-white">✓</span>
          Payment received
        </div>
      </div>

      <p className="relative z-10 text-xs text-white/60">Duluin Invoice</p>
    </aside>
  );
}
