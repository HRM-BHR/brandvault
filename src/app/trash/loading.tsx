export default function TrashLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:py-14" aria-busy="true">
      <div className="mb-8 border-b border-border pb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-7 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-md bg-muted" />
      <p className="mt-4 text-sm text-muted-foreground">Loading Trash…</p>
    </main>
  );
}