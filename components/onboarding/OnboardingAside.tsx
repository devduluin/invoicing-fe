/** The teal marketing panel shown beside the wizard on large screens. */
export default function OnboardingAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-10">
      <div className="relative z-10 max-w-sm">
        <h1 className="text-2xl font-bold leading-tight text-primary-foreground text-balance">
          Manage sales &amp; purchase invoices in one platform.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 text-pretty">
          Record transactions, calculate taxes &amp; discounts, and generate standard accounting
          financial reports in real time.
        </p>
      </div>

      <div
        aria-hidden
        className="absolute -top-16 -right-16 z-0 size-56 rounded-full bg-cta/25 blur-2xl"
      />
    </aside>
  );
}
