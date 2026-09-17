import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="mt-2 text-black/60 dark:text-white/60">Page not found.</p>
      <Link href="/dashboard" className="mt-6 text-sm underline">
        Back to dashboard
      </Link>
    </main>
  );
}
