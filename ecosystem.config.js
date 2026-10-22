// PM2 config: `pm2 start ecosystem.config.js`
// Cluster mode = ek instance per process, sab 127.0.0.1:3000 share karte hain (nginx iske aage hai).
// Worker (BullMQ) har instance mein chalta hai; jobs/sweeper dedupe hote hain, to safe hai.
module.exports = {
  apps: [
    {
      name: 'qpie',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      exec_mode: 'cluster',
      instances: Number(process.env.PM2_INSTANCES) || 2,
      max_memory_restart: '800M',
      env: { NODE_ENV: 'production' }
    }
  ]
}