-- ============================================================================
-- NOLOJIA ISP PLATFORM
-- M-Pesa STK Push Transactions Schema
-- Migration: 011_mpesa_stk_transactions.sql
-- ============================================================================

-- Create table for tracking STK Push transactions
CREATE TABLE IF NOT EXISTS mpesa_stk_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer relationship
    customer_id UUID REFERENCES landlord_customers(id) ON DELETE SET NULL,
    landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,
    
    -- Transaction details
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    
    -- M-Pesa identifiers
    checkout_request_id VARCHAR(100) UNIQUE,
    merchant_request_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(50),
    
    -- Result information
    result_code INTEGER,
    result_description TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'timeout')),
    
    -- Link to payment record (after successful payment)
    payment_id UUID REFERENCES landlord_payments(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stk_checkout_request ON mpesa_stk_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_stk_customer ON mpesa_stk_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stk_landlord ON mpesa_stk_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_stk_status ON mpesa_stk_transactions(status);
CREATE INDEX IF NOT EXISTS idx_stk_created ON mpesa_stk_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stk_receipt ON mpesa_stk_transactions(mpesa_receipt_number);

-- Auto-update updated_at
CREATE TRIGGER update_mpesa_stk_transactions_updated_at 
    BEFORE UPDATE ON mpesa_stk_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE mpesa_stk_transactions ENABLE ROW LEVEL SECURITY;

-- Nolojia admins can manage all STK transactions
CREATE POLICY "Nolojia admins can manage stk transactions" ON mpesa_stk_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM landlord_users lu 
            WHERE lu.id = auth.uid() 
            AND lu.role IN ('super_admin', 'nolojia_staff')
        )
    );

-- Landlords can view their own STK transactions
CREATE POLICY "Landlords can view their stk transactions" ON mpesa_stk_transactions
    FOR SELECT
    USING (
        landlord_id IN (
            SELECT landlord_id FROM landlord_users 
            WHERE id = auth.uid()
        )
    );

-- Service role bypass for API operations
CREATE POLICY "Service role full access to stk transactions" ON mpesa_stk_transactions
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE mpesa_stk_transactions IS 'Tracks M-Pesa STK Push payment transactions initiated by the system';
COMMENT ON COLUMN mpesa_stk_transactions.checkout_request_id IS 'Unique identifier from M-Pesa for tracking the transaction';
COMMENT ON COLUMN mpesa_stk_transactions.status IS 'Transaction status: pending (waiting), completed (successful), failed (rejected/error), cancelled (by user), timeout (no response)';
