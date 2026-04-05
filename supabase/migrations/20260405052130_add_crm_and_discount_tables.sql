-- Adiciona a tabela 'payments' para registrar transações de pagamento
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    session_client_id UUID REFERENCES session_clients(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Adiciona a tabela 'customer_discounts' para gerenciar descontos de primeira visita
CREATE TABLE customer_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_client_id UUID REFERENCES session_clients(id) ON DELETE CASCADE,
    discount_percentage NUMERIC(5, 2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adiciona colunas 'email' e 'first_visit_discount_applied' à tabela 'session_clients'
ALTER TABLE session_clients
ADD COLUMN email VARCHAR(255),
ADD COLUMN first_visit_discount_applied BOOLEAN DEFAULT FALSE;

-- Adiciona coluna 'validation_token' à tabela 'orders'
ALTER TABLE orders
ADD COLUMN validation_token UUID DEFAULT uuid_generate_v4();

-- Adiciona coluna 'order_type' à tabela 'orders'
ALTER TABLE orders
ADD COLUMN order_type VARCHAR(50) DEFAULT 'client_app';

-- Adiciona coluna 'print_count' à tabela 'orders' para o print server
ALTER TABLE orders
ADD COLUMN print_count INT DEFAULT 0;

-- Opcional: Adicionar RLS para as novas tabelas e colunas
-- Exemplo de RLS para 'payments' (ajustar conforme a necessidade de segurança)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to payments for authenticated users" ON payments
FOR ALL USING (auth.role() = 'authenticated');

-- Exemplo de RLS para 'customer_discounts' (ajustar conforme a necessidade de segurança)
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to customer_discounts for authenticated users" ON customer_discounts
FOR ALL USING (auth.role() = 'authenticated');

-- Exemplo de RLS para 'session_clients' (ajustar conforme a necessidade de segurança)
CREATE POLICY "Allow update of email and discount status for authenticated users" ON session_clients
FOR UPDATE USING (auth.role() = 'authenticated');

-- Exemplo de RLS para 'orders' (ajustar conforme a necessidade de segurança)
CREATE POLICY "Allow update of validation_token and order_type for authenticated users" ON orders
FOR UPDATE USING (auth.role() = 'authenticated');
