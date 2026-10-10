function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-js')) return resolve(true)
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Creates the order (server decides the amount), opens Razorpay, verifies on success.
 * Callbacks: onPaid(result) · onCancel() · onError(message)
 */
export async function startCheckout({ eventId, seats, seatNumbers, user, onPaid, onCancel, onError }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) return onError('The payment window could not load. Check your connection and try again.')

  try {
    const res = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, seats, seatNumbers })
    })
    const order = await res.json()
    if (!res.ok) {
      if (order.code === 'EMAIL_NOT_VERIFIED') {
        const back = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?verify=1&next=${back}`
        return
      }
      throw new Error(order.error || 'Booking could not be started')
    }

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'QPIE',
      description: `${seatNumbers?.length ? seatNumbers.join(', ') : `${seats} seat${seats > 1 ? 's' : ''}`} · ${order.eventTitle}`,
      prefill: { name: user.name, email: user.email, contact: user.phone || '' },
      theme: { color: '#FF6B5B' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/v1/bookings/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          })
          const result = await verifyRes.json()
          if (!verifyRes.ok) throw new Error(result.error || 'Payment could not be confirmed')
          onPaid(result)
        } catch (err) {
          onError(err.message)
        }
      },
      modal: {
        ondismiss: () => {
          // free the held seats right away
          fetch('/api/v1/bookings/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ razorpay_order_id: order.orderId })
          }).catch(() => {})
          onCancel()
        }
      }
    })

    razorpay.on('payment.failed', (r) => onError(r?.error?.description || 'The payment did not go through.'))
    razorpay.open()
  } catch (err) {
    onError(err.message)
  }
}
