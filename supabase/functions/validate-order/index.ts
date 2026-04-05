import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Hello from validate-order Edge Function!')

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { 'x-my-custom-header': 'validate-order' } } }
  )

  try {
    const { validation_token } = await req.json()

    if (!validation_token) {
      return new Response(JSON.stringify({ error: 'validation_token is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Find the order with the given validation_token and status 'pending_validation'
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, order_items(*, menu_items(*, production_recipes(*, products(*))))')
      .eq('validation_token', validation_token)
      .eq('status', 'pending_validation')
      .single()

    if (orderError || !order) {
      console.error('Order not found or not in pending_validation status:', orderError)
      return new Response(JSON.stringify({ error: 'Order not found or already validated' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 2. Update order status to 'preparing' and set paid status (since payment is external)
    const { error: updateOrderError } = await supabaseClient
      .from('orders')
      .update({ status: 'preparing', paid_at: new Date().toISOString() })
      .eq('id', order.id)

    if (updateOrderError) {
      console.error('Error updating order status:', updateOrderError)
      return new Response(JSON.stringify({ error: 'Failed to update order status' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 3. Deduct stock based on production_recipes
    for (const item of order.order_items) {
      for (const recipe of item.menu_items.production_recipes) {
        const { error: stockError } = await supabaseClient
          .from('stock_movements')
          .insert({
            product_id: recipe.product_id,
            quantity: -(recipe.quantity * item.quantity), // Deduct stock
            movement_type: 'out',
            order_item_id: item.id,
            description: `Dedução por pedido #${order.id}`,
          })
        if (stockError) {
          console.error('Error deducting stock:', stockError)
          // Potentially revert order status or log for manual intervention
        }
      }
    }

    // 4. Update session_client total_spent (assuming it's a trigger or view for real-time)
    // If not, a direct update here would be needed:
    // const { error: updateSessionClientError } = await supabaseClient
    //   .rpc('update_session_client_total_spent', { client_id: order.session_client_id });
    // if (updateSessionClientError) { console.error('Error updating session_client total_spent:', updateSessionClientError); }

    // 5. Publish real-time updates (Supabase Realtime handles this automatically on table changes)

    return new Response(JSON.stringify({ message: 'Order validated and stock deducted successfully', orderId: order.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in validate-order function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
