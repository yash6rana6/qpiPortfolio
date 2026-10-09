// Runs once when the Next.js server boots. Node-only code lives in
// instrumentation-node.js so the edge bundle never tries to compile it.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/worker')
    startWorker()
  }
}