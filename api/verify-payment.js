// Vercel Serverless Function: Payment Verification
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { paymentId, plan } = req.body || {};
    if (!paymentId || typeof paymentId !== 'string') {
      return res.status(400).json({ success: false, message: 'Payment ID is required.' });
    }

    const cleanPaymentId = paymentId.trim();

    // Check if Razorpay API keys are configured in environment
    const rzpKeyId = process.env.RAZORPAY_KEY_ID || process.env.RZP_KEY_ID || process.env.RAZORPAY_KEY;
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RZP_KEY_SECRET || process.env.RAZORPAY_SECRET;

    if (rzpKeyId && rzpKeySecret) {
      const basicAuth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanPaymentId)}`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      });

      if (!rzpRes.ok) {
        return res.status(400).json({ success: false, message: 'Invalid Razorpay Payment ID or payment not found.' });
      }

      const pData = await rzpRes.json();
      if (pData.status !== 'captured') {
        return res.status(400).json({ success: false, message: `Payment is ${pData.status}. Must be captured.` });
      }

      const amountInRupees = Math.round((pData.amount || 0) / 100);
      const days = (amountInRupees >= 90) ? 30 : 7;
      return res.status(200).json({ success: true, days, amount: amountInRupees });
    }

    // Format check fallback
    const isValidIdFormat = /^pay_[a-zA-Z0-9]{14,24}$/.test(cleanPaymentId);
    if (!isValidIdFormat) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay Payment ID format.' });
    }

    const days = (plan === 99 || plan === 59) ? 30 : 7;
    return res.status(200).json({ success: true, days });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification server error.' });
  }
}
