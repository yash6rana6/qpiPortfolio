// Runs once when the Next.js server boots (starts the booking queue worker).
// Keep the Node-only import INSIDE this exact `=== 'nodejs'` block: Next strips it from the edge bundle that way.
// Set ENABLE_WORKER=false on web-only instances if workers run somewhere else.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.ENABLE_WORKER === 'false') return

    const { startWorker } = await import('./lib/worker')
    startWorker()
  }
}
