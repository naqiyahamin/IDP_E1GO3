-- Applications: all authenticated (anon) users can read; inserts allowed; updates for status transitions
CREATE POLICY "select_applications" ON applications FOR SELECT TO anon USING (true);
CREATE POLICY "insert_applications" ON applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "update_applications" ON applications FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Equipment rows: read all, update for status changes
CREATE POLICY "select_equipment_rows" ON equipment_rows FOR SELECT TO anon USING (true);
CREATE POLICY "update_equipment_rows" ON equipment_rows FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "insert_equipment_rows" ON equipment_rows FOR INSERT TO anon WITH CHECK (true);

-- Component inventory: read all, update for stock changes
CREATE POLICY "select_component_inventory" ON component_inventory FOR SELECT TO anon USING (true);
CREATE POLICY "update_component_inventory" ON component_inventory FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "insert_component_inventory" ON component_inventory FOR INSERT TO anon WITH CHECK (true);

-- Blacklisted emails: read all, insert/delete for ban/unban
CREATE POLICY "select_blacklisted_emails" ON blacklisted_emails FOR SELECT TO anon USING (true);
CREATE POLICY "insert_blacklisted_emails" ON blacklisted_emails FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "delete_blacklisted_emails" ON blacklisted_emails FOR DELETE TO anon USING (true);

-- Transaction history: read all, insert for completed returns
CREATE POLICY "select_transaction_history" ON transaction_history FOR SELECT TO anon USING (true);
CREATE POLICY "insert_transaction_history" ON transaction_history FOR INSERT TO anon WITH CHECK (true);