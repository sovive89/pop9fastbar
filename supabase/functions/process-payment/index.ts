import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Hello from process-payment Edge Function!')

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { 'x-my-custom-header': 'process-payment' } } }
  )

  try {
    const { order_id, direct_sale_id, amount, payment_method, transaction_id } = await req.json()

    if (!amount || !payment_method) {
      return new Response(JSON.stringify({ error: 'Amount and payment_method are required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Simulate external payment API call
    // In a real scenario, this would involve calling a payment gateway API
    // and handling its response (success, failure, pending)
    const paymentStatus = 'approved' // Simulate successful payment
    const externalTransactionId = transaction_id || `ext_${Date.now()}`

    // 1. Record the payment in the 'payments' table
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        order_id: order_id || null,
        session_client_id: null, // This would be set if closing a comanda
        amount,
        payment_method,
        transaction_id: externalTransactionId,
        status: paymentStatus,
        processed_by: null, // Assuming a system user or later linked to a profile
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error inserting payment:', paymentError)
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 2. Handle direct sales (no comanda, immediate stock deduction)
    if (direct_sale_id) {
      // Assuming direct_sale_id refers to a temporary order created for direct sales
      const { data: directSaleOrder, error: directSaleOrderError } = await supabaseClient
        .from('orders')
        .select('*, order_items(*, menu_items(*, production_recipes(*, products(*))))')
        .eq('id', direct_sale_id)
        .single()

      if (directSaleOrderError || !directSaleOrder) {
        console.error('Direct sale order not found:', directSaleOrderError)
        return new Response(JSON.stringify({ error: 'Direct sale order not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      // Update order status to paid and completed
      const { error: updateOrderError } = await supabaseClient
        .from('orders')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', directSaleOrder.id)

      if (updateOrderError) {
        console.error('Error updating direct sale order status:', updateOrderError)
        return new Response(JSON.stringify({ error: 'Failed to update direct sale order status' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      // Deduct stock for direct sale
      for (const item of directSaleOrder.order_items) {
        for (const recipe of item.menu_items.production_recipes) {
          const { error: stockError } = await supabaseClient
            .from('stock_movements')
            .insert({
              product_id: recipe.product_id,
              quantity: -(recipe.quantity * item.quantity), // Deduct stock
              movement_type: 'out',
              order_item_id: item.id,
              description: `Dedução por venda direta #${directSaleOrder.id}`,
            })
          if (stockError) {
            console.error('Error deducting stock for direct sale:', stockError)
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Payment processed successfully', paymentId: payment.id, status: paymentStatus }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in process-payment function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
