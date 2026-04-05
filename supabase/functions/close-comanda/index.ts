import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Hello from close-comanda Edge Function!')

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { 'x-my-custom-header': 'close-comanda' } } }
  )

  try {
    const { session_client_id, amount, payment_method, transaction_id } = await req.json()

    if (!session_client_id || !amount || !payment_method) {
      return new Response(JSON.stringify({ error: 'session_client_id, amount, and payment_method are required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Get the session_client details
    const { data: sessionClient, error: sessionClientError } = await supabaseClient
      .from('session_clients')
      .select('*, customer_discounts(*)')
      .eq('id', session_client_id)
      .single()

    if (sessionClientError || !sessionClient) {
      console.error('Session client not found:', sessionClientError)
      return new Response(JSON.stringify({ error: 'Session client not found' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 2. Calculate total amount due (sum of all unpaid orders for this session_client)
    const { data: unpaidOrders, error: unpaidOrdersError } = await supabaseClient
      .from('orders')
      .select('total_amount')
      .eq('session_client_id', session_client_id)
      .neq('status', 'paid') // Assuming 'paid' means the order has been settled

    if (unpaidOrdersError) {
      console.error('Error fetching unpaid orders:', unpaidOrdersError)
      return new Response(JSON.stringify({ error: 'Failed to fetch unpaid orders' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    let totalDue = unpaidOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0

    // Apply first visit discount if applicable and not yet applied
    let discountApplied = false;
    if (sessionClient.email && !sessionClient.first_visit_discount_applied && sessionClient.customer_discounts.length === 0) {
      totalDue *= 0.95; // Apply 5% discount
      discountApplied = true;
    }

    // Validate if the provided amount matches the total due (allowing for minor floating point differences)
    if (Math.abs(totalDue - amount) > 0.01) {
      console.warn(`Amount mismatch: Total due ${totalDue}, received ${amount}`)
      // Depending on business logic, this might be an error or just a warning
      // For now, we'll proceed but log the discrepancy
    }

    // Simulate external payment API call
    const paymentStatus = 'approved' // Simulate successful payment
    const externalTransactionId = transaction_id || `ext_close_${Date.now()}`

    // 3. Record the final payment in the 'payments' table
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        session_client_id: session_client_id,
        amount,
        payment_method,
        transaction_id: externalTransactionId,
        status: paymentStatus,
        processed_by: null, // Assuming a system user or later linked to a profile
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error inserting final payment:', paymentError)
      return new Response(JSON.stringify({ error: 'Failed to record final payment' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 4. Update all associated unpaid orders to 'paid'
    const { error: updateOrdersError } = await supabaseClient
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('session_client_id', session_client_id)
      .neq('status', 'paid')

    if (updateOrdersError) {
      console.error('Error updating orders to paid:', updateOrdersError)
      // This might not be a critical error, but should be logged
    }

    // 5. Update session_client status to 'closed' and mark discount as applied
    const updatePayload: { status: string; first_visit_discount_applied?: boolean } = { status: 'closed' };
    if (discountApplied) {
      updatePayload.first_visit_discount_applied = true;
      // Also record the discount in customer_discounts table
      const { error: discountRecordError } = await supabaseClient
        .from('customer_discounts')
        .insert({
          session_client_id: session_client_id,
          discount_percentage: 5,
          applied_at: new Date().toISOString(),
          status: 'applied',
        });
      if (discountRecordError) {
        console.error('Error recording customer discount:', discountRecordError);
      }
    }

    const { error: updateSessionClientStatusError } = await supabaseClient
      .from('session_clients')
      .update(updatePayload)
      .eq('id', session_client_id)

    if (updateSessionClientStatusError) {
      console.error('Error updating session_client status:', updateSessionClientStatusError)
      return new Response(JSON.stringify({ error: 'Failed to update session client status' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ message: 'Comanda closed and payment processed successfully', sessionClientId: session_client_id, paymentId: payment.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in close-comanda function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
