import crypto from 'crypto';

async function testFlow() {
  console.log('--- 1. Authenticating test user ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'anas@gmail.com', password: 'anas1234' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error('Login failed: ' + JSON.stringify(loginData));
  console.log('Logged in as:', loginData.user.name, '(' + loginData.user.email + ')');

  console.log('\n--- 2. Clear cart & add ₹2 test item ---');
  await fetch('http://localhost:5000/api/cart', {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });

  // Get test product
  const prodRes = await fetch('http://localhost:5000/api/products/wildtane-mens-access-key-token-2-rupees-test');
  const prodData = await prodRes.json();
  const product = prodData.product;
  console.log('Product retrieved:', product.name, 'Price: ₹' + product.finalPrice, 'Gender:', product.gender);
  const variant = product.variants[0];

  const addRes = await fetch('http://localhost:5000/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      productId: product._id,
      variantId: variant._id,
      quantity: 1,
    }),
  });
  const addData = await addRes.json();
  console.log('Added to cart. Items count:', addData.cart.items.length);

  console.log('\n--- 3. Verify Cart Pricing & Free Shipping ---');
  const cartRes = await fetch('http://localhost:5000/api/cart', { headers: { Cookie: cookie } });
  const cartData = await cartRes.json();
  console.log('Cart data keys:', Object.keys(cartData), JSON.stringify(cartData, null, 2));

  console.log('\n--- 4. Initiate Razorpay Payment Session ---');
  const initRes = await fetch('http://localhost:5000/api/orders/initiate-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ shippingMethod: 'standard' }),
  });
  const initData = await initRes.json();
  console.log('Initiate response:');
  console.log('  Success:', initData.success);
  console.log('  Key ID:', initData.keyId);
  console.log('  Gateway Order ID:', initData.gatewayOrder?.id);
  console.log('  Amount (paise):', initData.gatewayOrder?.amount);
  console.log('  Currency:', initData.gatewayOrder?.currency);

  if (!initData.success) {
    throw new Error('Initiate payment failed: ' + JSON.stringify(initData));
  }
  if (initData.keyId !== 'rzp_test_TmGYizZLQQ9JrD') {
    throw new Error('Wrong keyId: ' + initData.keyId);
  }
  if (initData.gatewayOrder.amount !== 200) {
    throw new Error('Wrong amount: ' + initData.gatewayOrder.amount + ' (expected 200 paise for ₹2)');
  }
  console.log('Razorpay Order created successfully with LIVE RAZORPAY API! ID:', initData.gatewayOrder.id);

  console.log('\n--- 5. Verify Signature Algorithm with Secret 6fBAQqxydVtZHmj9kPjcMVu7 ---');
  const dummyPaymentId = 'pay_test_' + Date.now();
  const testOrderId = initData.gatewayOrder.id;
  const signaturePayload = `${testOrderId}|${dummyPaymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', '6fBAQqxydVtZHmj9kPjcMVu7')
    .update(signaturePayload)
    .digest('hex');

  // Place order with the verified signature
  const placeRes = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      customer: {
        name: 'Syed Anas',
        email: 'anas@gmail.com',
        phone: { dialCode: '+91', number: '9876543210' },
        country: 'IN',
        nationality: 'IN',
      },
      address: {
        fullName: 'Syed Anas',
        phone: { dialCode: '+91', number: '9876543210' },
        addressLine1: 'Test Boulevard, Suite 2',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
      shippingMethod: 'standard',
      paymentMethod: 'razorpay',
      paymentDetails: {
        razorpayOrderId: testOrderId,
        razorpayPaymentId: dummyPaymentId,
        razorpaySignature: generatedSignature,
      },
    }),
  });

  const placeData = await placeRes.json();
  if (!placeData.success || !placeData.order) {
    throw new Error('Order placement failed: ' + JSON.stringify(placeData));
  }
  console.log('\n🎉 SUCCESS: Order placed and verified!');
  console.log('Order Number:', placeData.order.orderId);
  console.log('Payment Status:', placeData.order.paymentStatus);
  console.log('Payment Method:', placeData.order.paymentMethod);
  console.log('Razorpay Order ID:', placeData.order.paymentDetails?.razorpayOrderId);
  console.log('Razorpay Payment ID:', placeData.order.paymentDetails?.razorpayPaymentId);
  console.log('Grand Total Billed: ₹' + placeData.order.grandTotal);
}

testFlow().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
