-- Device code is the durable identity of a machine (billing hook).
-- Pairing window still lives on control_codes; the code itself stays on the device.

alter table control_devices add column if not exists code text;
create unique index if not exists control_devices_code_uidx
  on control_devices (code) where code is not null;
