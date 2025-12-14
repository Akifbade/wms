UPDATE shipments SET status='IN_WAREHOUSE' WHERE status='IN_STORAGE';
SELECT COUNT(*) as updated FROM shipments WHERE status='IN_WAREHOUSE';
