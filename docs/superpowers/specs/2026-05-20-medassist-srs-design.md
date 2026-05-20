# Tài liệu Đặc tả Yêu cầu Phần mềm (SRS)
# Software Requirements Specification

---

| Thông tin | Chi tiết |
|---|---|
| **Tên dự án** | MedAssist AI — Hệ thống Gợi ý Thuốc Thông minh |
| **Phiên bản** | 1.0 |
| **Ngày tạo** | 20/05/2026 |
| **Nhóm thực hiện** | Nhóm 5 — Đề tài 95 |
| **Trạng thái** | Draft — Chờ phê duyệt hội đồng |
| **Người phê duyệt** | HA (Leader) |

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Mô tả tổng quan hệ thống](#2-mô-tả-tổng-quan-hệ-thống)
3. [Đặc điểm người dùng](#3-đặc-điểm-người-dùng)
4. [Feature List — Danh sách tính năng](#4-feature-list--danh-sách-tính-năng)
5. [Yêu cầu chức năng chi tiết](#5-yêu-cầu-chức-năng-chi-tiết)
6. [User Stories](#6-user-stories)
7. [Yêu cầu phi chức năng](#7-yêu-cầu-phi-chức-năng)
8. [Kiến trúc hệ thống](#8-kiến-trúc-hệ-thống)
9. [Mô hình dữ liệu](#9-mô-hình-dữ-liệu)
10. [Ràng buộc pháp lý & Tuân thủ](#10-ràng-buộc-pháp-lý--tuân-thủ)
11. [Điểm nổi bật & Lợi thế cạnh tranh (USP)](#11-điểm-nổi-bật--lợi-thế-cạnh-tranh-usp)
12. [Phạm vi ngoài hệ thống (Out of Scope)](#12-phạm-vi-ngoài-hệ-thống-out-of-scope)
13. [Bảng tra cứu từ viết tắt](#13-bảng-tra-cứu-từ-viết-tắt)

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu

Tài liệu này là **Đặc tả Yêu cầu Phần mềm (SRS)** cho hệ thống MedAssist AI. Tài liệu mô tả toàn bộ yêu cầu chức năng, phi chức năng, ràng buộc kỹ thuật, và hành vi kỳ vọng của hệ thống. Đây là tài liệu pháp lý nội bộ nhóm và tài liệu nộp đồ án tốt nghiệp.

### 1.2 Phạm vi hệ thống

**MedAssist AI** là một ứng dụng web cho phép người dùng nhập triệu chứng bằng ngôn ngữ tự nhiên và nhận gợi ý thuốc phù hợp từ mô hình AI. Hệ thống cá nhân hóa kết quả dựa trên tiền sử bệnh và danh sách dị ứng thuốc của từng người dùng.

**Phạm vi bao gồm:**
- Ứng dụng web (Frontend React)
- API Backend (Node.js/Express)
- AI Service (Python/FastAPI/scikit-learn)
- Cơ sở dữ liệu (PostgreSQL/Supabase)
- Admin Panel quản lý nội dung

**Phạm vi không bao gồm:**
- Ứng dụng di động (mobile app)
- Tích hợp hệ thống bệnh viện (HIS/EMR)
- Dịch vụ telemedicine
- Thanh toán / thương mại điện tử

### 1.3 Đối tượng tài liệu

- Nhóm phát triển (5 thành viên)
- Giảng viên hướng dẫn và hội đồng phản biện
- Kiểm thử viên (QA)

### 1.4 Tài liệu tham khảo

- IEEE Std 830-1998: Recommended Practice for SRS
- Thông tư 54/2017/TT-BYT — Tiêu chí ứng dụng công nghệ thông tin y tế
- README.md — Tài liệu kiến trúc nội bộ nhóm

---

## 2. Mô tả tổng quan hệ thống

### 2.1 Bối cảnh sản phẩm

Hiện nay, người dân Việt Nam thường tự tra cứu thuốc qua Google hoặc hỏi nhà thuốc mà không có thông tin cá nhân hóa. Điều này dẫn đến nguy cơ:
- Dùng thuốc không phù hợp với tiền sử bệnh
- Không phát hiện tương tác thuốc / dị ứng
- Kết quả tra cứu chung chung, không theo ngữ cảnh cá nhân

**MedAssist AI** giải quyết bài toán này bằng cách kết hợp AI giải thích được (Explainable AI) với hồ sơ sức khỏe cá nhân, cho ra gợi ý thuốc có căn cứ và minh bạch.

### 2.2 Điểm nổi bật (USP)

1. **Cá nhân hóa** — AI tự động đọc tiền sử bệnh và dị ứng để điều chỉnh kết quả
2. **Explainable AI** — Mỗi gợi ý đều có lý do cụ thể: *"Paracetamol phù hợp vì: triệu chứng sốt (mức Vừa) khớp với 3/3 chỉ định chính. Không có chống chỉ định với hồ sơ của bạn."*

### 2.3 Môi trường triển khai

```
Người dùng (Browser)
        │ HTTPS
        ▼
Vercel (Frontend - React static)
        │ REST API
        ▼
Railway (Backend - Node.js :5000)
        │                    │
   HTTP nội bộ          PostgreSQL query
        ▼                    ▼
Railway (AI - FastAPI :8000)   Supabase (PostgreSQL)
                                      ▲
                               Redis (Railway - cache)
```

---

## 3. Đặc điểm người dùng

### 3.1 User — Người dùng thông thường

| Thuộc tính | Mô tả |
|---|---|
| Đối tượng | Bệnh nhân, người tự chăm sóc sức khỏe tại nhà |
| Trình độ kỹ thuật | Cơ bản — biết dùng web, smartphone |
| Mục tiêu | Tra cứu thuốc nhanh, phù hợp với bản thân |
| Nhu cầu chính | Nhập triệu chứng → nhận gợi ý thuốc an toàn, có giải thích |

### 3.2 Admin — Quản trị viên

| Thuộc tính | Mô tả |
|---|---|
| Đối tượng | Dược sĩ / nhân viên quản lý nội dung |
| Trình độ kỹ thuật | Trung bình — biết dùng admin panel |
| Mục tiêu | Duy trì danh mục thuốc và triệu chứng chính xác, cập nhật |
| Quyền hạn | CRUD thuốc, triệu chứng, mapping; xem thống kê |

---

## 4. Feature List — Danh sách tính năng

### Ưu tiên P0 — Bắt buộc có trong MVP

| ID | Tính năng | Mô tả ngắn |
|---|---|---|
| F01 | Đăng ký tài khoản | Email + mật khẩu + xác thực OTP |
| F02 | Đăng nhập | Email/password hoặc Google OAuth |
| F03 | Quên mật khẩu | Reset qua email |
| F04 | Nhập triệu chứng tự do | Gõ text + chọn mức độ Nhẹ/Vừa/Nặng |
| F05 | Gợi ý thuốc bằng AI | ML model trả về danh sách thuốc + confidence |
| F06 | Giải thích lý do gợi ý | Explainable AI — hiển thị tại sao chọn thuốc này |
| F07 | Cảnh báo triệu chứng nguy hiểm | Banner "nên đến bệnh viện" nếu phát hiện triệu chứng nặng |
| F08 | Quản lý tiền sử bệnh | CRUD bệnh mãn tính, thuốc đang dùng, lịch sử chẩn đoán |
| F09 | Quản lý dị ứng thuốc | Thêm/xóa tên thuốc bị dị ứng |
| F10 | Lọc thuốc dị ứng | Ẩn thuốc dị ứng mặc định + nút "Hiển thị thuốc đã lọc" |
| F11 | AI đọc hồ sơ cá nhân | Tự động điều chỉnh kết quả theo tiền sử + dị ứng |
| F12 | Lịch sử tra cứu | Xem lại các phiên tra cứu trong 30 ngày |
| F13 | Export PDF | Xuất kết quả gợi ý ra file PDF |
| F14 | Admin panel — quản lý thuốc | CRUD danh mục thuốc qua UI |
| F15 | Admin panel — quản lý triệu chứng | CRUD danh mục triệu chứng qua UI |
| F16 | Import thuốc hàng loạt | Upload file từ nguồn dữ liệu thuốc VN |
| F17 | Dark mode | Chuyển đổi giao diện sáng/tối |
| F18 | Song ngữ Việt/Anh | Chuyển đổi ngôn ngữ giao diện |
| F19 | In-app notification | Thông báo trong ứng dụng |
| F20 | Disclaimer y tế | Hiển thị "không thay thế bác sĩ" trên mọi trang kết quả |

### Ưu tiên P1 — Nếu còn thời gian

| ID | Tính năng | Mô tả ngắn |
|---|---|---|
| F21 | ML model v2 | Nâng cấp từ rule-based sang ML đầy đủ |
| F22 | Admin dashboard thống kê | Biểu đồ triệu chứng phổ biến, thuốc được gợi ý nhiều |
| F23 | Feedback người dùng | Đánh giá kết quả gợi ý (hữu ích / không hữu ích) |

### Ưu tiên P2 — Không làm trong đồ án này

| ID | Tính năng | Lý do |
|---|---|---|
| F24 | Mobile app | Ngoài phạm vi, tốn thêm stack |
| F25 | Tích hợp HIS/EMR bệnh viện | Yêu cầu pháp lý phức tạp |
| F26 | Thanh toán / freemium | Không phù hợp đồ án học thuật |

---

## 5. Yêu cầu chức năng chi tiết

### 5.1 Xác thực & Tài khoản

#### F01 — Đăng ký tài khoản

**Mô tả:** Người dùng tạo tài khoản mới bằng email và mật khẩu.

**Luồng chính:**
1. Người dùng vào trang `/register`
2. Nhập: họ tên, email, mật khẩu (≥ 8 ký tự, có chữ hoa + số)
3. Hệ thống gửi OTP 6 số về email
4. Người dùng nhập OTP (hết hạn sau 10 phút)
5. Tài khoản được kích hoạt, tự động đăng nhập

**Luồng ngoại lệ:**
- Email đã tồn tại → hiển thị lỗi "Email đã được sử dụng"
- OTP sai → cho nhập lại tối đa 3 lần
- OTP hết hạn → nút "Gửi lại OTP"

---

#### F02 — Đăng nhập

**Mô tả:** Người dùng đăng nhập bằng email/password hoặc Google OAuth.

**Luồng chính (Email):**
1. Nhập email + mật khẩu
2. Hệ thống xác thực, cấp JWT access token (15 phút) + refresh token (7 ngày)
3. Chuyển đến Dashboard

**Luồng chính (Google OAuth):**
1. Nhấn "Đăng nhập với Google"
2. OAuth2 callback, tạo/cập nhật tài khoản
3. Cấp JWT và chuyển đến Dashboard

**Ràng buộc bảo mật:**
- Khóa tài khoản 15 phút sau 5 lần đăng nhập sai liên tiếp
- Refresh token lưu HttpOnly cookie, không localStorage

---

#### F04 — Nhập triệu chứng tự do

**Mô tả:** Người dùng mô tả triệu chứng bằng ngôn ngữ tự nhiên Việt/Anh và chọn mức độ nghiêm trọng.

**Luồng chính:**
1. Người dùng nhập text tự do vào ô input (ví dụ: "tôi bị sốt cao và đau đầu")
2. AI service NLP mapping text → danh sách symptom_id chuẩn hóa
3. Với mỗi triệu chứng được nhận diện, người dùng xác nhận mức độ: **Nhẹ / Vừa / Nặng**
4. Người dùng nhấn "Tìm thuốc phù hợp"

**Ràng buộc:**
- Tối đa 500 ký tự mỗi lần nhập
- AI nhận diện tối thiểu 1 triệu chứng mới xử lý tiếp
- Nếu không nhận diện được triệu chứng → gợi ý "Bạn có thể mô tả chi tiết hơn không?"

---

#### F05 + F06 — Gợi ý thuốc & Giải thích AI

**Mô tả:** AI trả về danh sách thuốc phù hợp kèm lý do giải thích.

**Luồng chính:**
1. Backend gửi request sang AI service:
   ```json
   {
     "symptoms": [{"id": "s001", "name": "sot", "severity": "medium"}],
     "history":  ["tieu_duong"],
     "allergies": ["penicillin"],
     "medications": ["metformin"]
   }
   ```
2. AI service xử lý, trả về:
   ```json
   {
     "recommendations": [
       {
         "drug_id": "d001",
         "drug_name": "Paracetamol 500mg",
         "active_ingredient": "Paracetamol",
         "confidence": 0.87,
         "reason": "Phù hợp với triệu chứng sốt (mức Vừa). Không có tương tác với Metformin. Không trong danh sách dị ứng.",
         "warnings": ["Không dùng quá 8 viên/ngày", "Tránh dùng cùng rượu bia"],
         "contraindications": []
       }
     ],
     "danger_alert": null,
     "engine_version": "ml-v1"
   }
   ```
3. Frontend hiển thị kết quả, thuốc dị ứng ẩn mặc định

**Hiển thị kết quả:**
- Tên thuốc + hoạt chất
- Confidence score (thanh tiến trình %)
- Cảnh báo / chống chỉ định
- Khung giải thích: *"Thuốc này phù hợp vì: [lý do]"*

---

#### F07 — Cảnh báo triệu chứng nguy hiểm

**Mô tả:** Nếu AI phát hiện triệu chứng có thể là dấu hiệu bệnh nguy hiểm, hiển thị banner cảnh báo đỏ trước kết quả.

**Danh sách triệu chứng kích hoạt cảnh báo** (ví dụ):
- Đau ngực + khó thở → Cảnh báo: Có thể là bệnh tim
- Đột ngột tê liệt một bên người → Cảnh báo: Có thể là đột quỵ
- Sốt cao > 39°C kéo dài + phát ban → Cảnh báo: Có thể là nhiễm trùng nặng

**Nội dung banner:**
> ⚠️ **Chú ý:** Các triệu chứng bạn mô tả có thể là dấu hiệu của tình trạng y tế nghiêm trọng. Vui lòng đến cơ sở y tế để được thăm khám. Thông tin gợi ý dưới đây chỉ mang tính tham khảo.

---

#### F08 — Quản lý tiền sử bệnh

**Mô tả:** Người dùng CRUD thông tin sức khỏe cá nhân.

**Loại dữ liệu lưu trữ:**

| Nhóm | Trường | Ví dụ |
|---|---|---|
| Bệnh mãn tính | Tên bệnh, ngày phát hiện | Tiểu đường type 2, 2020 |
| Thuốc đang dùng | Tên thuốc, liều dùng, tần suất | Metformin 500mg × 2 lần/ngày |
| Lịch sử chẩn đoán | Tên bệnh, ngày chẩn đoán, ghi chú | Viêm họng cấp, 15/03/2025 |

---

#### F10 — Lọc thuốc dị ứng

**Mô tả:** Thuốc có trong danh sách dị ứng của người dùng bị ẩn mặc định khỏi kết quả.

**Hành vi:**
- Mặc định: thuốc dị ứng không hiển thị trong danh sách kết quả
- Có nút "Hiển thị X thuốc đã lọc do dị ứng" ở cuối trang kết quả
- Khi nhấn: hiển thị thuốc bị ẩn với badge đỏ **"DỊ ỨNG"**

---

#### F12 — Lịch sử tra cứu

**Mô tả:** Người dùng xem lại các phiên tra cứu trong 30 ngày gần nhất.

**Hiển thị mỗi record:**
- Ngày giờ tra cứu
- Triệu chứng đã nhập
- Số lượng thuốc được gợi ý
- Nút "Xem lại" để mở kết quả

**Tự động xóa:** Record cũ hơn 30 ngày bị xóa theo batch job hàng đêm.

---

#### F14 + F15 — Admin Panel

**Mô tả:** Giao diện web riêng cho Admin tại `/admin`.

**Tính năng Admin:**
- Dashboard: tổng số thuốc, triệu chứng, người dùng, tra cứu hôm nay
- CRUD Thuốc: thêm/sửa/xóa thuốc, nhập hàng loạt từ CSV
- CRUD Triệu chứng: thêm/sửa/xóa triệu chứng
- Mapping thuốc-triệu chứng: thiết lập confidence_score cho từng cặp
- Quản lý người dùng: xem danh sách, khóa/mở tài khoản

---

### 5.2 Yêu cầu bảo mật

| Yêu cầu | Mô tả |
|---|---|
| SEC-01 | JWT access token hết hạn sau 15 phút |
| SEC-02 | Refresh token lưu HttpOnly cookie |
| SEC-03 | Mật khẩu hash bằng bcrypt (cost factor 12) |
| SEC-04 | Rate limiting: 100 req/phút/IP cho API |
| SEC-05 | HTTPS bắt buộc trên production |
| SEC-06 | AI service không expose ra internet — chỉ gọi nội bộ từ Backend |
| SEC-07 | Input sanitization chống SQL injection và XSS |
| SEC-08 | Dữ liệu y tế cá nhân mã hóa at-rest trong DB |

---

## 6. User Stories

### Epic 1: Xác thực & Tài khoản

```
US-01 | Đăng ký tài khoản
  As a   người dùng mới
  I want  đăng ký tài khoản bằng email và mật khẩu
  So that tôi có thể lưu hồ sơ sức khỏe và lịch sử tra cứu cá nhân

  Acceptance Criteria:
  - [ ] Form yêu cầu: họ tên, email hợp lệ, mật khẩu ≥ 8 ký tự (chữ hoa + số)
  - [ ] Hệ thống gửi OTP 6 số về email trong vòng 60 giây
  - [ ] OTP hết hạn sau 10 phút
  - [ ] Sau xác thực thành công, tự động đăng nhập và chuyển đến Dashboard
  - [ ] Nếu email đã tồn tại, hiển thị lỗi rõ ràng
```

```
US-02 | Đăng nhập Google
  As a   người dùng
  I want  đăng nhập bằng tài khoản Google
  So that tôi không cần nhớ thêm mật khẩu

  Acceptance Criteria:
  - [ ] Nút "Đăng nhập với Google" trên trang Login
  - [ ] Sau OAuth callback, tạo tài khoản tự động nếu email chưa tồn tại
  - [ ] Chuyển đến Dashboard trong vòng 3 giây
```

```
US-03 | Khóa tài khoản sau đăng nhập sai nhiều lần
  As a   hệ thống
  I want  khóa tài khoản tạm thời sau 5 lần đăng nhập sai
  So that ngăn chặn brute-force attack

  Acceptance Criteria:
  - [ ] Hiển thị đếm ngược "còn X lần thử"
  - [ ] Khóa 15 phút sau lần thứ 5
  - [ ] Email thông báo cho chủ tài khoản khi bị khóa
```

---

### Epic 2: Gợi ý thuốc

```
US-04 | Nhập triệu chứng bằng text tự do
  As a   người dùng
  I want  gõ triệu chứng bằng ngôn ngữ tự nhiên Tiếng Việt
  So that tôi không cần biết tên y học chuyên ngành

  Acceptance Criteria:
  - [ ] Ô input chấp nhận text Việt và Anh
  - [ ] AI nhận diện và hiển thị lại danh sách triệu chứng đã hiểu
  - [ ] Người dùng xác nhận hoặc điều chỉnh danh sách triệu chứng
  - [ ] Người dùng chọn mức độ Nhẹ / Vừa / Nặng cho từng triệu chứng
```

```
US-05 | Nhận gợi ý thuốc có giải thích
  As a   người dùng
  I want  nhận danh sách thuốc phù hợp kèm lý do cụ thể
  So that tôi hiểu tại sao thuốc này được gợi ý và tự tin hơn khi sử dụng

  Acceptance Criteria:
  - [ ] Kết quả hiển thị trong vòng 1 giây
  - [ ] Mỗi thuốc có: tên, hoạt chất, confidence score, lý do gợi ý
  - [ ] Cảnh báo và chống chỉ định hiển thị rõ ràng
  - [ ] Thuốc dị ứng ẩn mặc định
  - [ ] Disclaimer "không thay thế bác sĩ" hiển thị dưới kết quả
```

```
US-06 | Cảnh báo triệu chứng nguy hiểm
  As a   người dùng có triệu chứng nghiêm trọng
  I want  được cảnh báo rõ ràng để đến cơ sở y tế
  So that tôi không bỏ lỡ tình trạng khẩn cấp cần can thiệp y tế

  Acceptance Criteria:
  - [ ] Banner cảnh báo đỏ xuất hiện TRÊN kết quả gợi ý
  - [ ] Nội dung cảnh báo đề cập cụ thể triệu chứng nguy hiểm đã nhập
  - [ ] Banner không thể bị đóng/ẩn
```

```
US-07 | Xem thuốc đã bị lọc do dị ứng
  As a   người dùng
  I want  có thể xem danh sách thuốc bị ẩn do dị ứng khi cần
  So that tôi vẫn có đầy đủ thông tin để quyết định

  Acceptance Criteria:
  - [ ] Nút "Hiển thị X thuốc đã lọc" cuối trang kết quả
  - [ ] Khi nhấn, thuốc hiện ra với badge đỏ rõ ràng
  - [ ] Mỗi thuốc dị ứng hiển thị tên chất gây dị ứng
```

---

### Epic 3: Hồ sơ sức khỏe

```
US-08 | Quản lý tiền sử bệnh
  As a   người dùng
  I want  thêm, sửa, xóa thông tin bệnh mãn tính và thuốc đang dùng
  So that AI có đủ thông tin để cá nhân hóa gợi ý thuốc

  Acceptance Criteria:
  - [ ] Thêm bệnh mãn tính với tên bệnh + ngày phát hiện
  - [ ] Thêm thuốc đang dùng với tên + liều dùng + tần suất
  - [ ] Thêm lịch sử chẩn đoán với tên bệnh + ngày + ghi chú
  - [ ] Sửa và xóa mọi record
  - [ ] Hiển thị xác nhận trước khi xóa
```

```
US-09 | Quản lý dị ứng thuốc
  As a   người dùng
  I want  khai báo danh sách thuốc tôi bị dị ứng
  So that hệ thống tự động lọc thuốc nguy hiểm khỏi kết quả

  Acceptance Criteria:
  - [ ] Gõ tên thuốc vào ô input để thêm
  - [ ] Autocomplete gợi ý từ danh mục thuốc trong hệ thống
  - [ ] Hiển thị danh sách dị ứng hiện tại dạng tags
  - [ ] Xóa từng tag dễ dàng
```

---

### Epic 4: Lịch sử & Export

```
US-10 | Xem lịch sử tra cứu
  As a   người dùng
  I want  xem lại các lần tra cứu trước trong 30 ngày
  So that tôi có thể theo dõi sức khỏe theo thời gian

  Acceptance Criteria:
  - [ ] Danh sách tra cứu sắp xếp theo thời gian mới nhất
  - [ ] Mỗi record: ngày giờ, triệu chứng tóm tắt, số thuốc gợi ý
  - [ ] Nhấn "Xem lại" để mở đầy đủ kết quả
  - [ ] Record hơn 30 ngày tự động xóa
```

```
US-11 | Export kết quả ra PDF
  As a   người dùng
  I want  xuất kết quả gợi ý ra file PDF
  So that tôi có thể lưu hoặc chia sẻ với bác sĩ/người thân

  Acceptance Criteria:
  - [ ] Nút "Export PDF" trên trang kết quả
  - [ ] PDF gồm: ngày giờ, triệu chứng, danh sách thuốc gợi ý, lý do, disclaimer
  - [ ] PDF có header logo MedAssist và tên người dùng
  - [ ] File tải về trong vòng 3 giây
```

---

### Epic 5: Admin

```
US-12 | Admin quản lý danh mục thuốc
  As an  Admin
  I want  thêm, sửa, xóa thông tin thuốc qua giao diện web
  So that hệ thống luôn có dữ liệu thuốc chính xác và cập nhật

  Acceptance Criteria:
  - [ ] Form thêm thuốc: tên, hoạt chất, nhóm thuốc, cảnh báo, chống chỉ định
  - [ ] Import hàng loạt qua file CSV
  - [ ] Tìm kiếm thuốc theo tên hoặc hoạt chất
  - [ ] Xóa mềm (soft delete) — không xóa khỏi DB
```

```
US-13 | Admin mapping thuốc-triệu chứng
  As an  Admin
  I want  thiết lập mức độ tương quan giữa thuốc và triệu chứng
  So that AI có bộ dữ liệu để tính confidence score chính xác

  Acceptance Criteria:
  - [ ] Chọn thuốc → chọn danh sách triệu chứng liên quan
  - [ ] Gán confidence_score cho từng cặp (0.0 → 1.0)
  - [ ] Lưu thay đổi và cập nhật ngay vào engine
```

---

## 7. Yêu cầu phi chức năng

### 7.1 Hiệu năng

| ID | Yêu cầu | Giá trị |
|---|---|---|
| NFR-P01 | Thời gian phản hồi API gợi ý thuốc | < 1 giây (p95) |
| NFR-P02 | Thời gian load trang đầu tiên (FCP) | < 2 giây |
| NFR-P03 | Số người dùng đồng thời (staging) | 50 người |
| NFR-P04 | Uptime hệ thống | ≥ 99% (môi trường production) |

### 7.2 Bảo mật

| ID | Yêu cầu |
|---|---|
| NFR-S01 | Toàn bộ traffic qua HTTPS/TLS 1.3 |
| NFR-S02 | Mật khẩu không bao giờ lưu plain text |
| NFR-S03 | Token không lưu trong localStorage |
| NFR-S04 | AI service không expose public endpoint |
| NFR-S05 | Audit log cho mọi hành động Admin |

### 7.3 Khả năng sử dụng (Usability)

| ID | Yêu cầu |
|---|---|
| NFR-U01 | Giao diện hỗ trợ tiếng Việt và tiếng Anh |
| NFR-U02 | Hỗ trợ Dark mode và Light mode |
| NFR-U03 | Tương thích browser: Chrome, Firefox, Safari (2 phiên bản mới nhất) |
| NFR-U04 | Tối ưu Desktop (1280px+), responsive cơ bản cho tablet |

### 7.4 Khả năng bảo trì

| ID | Yêu cầu |
|---|---|
| NFR-M01 | Logging tập trung (error + access log) |
| NFR-M02 | API versioning (v1, v2) |
| NFR-M03 | Test coverage ≥ 80% (Backend + AI service) |
| NFR-M04 | Lịch sử recommendations lưu để train ML sau |

---

## 8. Kiến trúc hệ thống

### 8.1 Tổng quan

| Layer | Công nghệ | Vai trò |
|---|---|---|
| Frontend | React.js + TailwindCSS + Axios | Giao diện người dùng |
| Backend API | Node.js + Express.js + JWT | Business logic, xác thực, orchestration |
| AI Service | Python + FastAPI + scikit-learn | ML inference, NLP mapping |
| Database | PostgreSQL (Supabase) | Lưu trữ chính |
| Cache | Redis | Session, rate limiting, cache gợi ý |
| Deploy FE | Vercel | CDN static hosting |
| Deploy BE/AI | Railway | Container hosting |

### 8.2 Nguyên tắc kiến trúc bắt buộc

1. **Frontend không gọi trực tiếp AI service** — luồng bắt buộc: `FE → Backend → AI`
2. **Backend theo pattern 4 tầng:** Route → Controller → Service → Repository
3. **Repository tự viết SQL** — không dùng ORM (Prisma, Sequelize)
4. **Dependency Injection** — mỗi class nhận dependency qua constructor

---

## 9. Mô hình dữ liệu

### 9.1 Danh sách bảng (8 bảng)

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản người dùng (role: user \| admin) |
| `refresh_tokens` | JWT refresh token (expires_at + revoked flag) |
| `symptoms` | Danh mục triệu chứng chuẩn hóa |
| `drugs` | Danh mục thuốc (có contraindications, warnings) |
| `drug_symptoms` | Mapping N-N triệu chứng ↔ thuốc (confidence_score) |
| `patient_history` | Tiền sử bệnh của từng user (bệnh mãn tính, thuốc đang dùng, lịch sử chẩn đoán) |
| `allergies` | Dị ứng thuốc của từng user |
| `recommendations` | Lịch sử AI predict (input/output JSONB, giữ 30 ngày) |

### 9.2 Quan hệ chính

```
users 1──n refresh_tokens
users 1──n patient_history
users 1──n allergies
users 1──n recommendations
symptoms n──n drugs (qua drug_symptoms)
recommendations.input_json ← symptoms[]
recommendations.output_json → drugs[]
```

---

## 10. Ràng buộc pháp lý & Tuân thủ

### 10.1 Quy định áp dụng

| Quy định | Nội dung áp dụng |
|---|---|
| Thông tư 54/2017/TT-BYT | Tiêu chí ứng dụng CNTT trong cơ sở khám chữa bệnh |
| Luật CNTT 2006 | Bảo mật thông tin cá nhân người dùng |
| Nghị định 13/2023/NĐ-CP | Bảo vệ dữ liệu cá nhân |

### 10.2 Disclaimer bắt buộc

Tất cả trang hiển thị kết quả gợi ý phải có nội dung sau:

> **Tuyên bố miễn trách nhiệm:** Thông tin trên MedAssist AI chỉ mang tính chất tham khảo và không thay thế cho tư vấn y tế chuyên nghiệp. Luôn tham khảo ý kiến bác sĩ hoặc dược sĩ trước khi sử dụng bất kỳ loại thuốc nào. MedAssist AI không chịu trách nhiệm về hậu quả phát sinh từ việc sử dụng thông tin trên ứng dụng.

### 10.3 Bảo vệ dữ liệu cá nhân

- Dữ liệu y tế người dùng mã hóa at-rest
- Người dùng có quyền xóa toàn bộ dữ liệu cá nhân (Right to be forgotten)
- Không chia sẻ dữ liệu với bên thứ ba khi chưa có sự đồng ý
- Chính sách bảo mật hiển thị rõ trên trang đăng ký

---

## 11. Điểm nổi bật & Lợi thế cạnh tranh (USP)

| Đối thủ | Hạn chế | MedAssist giải quyết |
|---|---|---|
| Google tra cứu thuốc | Kết quả chung chung, không cá nhân hóa | AI đọc hồ sơ cá nhân → gợi ý phù hợp riêng từng người |
| Website tra cứu dược điển | Chỉ tra tên thuốc, không từ triệu chứng | Nhập triệu chứng tự nhiên → AI mapping → gợi ý |
| Hỏi nhà thuốc | Phụ thuộc kiến thức cá nhân dược sĩ | AI tổng hợp từ toàn bộ knowledge base chuẩn hóa |

**Hai USP cốt lõi:**
1. **Cá nhân hóa thực sự** — không phải "gợi ý chung", mà dựa trên tiền sử + dị ứng của đúng người dùng đó
2. **Explainable AI** — không chỉ đưa kết quả, mà giải thích lý do → người dùng tin tưởng và hiểu hơn

---

## 12. Phạm vi ngoài hệ thống (Out of Scope)

Những tính năng sau **không được phát triển** trong phiên bản đồ án:

| Tính năng | Lý do không làm |
|---|---|
| Mobile app (iOS/Android) | Ngoài scope, tốn thêm tech stack |
| Telemedicine / đặt lịch bác sĩ | Yêu cầu pháp lý riêng, phức tạp |
| Tích hợp HIS/EMR bệnh viện | Tiêu chuẩn HL7/FHIR phức tạp |
| Thanh toán / freemium | Không phù hợp đồ án học thuật |
| React Native / Flutter | Ngoài scope |
| Đề xuất liều dùng cụ thể | Rủi ro pháp lý cao, cần chuyên gia y tế review |

---

## 13. Bảng tra cứu từ viết tắt

| Từ viết tắt | Ý nghĩa |
|---|---|
| SRS | Software Requirements Specification |
| AI | Artificial Intelligence |
| ML | Machine Learning |
| NLP | Natural Language Processing |
| MVP | Minimum Viable Product |
| API | Application Programming Interface |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| CRUD | Create, Read, Update, Delete |
| USP | Unique Selling Proposition |
| FCP | First Contentful Paint |
| HIS | Hospital Information System |
| EMR | Electronic Medical Record |
| TDD | Test-Driven Development |
| p95 | 95th percentile (phân vị thứ 95) |

---

*Tài liệu này được tạo ngày 20/05/2026 bởi Claude Code (Superpowers workflow) dựa trên phiên brainstorming với Leader HA.*
*Phiên bản tiếp theo: Cập nhật sau khi ERD được phê duyệt và Figma wireframe hoàn thành.*
