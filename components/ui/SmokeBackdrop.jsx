/** Slow-drifting red smoke blobs (classes live in globals.css). */
export default function SmokeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="smoke-blob animate-drift-a absolute -left-[10%] top-[10%] h-[600px] w-[600px]"
        style={{ background: 'radial-gradient(circle, rgba(220,20,60,0.5), transparent 65%)' }}
      />
      <div
        className="smoke-blob animate-drift-b absolute -right-[5%] top-[40%] h-[500px] w-[500px]"
        style={{ background: 'radial-gradient(circle, rgba(255,0,50,0.4), transparent 65%)' }}
      />
      <div
        className="smoke-blob animate-drift-c absolute bottom-[-10%] left-[20%] h-[700px] w-[700px]"
        style={{ background: 'radial-gradient(circle, rgba(180,0,0,0.45), transparent 65%)' }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
    </div>
  )
}
