# Video Demo Runbook

Mục tiêu: quay video mượt, ít rủi ro, không phụ thuộc hoàn toàn vào data live.

## Phương án quay đề xuất

### Phương án A: quay ổn định bằng preset UI

1. Mở frontend.
2. Vào `/demo-scenarios`.
3. Chọn một kịch bản:
   - `Demo Hô hấp an toàn`
   - `Demo Tiêu hóa có cảnh báo`
4. Hệ thống sẽ nạp `drugSuggestions` vào `localStorage` và chuyển sang `/suggestions`.
5. Quay các phần:
   - specialty-first context
   - matched symptoms
   - top disease candidates
   - recommendation cards
   - grounded explanation
   - disclaimer / warning

Ưu điểm:

- không phụ thuộc provider live
- không phụ thuộc DB disease graph đã seed đủ hay chưa
- UI kể được đầy đủ câu chuyện kiến trúc

### Phương án B: quay thật end-to-end nếu môi trường ổn

Pre-check:

```bash
cd backend && npm test
cd ../ai-service && python3 -m pytest -q
cd .. && node scripts/check-ai-observability.js
```

Khi DB/seed đã đủ:

1. Đăng nhập user demo.
2. Điền profile dị ứng / bệnh nền nếu muốn show safety filtering.
3. Vào `/symptoms`.
4. Chọn specialty.
5. Chọn triệu chứng.
6. Submit.
7. Quay `/suggestions`.

## Narrative khi quay

1. User bắt buộc chọn chuyên khoa trước.
2. Hệ thống suy disease candidates trong phạm vi specialty.
3. Backend lọc thuốc theo dị ứng, bệnh nền, chống chỉ định.
4. `ai-service` chỉ diễn giải từ grounded payload.
5. Nếu provider fail hoặc quality không đạt, hệ thống hạ về fallback an toàn.
6. Audit log lưu explain/chat để truy vết.

## Hai cảnh quay gọn nhất

### Case 1: Hô hấp an toàn

- Chuyên khoa: `Hô hấp`
- Triệu chứng: `Ho`, `Sốt`
- Highlight:
  - disease candidates
  - thuốc còn lại sau lọc
  - explanation grounded

### Case 2: Tiêu hóa có cảnh báo

- Chuyên khoa: `Tiêu hóa`
- Triệu chứng: `Đau bụng`, `Buồn nôn`
- Highlight:
  - danger alert
  - chỉ còn ít thuốc sau lọc
  - disclaimer và escalation note

## Những gì nên tránh lúc quay

- Không phụ thuộc chatbot live nếu chưa chắc auth + recommendation ID thật.
- Không chạy strict seed live trong lúc quay.
- Không demo specialty có coverage disease yếu nếu đi theo luồng live.

## Backup nếu provider lỗi

- Dùng `/demo-scenarios`.
- Hoặc quay trực tiếp trang `/suggestions` sau khi đã nạp preset.
- Nếu cần kể AI fallback, có thể nói rõ:
  - backend authoritative
  - LLM chỉ làm natural explanation
  - fallback deterministic vẫn giữ hệ thống usable.
