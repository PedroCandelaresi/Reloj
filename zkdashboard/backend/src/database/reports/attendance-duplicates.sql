SELECT
  device_sn,
  user_id,
  "timestamp",
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY id) AS attendance_record_ids,
  MIN(created_at) AS first_created_at,
  MAX(created_at) AS last_created_at
FROM attendance_records
GROUP BY device_sn, user_id, "timestamp"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "timestamp" DESC, device_sn, user_id;
