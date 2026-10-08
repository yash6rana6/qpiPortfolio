import { startWorker } from './lib/worker'

// Starts the BullMQ worker inside the same process, so a free single-server
// deploy needs nothing extra. Set ENABLE_WORKER=false on web-only instances
// if you run workers somewhere else.
if (process.env.ENABLE_WORKER !== 'false') {
  startWorker()
}
