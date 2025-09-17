// /api/webhook — verify signature with raw body
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Read raw body for signature verification
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
        const md = pi.metadata || {};
        console.log('✅ PAID', {
          id: pi.id,
          amount: session.amount_total,
          currency: session.currency,
          sender_email: md.sender_email || session.customer_details?.email,
          receiver_name: md.receiver_name,
          payout_method: md.payout_method,
          receiver_account: md.receiver_account,
          notes: md.notes || ''
        });
        // TODO: trigger your actual payout workflow here (bank/eSewa/Khalti/IME).
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).send('Webhook handler error');
  }
};
