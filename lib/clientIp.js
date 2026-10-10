export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return (request.headers.get('x-real-ip') || 'unknown').trim()
}
