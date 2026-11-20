-- Rollback of 0031_device_register.sql: drops the register entries table and its guard (the entries are lost; take a dump first).
DROP TRIGGER IF EXISTS asset_register_entry_guard ON app.asset_register_entry;
DROP FUNCTION IF EXISTS app.asset_register_entry_guard();
DROP TABLE IF EXISTS app.asset_register_entry;
