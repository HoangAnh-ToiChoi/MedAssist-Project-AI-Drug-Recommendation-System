# Phase AI Migration And Seed Checklist

Checklist này dùng cho rollout demo/thử nghiệm thật trên Supabase + backend hiện tại.

## 1. Chuẩn bị

- Xác nhận backend đang dùng đúng `DATABASE_URL` của project Supabase cần rollout.
- Xác nhận đã backup hoặc export schema/data nếu đây không phải môi trường dev.
- Xác nhận `ai-service` và backend đang ở đúng commit chứa:
  - grounded chatbot
  - provider router health
  - `ai_audit_logs`
  - disease graph strict/offline pipeline

## 2. Apply DB migration

Chạy file:

```sql
docs/database/migrations/2026-06-23-ai-audit-logs.sql
```

Trong Supabase SQL Editor, verify:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'ai_audit_logs'
order by ordinal_position;
```

Expected field tối thiểu:

- `user_id`
- `recommendation_id`
- `event_type`
- `provider`
- `status`
- `fallback_used`
- `latency_ms`
- `request_payload`
- `response_payload`
- `error_message`
- `created_at`

## 3. Seed / review artifact gate

Smoke offline:

```bash
node scripts/check-disease-graph-pipeline.js
```

Production-intent review run:

```bash
node scripts/seed-disease-graph-data.js --strict --min-diseases=1000 --min-drugs=1000
```

Mở `data/crawled/disease-graph/scrape_report.json` và chỉ tiếp tục khi:

- `strict_status.passed` là `true`
- `source_coverage.diseases.synthetic_rows` là `0`
- `source_coverage.drugs.synthetic_rows` là `0`
- `warnings` không có source gap không chấp nhận được

## 4. Import checklist

1. Review `diseases_review.csv` và `drugs_review.csv`.
2. Chỉ promote row public/local curated hợp lệ.
3. Không import row có `source_primary=local_synthetic_review`.
4. Resolve `disease_type_code` vào `disease_types.id`.
5. Resolve disease/drug rows vào UUID thật trước khi insert `disease_symptoms` và `disease_drugs`.
6. Giữ public APIs ở vai trò offline seed/sync, không nối vào runtime.

## 5. Backend / AI rollout verify

Chạy:

```bash
cd backend && npm test
cd ../ai-service && python3 -m pytest -q
cd .. && node scripts/check-ai-observability.js
```

Verify runtime:

- `GET /health` của backend trả `services.database`, `services.redis`, `ai`.
- `GET /health` của `ai-service` trả `provider_health`.
- Gọi 1 flow recommendation + explanation.
- Gọi 1 flow grounded chatbot.

## 6. Audit log verify

Sau khi chạy 1 flow explanation và 1 flow chatbot, chạy trong Supabase:

```sql
select event_type, provider, status, fallback_used, latency_ms, created_at
from ai_audit_logs
order by created_at desc
limit 20;
```

Kỳ vọng:

- có record `recommendation_explanation`
- có record `grounded_chatbot`
- `request_payload` / `response_payload` có dữ liệu
- nếu provider lỗi thì `fallback_used = true`

Chạy thêm local audit review report:

```bash
node scripts/report-ai-audit-log.js
```

Kỳ vọng:

- thấy `fallback rate`
- thấy breakdown theo `provider`
- thấy `quality statuses`
- thấy `top errors` để review nhanh trước demo hoặc trước release

## 7. Demo-safe fallback check

- Tắt tạm provider key hoặc đổi `AI_SERVICE_URL` sai trong môi trường dev.
- Verify recommendation/chat vẫn trả fallback an toàn, không vỡ UI.
- Verify audit log vẫn ghi lại fallback metadata nếu DB đã apply migration.
