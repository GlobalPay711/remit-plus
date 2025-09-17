// /api/create-checkout-session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { amount_usd, sender_email, receiver_name, payout_method, receiver_account, notes } = req.body || {};
  if (!amount_usd || amount_usd < 5) return res.status(400).send('Minimum amount is $5');
  if (!sender_email || !receiver_name || !payout_method || !receiver_account) return res.status(400).send('Missing required fields');

  try {
    const amountInCents = Math.round(Number(amount_usd) * 100);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: sender_email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Remittance to ${receiver_name} (${payout_method})` },
          unit_amount: amountInCents
        },
        quantity: 1
      }],
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        sender_email,
        receiver_name,
        payout_method,
        receiver_account,
        notes: notes || ''
      }
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || 'Internal error');
  }
};
