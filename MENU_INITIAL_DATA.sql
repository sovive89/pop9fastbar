-- SCRIPT DE CARDÁPIO INICIAL - PØP9 BAR
-- Copie e cole este script no SQL Editor do seu Supabase APÓS rodar o DATABASE_SETUP.sql

-- 1. Inserir Categorias Base
INSERT INTO menu_categories (name, icon, display_order) VALUES 
('CERVEJAS', 'Beer', 1),
('DRINKS', 'GlassWater', 2),
('BEBIDAS', 'CupSoda', 3),
('PETISCOS', 'Utensils', 4);

-- 2. Inserir Itens de Exemplo (Buscando IDs das categorias criadas)
DO $$ 
DECLARE 
    cat_cerveja UUID;
    cat_drink UUID;
    cat_bebida UUID;
    cat_petisco UUID;
BEGIN
    SELECT id INTO cat_cerveja FROM menu_categories WHERE name = 'CERVEJAS' LIMIT 1;
    SELECT id INTO cat_drink FROM menu_categories WHERE name = 'DRINKS' LIMIT 1;
    SELECT id INTO cat_bebida FROM menu_categories WHERE name = 'BEBIDAS' LIMIT 1;
    SELECT id INTO cat_petisco FROM menu_categories WHERE name = 'PETISCOS' LIMIT 1;

    -- Cervejas
    INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES 
    (cat_cerveja, 'Heineken 330ml', 'Cerveja Premium Lager', 12.00, true),
    (cat_cerveja, 'Stella Artois 330ml', 'Cerveja Premium Lager', 11.00, true),
    (cat_cerveja, 'Spaten 355ml', 'Cerveja Munich Helles', 10.00, true);

    -- Drinks
    INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES 
    (cat_drink, 'Gin Tônica PØP9', 'Gin, Tônica, Limão Siciliano e Alecrim', 28.00, true),
    (cat_drink, 'Moscow Mule', 'Vodka, Limão, Xarope de Gengibre e Espuma', 32.00, true),
    (cat_drink, 'Negroni Clássico', 'Gin, Campari e Vermute Rosso', 30.00, true);

    -- Bebidas
    INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES 
    (cat_bebida, 'Água Mineral 500ml', 'Com ou sem gás', 5.00, true),
    (cat_bebida, 'Coca-Cola Lata', 'Original ou Zero', 7.00, true),
    (cat_bebida, 'Suco de Laranja', 'Natural e gelado', 10.00, true);

    -- Petiscos
    INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES 
    (cat_petisco, 'Batata Frita PØP9', 'Porção individual crocante com sal e páprica', 22.00, true),
    (cat_petisco, 'Mix de Castanhas', 'Porção de amendoim, castanhas e nozes', 15.00, true);

END $$;
