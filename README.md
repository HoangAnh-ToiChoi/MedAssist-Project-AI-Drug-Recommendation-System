# MedAssist AI

MedAssist AI là hệ thống hỗ trợ gợi ý thuốc tham khảo theo luồng:

`specialty -> disease candidates -> symptoms -> drug recommendations -> AI explanation/chat`

Hệ thống ưu tiên dữ liệu grounded và business rules ở backend. LLM chỉ dùng để diễn giải tự nhiên, không tự ý thêm bệnh hay thuốc ngoài kết quả đã được lọc.

## Thành phần chính

- `frontend/`: React + Vite, giao diện người dùng và chatbot recommendation.
- `backend/`: Node.js + Express, lớp nghiệp vụ chính, auth, recommendation, audit log.
- `ai-service/`: FastAPI, explanation/chat grounded và fallback provider.
- `docs/`: ghi chú phase AI, roadmap và tài liệu bổ sung.

## Luồng demo hiện tại

1. Người dùng đăng nhập.
2. Chọn `specialty` trước.
3. Chọn triệu chứng.
4. Backend suy ra `top diseases` trong phạm vi specialty.
5. Backend lọc thuốc theo disease, symptom, dị ứng, bệnh nền và cảnh báo an toàn.
6. AI tạo explanation/chat dựa trên grounded payload đã được backend kiểm soát.

## Tính năng đã có

- Đăng ký, đăng nhập, refresh token, profile, phân quyền admin.
- Recommendation theo hướng `disease-first`.
- AI explanation và chatbot grounded cho từng recommendation.
- Audit log cho explain/chat.
- Demo scenarios để quay video ổn định.
- AI insights cho admin.

## Tài khoản demo

- User: `demo.medassist@example.com` / `Demo@12345`
- Admin: `admin.medassist@example.com` / `Admin@12345`

## Chạy nhanh local

```bash
# frontend
cd frontend
npm install
npm run dev

# backend
cd backend
npm install
npm run dev

# ai-service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Mặc định frontend local đang dùng proxy sang backend `http://localhost:3001`.

## Test nhanh

```bash
cd frontend && npm run test
cd backend && npm test
cd ai-service && python3 -m pytest -q
```

## Ghi chú dữ liệu

- Disease pipeline đang hướng tới 1000+ diseases từ Clinical Tables + ICD-10.
- Drug pipeline đang hướng tới 1000+ drugs từ RxTerms + RxNorm + openFDA.
- Wikipedia chỉ dùng làm fallback mô tả.
- DrugBank, DAV, CTDbase và các nguồn review khác không phụ thuộc runtime.

## Tài liệu thêm

- Chi tiết phase AI: `docs/README.md`
