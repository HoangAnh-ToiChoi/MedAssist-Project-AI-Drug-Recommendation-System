# Đặc tả API — MedAssist AI
# API Specification Document

---

| Thông tin | Chi tiết |
|---|---|
| **Tên dự án** | MedAssist AI — Hệ thống Gợi ý Thuốc Thông minh |
| **Phiên bản tài liệu** | 1.0.0 |
| **Phiên bản API** | v1 |
| **Ngày tạo** | 20/05/2026 |
| **Nhóm thực hiện** | Nhóm 5 — Đề tài 95 |
| **Trạng thái** | Draft |
| **Base URL (Production)** | `https://medassist-api.railway.app` |
| **Base URL (Development)** | `http://localhost:5000` |

---

## Mục lục

1. [Tổng quan API](#1-tổng-quan-api)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Mã lỗi](#3-mã-lỗi)
4. [Auth — Xác thực & Tài khoản](#4-auth--xác-thực--tài-khoản)
5. [Symptoms — Triệu chứng](#5-symptoms--triệu-chứng)
6. [Recommendations — Gợi ý thuốc](#6-recommendations--gợi-ý-thuốc)
7. [Patient History — Tiền sử bệnh](#7-patient-history--tiền-sử-bệnh)
8. [Allergies — Dị ứng thuốc](#8-allergies--dị-ứng-thuốc)
9. [Admin](#9-admin)
10. [AI Service Contract (Internal)](#10-ai-service-contract-internal)
11. [Luồng tích hợp](#11-luồng-tích-hợp)
12. [Postman Collection Structure](#12-postman-collection-structure)
13. [Changelog](#13-changelog)

---

## 1. Tổng quan API

### 1.1 Versioning Strategy

API sử dụng **URL Path Versioning**. Phiên bản hiện tại là `v1`, được nhúng trực tiếp trong đường dẫn resource.

```
https://medassist-api.railway.app/api/auth/login
https://medassist-api.railway.app/api/recommendations
```

> Lưu ý: Phiên bản v1 không xuất hiện tường minh trong URL (implicit v1). Khi ra mắt v2, sẽ chuyển sang `/api/v2/...` và duy trì `/api/v1/...` song song trong tối thiểu 6 tháng trước khi deprecate.

### 1.2 Authentication Flow Summary

Hệ thống sử dụng **JWT (JSON Web Token)** theo cơ chế dual-token:

| Token | Thời hạn | Nơi lưu | Mục đích |
|---|---|---|---|
| `accessToken` | 15 phút | Memory / localStorage | Gắn vào mọi request có auth |
| `refreshToken` | 7 ngày | HttpOnly Cookie / localStorage | Lấy accessToken mới |

**Luồng token lifecycle:**

```
[Client] POST /api/auth/login
     → Server trả về { accessToken, refreshToken }
     → Client lưu token

[Client] Request có auth → Header: Authorization: Bearer <accessToken>

[Khi accessToken hết hạn]
[Client] POST /api/auth/refresh { refreshToken }
     → Server trả về { accessToken } mới
     → Client cập nhật accessToken và retry request gốc

[Logout]
[Client] POST /api/auth/logout { refreshToken }
     → Server revoke refreshToken trong DB
```

### 1.3 Rate Limiting

| Loại | Giới hạn | Áp dụng cho |
|---|---|---|
| Toàn bộ API | 100 request/phút/IP | Tất cả endpoint |
| Auth endpoints | 10 request/phút/IP | `/api/auth/login`, `/api/auth/register` |
| AI Recommendation | 20 request/phút/user | `POST /api/recommendations` |

Khi vượt giới hạn, server trả về HTTP `429 Too Many Requests` với header:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716220800
Retry-After: 60
```

### 1.4 Môi trường

| Môi trường | Base URL | Ghi chú |
|---|---|---|
| Production | `https://medassist-api.railway.app` | Railway deployment |
| Development | `http://localhost:5000` | Local server |
| AI Service (Internal) | `http://ai-service:8000` | Chỉ Backend gọi, không public |

---

## 2. Quy ước chung

### 2.1 Request Format

- **Content-Type:** `application/json`
- **Authorization:** `Bearer <accessToken>` (cho endpoint yêu cầu auth)
- **Encoding:** UTF-8

**Ví dụ request headers:**

```
POST /api/recommendations HTTP/1.1
Host: medassist-api.railway.app
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 Response Format

Tất cả response đều theo cấu trúc thống nhất:

```json
{
  "success": true,
  "message": "Mô tả kết quả",
  "data": { }
}
```

| Field | Type | Mô tả |
|---|---|---|
| `success` | `boolean` | `true` nếu thành công, `false` nếu lỗi |
| `message` | `string` | Thông báo ngắn gọn bằng tiếng Việt hoặc tiếng Anh |
| `data` | `object \| array \| null` | Dữ liệu trả về; `null` khi lỗi |

**Response lỗi:**

```json
{
  "success": false,
  "message": "Email đã được sử dụng",
  "data": null,
  "error": {
    "code": "EMAIL_EXISTS",
    "details": "The email address is already registered"
  }
}
```

### 2.3 Pagination Format

Các endpoint trả về danh sách sử dụng pagination theo cấu trúc:

```json
{
  "success": true,
  "message": "Lấy danh sách thành công",
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Query parameters cho pagination:**

| Parameter | Type | Default | Mô tả |
|---|---|---|---|
| `page` | `integer` | `1` | Số trang (bắt đầu từ 1) |
| `limit` | `integer` | `20` | Số item mỗi trang (tối đa 100) |
| `sort` | `string` | `createdAt` | Trường sắp xếp |
| `order` | `string` | `desc` | Hướng sắp xếp: `asc` \| `desc` |

### 2.4 Datetime Format

Tất cả datetime theo chuẩn **ISO 8601** với timezone UTC:

```
2026-05-20T14:30:00.000Z
```

| Format | Ví dụ | Dùng cho |
|---|---|---|
| ISO 8601 UTC | `2026-05-20T14:30:00.000Z` | Tất cả timestamp trong response |
| Date only | `2026-05-20` | Trường chỉ lưu ngày (e.g., `diagnosedAt`) |

### 2.5 UUID Format

Tất cả identifier sử dụng **UUID v4**:

```
550e8400-e29b-41d4-a716-446655440000
```

Các trường ID trong request body hoặc path param luôn là UUID v4 string.

### 2.6 HTTP Methods & Semantics

| Method | Semantics |
|---|---|
| `GET` | Lấy dữ liệu, không thay đổi state |
| `POST` | Tạo resource mới |
| `PUT` | Cập nhật toàn bộ resource |
| `PATCH` | Cập nhật một phần resource |
| `DELETE` | Xóa resource |

---

## 3. Mã lỗi

### 3.1 Bảng mã lỗi đầy đủ

| Error Code | HTTP Status | Message | Khi nào xảy ra |
|---|---|---|---|
| `UNAUTHORIZED` | `401` | Unauthorized — Token không hợp lệ hoặc hết hạn | Gọi endpoint có auth mà không có token hoặc token expired |
| `FORBIDDEN` | `403` | Forbidden — Không có quyền truy cập | Gọi endpoint cần role `admin` với tài khoản thường |
| `NOT_FOUND` | `404` | Resource không tồn tại | ID không tồn tại trong DB, hoặc endpoint path sai |
| `VALIDATION_ERROR` | `422` | Dữ liệu đầu vào không hợp lệ | Request body thiếu field bắt buộc hoặc sai format |
| `EMAIL_EXISTS` | `409` | Email đã được sử dụng | Đăng ký với email đã có tài khoản |
| `OTP_INVALID` | `400` | Mã OTP không đúng hoặc đã hết hạn | Nhập OTP sai hoặc OTP đã quá 10 phút |
| `OTP_EXPIRED` | `400` | Mã OTP đã hết hạn, vui lòng yêu cầu mã mới | OTP quá 10 phút |
| `ACCOUNT_LOCKED` | `423` | Tài khoản bị khóa tạm thời do đăng nhập sai quá nhiều lần | Đăng nhập sai 5 lần liên tiếp, khóa 15 phút |
| `INVALID_CREDENTIALS` | `401` | Email hoặc mật khẩu không đúng | Đăng nhập với thông tin sai |
| `TOKEN_EXPIRED` | `401` | Access token đã hết hạn | accessToken quá 15 phút |
| `REFRESH_TOKEN_INVALID` | `401` | Refresh token không hợp lệ hoặc đã bị thu hồi | refreshToken sai, hết hạn, hoặc đã logout |
| `AI_UNAVAILABLE` | `503` | Dịch vụ AI tạm thời không khả dụng | AI service không phản hồi trong thời gian chờ |
| `AI_TIMEOUT` | `504` | Hết thời gian chờ phản hồi từ AI service | AI service phản hồi chậm hơn 10 giây |
| `RATE_LIMIT_EXCEEDED` | `429` | Quá nhiều request, vui lòng thử lại sau | Vượt rate limit 100 req/phút/IP |
| `INTERNAL_ERROR` | `500` | Lỗi máy chủ nội bộ | Lỗi không xác định ở server |
| `CONFLICT` | `409` | Xung đột dữ liệu | Tạo bản ghi trùng lặp |

### 3.2 Cấu trúc error response chi tiết

```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "password must be at least 8 characters and contain uppercase and number",
    "fields": {
      "password": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và số"
    }
  }
}
```

---

## 4. Auth — Xác thực & Tài khoản

### 4.1 POST /api/auth/register

**Mô tả:** Đăng ký tài khoản mới. Hệ thống gửi OTP 6 số về email, tài khoản chưa được kích hoạt cho đến khi xác thực OTP.

**Auth required:** Không

**Request Headers:**

```
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | `string` | Bắt buộc | 2–100 ký tự, không rỗng |
| `email` | `string` | Bắt buộc | Định dạng email hợp lệ, lowercase |
| `password` | `string` | Bắt buộc | Tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 chữ số |

**Request Body Example:**

```json
{
  "fullName": "Nguyễn Văn An",
  "email": "nguyenvanan@example.com",
  "password": "SecurePass123"
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "nguyenvanan@example.com",
    "otpExpiresAt": "2026-05-20T14:40:00.000Z"
  }
}
```

**Response 409 — Email đã tồn tại:**

```json
{
  "success": false,
  "message": "Email đã được sử dụng",
  "data": null,
  "error": {
    "code": "EMAIL_EXISTS",
    "details": "An account with this email already exists"
  }
}
```

**Response 422 — Validation Error:**

```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "email": "Định dạng email không hợp lệ",
      "password": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và số"
    }
  }
}
```

---

### 4.2 POST /api/auth/verify-otp

**Mô tả:** Xác thực mã OTP 6 số gửi qua email. Sau khi xác thực thành công, tài khoản được kích hoạt và trả về JWT token để tự động đăng nhập.

**Auth required:** Không

**Request Headers:**

```
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | `string` | Bắt buộc | Định dạng email hợp lệ |
| `code` | `string` | Bắt buộc | 6 ký tự số |

**Request Body Example:**

```json
{
  "email": "nguyenvanan@example.com",
  "code": "483921"
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Xác thực OTP thành công. Tài khoản đã được kích hoạt.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBl...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiMWQ...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "Nguyễn Văn An",
      "email": "nguyenvanan@example.com",
      "role": "user",
      "createdAt": "2026-05-20T14:30:00.000Z"
    }
  }
}
```

**Response 400 — OTP không hợp lệ:**

```json
{
  "success": false,
  "message": "Mã OTP không đúng. Bạn còn 2 lần thử.",
  "data": null,
  "error": {
    "code": "OTP_INVALID",
    "attemptsRemaining": 2
  }
}
```

**Response 400 — OTP hết hạn:**

```json
{
  "success": false,
  "message": "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.",
  "data": null,
  "error": {
    "code": "OTP_EXPIRED"
  }
}
```

---

### 4.3 POST /api/auth/login

**Mô tả:** Đăng nhập bằng email và mật khẩu. Trả về access token (15 phút) và refresh token (7 ngày). Tài khoản bị khóa 15 phút sau 5 lần đăng nhập sai liên tiếp.

**Auth required:** Không

**Rate limit đặc biệt:** 10 request/phút/IP

**Request Headers:**

```
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | `string` | Bắt buộc | Định dạng email hợp lệ |
| `password` | `string` | Bắt buộc | Không rỗng |

**Request Body Example:**

```json
{
  "email": "nguyenvanan@example.com",
  "password": "SecurePass123"
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBl...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiMWQ...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "Nguyễn Văn An",
      "email": "nguyenvanan@example.com",
      "role": "user",
      "createdAt": "2026-05-20T14:30:00.000Z"
    }
  }
}
```

**Response 401 — Sai thông tin đăng nhập:**

```json
{
  "success": false,
  "message": "Email hoặc mật khẩu không đúng. Bạn còn 4 lần thử.",
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "attemptsRemaining": 4
  }
}
```

**Response 423 — Tài khoản bị khóa:**

```json
{
  "success": false,
  "message": "Tài khoản bị khóa tạm thời do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  "data": null,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "lockedUntil": "2026-05-20T15:00:00.000Z",
    "retryAfterSeconds": 900
  }
}
```

---

### 4.4 POST /api/auth/refresh

**Mô tả:** Lấy access token mới bằng refresh token còn hiệu lực. Frontend tự động gọi endpoint này khi nhận được lỗi 401.

**Auth required:** Không (sử dụng refreshToken thay thế)

**Request Headers:**

```
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `refreshToken` | `string` | Bắt buộc | JWT string hợp lệ |

**Request Body Example:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiMWQ..."
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Token đã được làm mới",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBl...",
    "expiresIn": 900
  }
}
```

**Response 401 — Refresh token không hợp lệ:**

```json
{
  "success": false,
  "message": "Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  "data": null,
  "error": {
    "code": "REFRESH_TOKEN_INVALID"
  }
}
```

---

### 4.5 POST /api/auth/logout

**Mô tả:** Đăng xuất và thu hồi refresh token khỏi cơ sở dữ liệu. Access token sẽ hết hiệu lực tự nhiên sau 15 phút.

**Auth required:** Không bắt buộc (nhưng nên gắn Bearer token để xác thực chủ sở hữu)

**Request Headers:**

```
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `refreshToken` | `string` | Bắt buộc | JWT string |

**Request Body Example:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiMWQ..."
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Đăng xuất thành công",
  "data": null
}
```

---

### 4.6 GET /api/auth/me

**Mô tả:** Lấy thông tin tài khoản của người dùng đang đăng nhập dựa trên access token.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Nguyễn Văn An",
    "email": "nguyenvanan@example.com",
    "role": "user",
    "isVerified": true,
    "createdAt": "2026-05-20T14:30:00.000Z",
    "updatedAt": "2026-05-20T14:30:00.000Z"
  }
}
```

**Response 401 — Không có hoặc token hết hạn:**

```json
{
  "success": false,
  "message": "Unauthorized — Token không hợp lệ hoặc hết hạn",
  "data": null,
  "error": {
    "code": "UNAUTHORIZED"
  }
}
```

---

## 5. Symptoms — Triệu chứng

### 5.1 GET /api/symptoms

**Mô tả:** Lấy danh sách toàn bộ triệu chứng đã chuẩn hóa trong hệ thống. Dùng cho frontend khi hiển thị danh sách gợi ý, autocomplete.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Default | Mô tả |
|---|---|---|---|
| `search` | `string` | — | Tìm kiếm theo tên triệu chứng |
| `page` | `integer` | `1` | Số trang |
| `limit` | `integer` | `50` | Số item mỗi trang |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy danh sách triệu chứng thành công",
  "data": {
    "items": [
      {
        "id": "s001",
        "name": "sot",
        "displayName": "Sốt",
        "displayNameEn": "Fever",
        "description": "Nhiệt độ cơ thể cao hơn bình thường",
        "category": "general",
        "createdAt": "2026-05-01T00:00:00.000Z"
      },
      {
        "id": "s002",
        "name": "dau_dau",
        "displayName": "Đau đầu",
        "displayNameEn": "Headache",
        "description": "Cảm giác đau hoặc nhức ở vùng đầu",
        "category": "neurological",
        "createdAt": "2026-05-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 120,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 6. Recommendations — Gợi ý thuốc

### 6.1 POST /api/recommendations

**Mô tả:** Gửi mô tả triệu chứng bằng ngôn ngữ tự nhiên để nhận gợi ý thuốc từ AI. Backend sẽ lấy tiền sử bệnh và dị ứng của người dùng rồi gửi sang AI service để xử lý.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `symptomsText` | `string` | Bắt buộc | 10–500 ký tự, không rỗng |

**Request Body Example:**

```json
{
  "symptomsText": "Tôi bị sốt cao khoảng 38.5 độ từ sáng đến giờ, kèm theo đau đầu và mệt mỏi"
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Đã tạo gợi ý thuốc thành công",
  "data": {
    "id": "rec-7f3a9b12-e4d5-4c21-8f6e-2a1b3c4d5e6f",
    "symptomsText": "Tôi bị sốt cao khoảng 38.5 độ từ sáng đến giờ, kèm theo đau đầu và mệt mỏi",
    "recognizedSymptoms": [
      {
        "id": "s001",
        "name": "sot",
        "displayName": "Sốt",
        "severity": "medium"
      },
      {
        "id": "s002",
        "name": "dau_dau",
        "displayName": "Đau đầu",
        "severity": "medium"
      }
    ],
    "dangerAlert": null,
    "recommendations": [
      {
        "rank": 1,
        "drugId": "d001",
        "drugName": "Paracetamol 500mg",
        "activeIngredient": "Paracetamol",
        "drugGroup": "Giảm đau - Hạ sốt",
        "confidence": 0.87,
        "reason": "Phù hợp với triệu chứng sốt (mức Vừa). Không có tương tác với thuốc đang dùng. Không trong danh sách dị ứng.",
        "warnings": [
          "Không dùng quá 8 viên/ngày (4000mg)",
          "Tránh dùng cùng rượu bia"
        ],
        "contraindications": [],
        "isFilteredByAllergy": false
      },
      {
        "rank": 2,
        "drugId": "d002",
        "drugName": "Ibuprofen 400mg",
        "activeIngredient": "Ibuprofen",
        "drugGroup": "NSAIDs",
        "confidence": 0.72,
        "reason": "Có tác dụng hạ sốt và giảm đau đầu. Lưu ý: có tiền sử bệnh dạ dày cần thận trọng.",
        "warnings": [
          "Uống sau ăn để tránh kích ứng dạ dày",
          "Không dùng quá 1200mg/ngày"
        ],
        "contraindications": [],
        "isFilteredByAllergy": false
      }
    ],
    "engineVersion": "ml-v1",
    "createdAt": "2026-05-20T14:30:00.000Z"
  }
}
```

**Response 503 — AI Service không khả dụng:**

```json
{
  "success": false,
  "message": "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.",
  "data": null,
  "error": {
    "code": "AI_UNAVAILABLE",
    "retryAfterSeconds": 30
  }
}
```

**Response 422 — Validation Error:**

```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "symptomsText": "Mô tả triệu chứng phải từ 10 đến 500 ký tự"
    }
  }
}
```

---

### 6.2 GET /api/recommendations

**Mô tả:** Lấy lịch sử gợi ý thuốc của người dùng trong 30 ngày gần nhất. Các record cũ hơn 30 ngày sẽ bị tự động xóa bởi batch job.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Default | Mô tả |
|---|---|---|---|
| `page` | `integer` | `1` | Số trang |
| `limit` | `integer` | `20` | Số item mỗi trang (tối đa 50) |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy lịch sử gợi ý thuốc thành công",
  "data": {
    "items": [
      {
        "id": "rec-7f3a9b12-e4d5-4c21-8f6e-2a1b3c4d5e6f",
        "symptomsText": "Tôi bị sốt cao khoảng 38.5 độ từ sáng đến giờ, kèm theo đau đầu và mệt mỏi",
        "recognizedSymptomsCount": 2,
        "recommendationsCount": 3,
        "dangerAlert": null,
        "createdAt": "2026-05-20T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 6.3 GET /api/recommendations/:id

**Mô tả:** Lấy chi tiết một phiên gợi ý thuốc theo ID. Chỉ trả về record thuộc về người dùng đang đăng nhập.

**Auth required:** Có — Bearer JWT token

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string (UUID)` | ID của recommendation |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy chi tiết gợi ý thuốc thành công",
  "data": {
    "id": "rec-7f3a9b12-e4d5-4c21-8f6e-2a1b3c4d5e6f",
    "symptomsText": "Tôi bị sốt cao khoảng 38.5 độ từ sáng đến giờ, kèm theo đau đầu và mệt mỏi",
    "recognizedSymptoms": [
      {
        "id": "s001",
        "name": "sot",
        "displayName": "Sốt",
        "severity": "medium"
      }
    ],
    "dangerAlert": null,
    "recommendations": [
      {
        "rank": 1,
        "drugId": "d001",
        "drugName": "Paracetamol 500mg",
        "activeIngredient": "Paracetamol",
        "drugGroup": "Giảm đau - Hạ sốt",
        "confidence": 0.87,
        "reason": "Phù hợp với triệu chứng sốt (mức Vừa). Không có tương tác với thuốc đang dùng.",
        "warnings": ["Không dùng quá 8 viên/ngày"],
        "contraindications": [],
        "isFilteredByAllergy": false
      }
    ],
    "engineVersion": "ml-v1",
    "createdAt": "2026-05-20T14:30:00.000Z"
  }
}
```

**Response 404 — Không tìm thấy:**

```json
{
  "success": false,
  "message": "Không tìm thấy gợi ý thuốc với ID này",
  "data": null,
  "error": {
    "code": "NOT_FOUND"
  }
}
```

---

## 7. Patient History — Tiền sử bệnh

### 7.1 GET /api/history

**Mô tả:** Lấy toàn bộ tiền sử bệnh của người dùng đang đăng nhập (bao gồm bệnh mãn tính, thuốc đang dùng, lịch sử chẩn đoán).

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Default | Mô tả |
|---|---|---|---|
| `entryType` | `string` | — | Lọc theo loại: `chronic_disease` \| `current_medication` \| `diagnosis` |
| `page` | `integer` | `1` | Số trang |
| `limit` | `integer` | `20` | Số item mỗi trang |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy tiền sử bệnh thành công",
  "data": {
    "items": [
      {
        "id": "hist-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "entryType": "chronic_disease",
        "title": "Tiểu đường type 2",
        "detail": "Phát hiện năm 2020, đang kiểm soát bằng Metformin",
        "diagnosedAt": "2020-03-15",
        "createdAt": "2026-05-20T10:00:00.000Z",
        "updatedAt": "2026-05-20T10:00:00.000Z"
      },
      {
        "id": "hist-b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "entryType": "current_medication",
        "title": "Metformin 500mg",
        "detail": "2 lần/ngày, uống sau ăn",
        "diagnosedAt": null,
        "createdAt": "2026-05-20T10:05:00.000Z",
        "updatedAt": "2026-05-20T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 7.2 POST /api/history

**Mô tả:** Thêm một mục tiền sử bệnh mới cho người dùng đang đăng nhập.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `entryType` | `string` | Bắt buộc | Một trong: `chronic_disease` \| `current_medication` \| `diagnosis` |
| `title` | `string` | Bắt buộc | 2–200 ký tự |
| `detail` | `string` | Tùy chọn | Tối đa 1000 ký tự |
| `diagnosedAt` | `string (date)` | Tùy chọn | Định dạng `YYYY-MM-DD`, không được ở tương lai |

**Giá trị hợp lệ của `entryType`:**

| Giá trị | Ý nghĩa |
|---|---|
| `chronic_disease` | Bệnh mãn tính |
| `current_medication` | Thuốc đang sử dụng |
| `diagnosis` | Lịch sử chẩn đoán |

**Request Body Example:**

```json
{
  "entryType": "chronic_disease",
  "title": "Tiểu đường type 2",
  "detail": "Phát hiện năm 2020, đang kiểm soát bằng Metformin 500mg x 2 lần/ngày",
  "diagnosedAt": "2020-03-15"
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Thêm tiền sử bệnh thành công",
  "data": {
    "id": "hist-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "entryType": "chronic_disease",
    "title": "Tiểu đường type 2",
    "detail": "Phát hiện năm 2020, đang kiểm soát bằng Metformin 500mg x 2 lần/ngày",
    "diagnosedAt": "2020-03-15",
    "createdAt": "2026-05-20T14:30:00.000Z",
    "updatedAt": "2026-05-20T14:30:00.000Z"
  }
}
```

---

### 7.3 PUT /api/history/:id

**Mô tả:** Cập nhật toàn bộ thông tin một mục tiền sử bệnh. Chỉ cho phép cập nhật record thuộc về người dùng đang đăng nhập.

**Auth required:** Có — Bearer JWT token

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string (UUID)` | ID của history record |

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body Schema:** (giống POST, tất cả field đều required cho PUT)

| Field | Type | Required | Validation |
|---|---|---|---|
| `entryType` | `string` | Bắt buộc | `chronic_disease` \| `current_medication` \| `diagnosis` |
| `title` | `string` | Bắt buộc | 2–200 ký tự |
| `detail` | `string` | Tùy chọn | Tối đa 1000 ký tự |
| `diagnosedAt` | `string (date)` | Tùy chọn | Định dạng `YYYY-MM-DD` |

**Request Body Example:**

```json
{
  "entryType": "chronic_disease",
  "title": "Tiểu đường type 2 (cập nhật)",
  "detail": "Tình trạng ổn định, đã điều chỉnh liều Metformin",
  "diagnosedAt": "2020-03-15"
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Cập nhật tiền sử bệnh thành công",
  "data": {
    "id": "hist-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "entryType": "chronic_disease",
    "title": "Tiểu đường type 2 (cập nhật)",
    "detail": "Tình trạng ổn định, đã điều chỉnh liều Metformin",
    "diagnosedAt": "2020-03-15",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T15:00:00.000Z"
  }
}
```

**Response 404:**

```json
{
  "success": false,
  "message": "Không tìm thấy tiền sử bệnh với ID này",
  "data": null,
  "error": { "code": "NOT_FOUND" }
}
```

---

### 7.4 DELETE /api/history/:id

**Mô tả:** Xóa vĩnh viễn một mục tiền sử bệnh. Chỉ xóa được record thuộc về người dùng đang đăng nhập.

**Auth required:** Có — Bearer JWT token

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string (UUID)` | ID của history record |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Xóa tiền sử bệnh thành công",
  "data": null
}
```

---

## 8. Allergies — Dị ứng thuốc

### 8.1 GET /api/allergies

**Mô tả:** Lấy danh sách tất cả thuốc dị ứng đã khai báo của người dùng đang đăng nhập.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy danh sách dị ứng thuốc thành công",
  "data": {
    "items": [
      {
        "id": "allergy-c3d4e5f6-a7b8-9012-cdef-234567890123",
        "drugName": "Penicillin",
        "createdAt": "2026-05-15T09:00:00.000Z"
      },
      {
        "id": "allergy-d4e5f6a7-b8c9-0123-defa-345678901234",
        "drugName": "Aspirin",
        "createdAt": "2026-05-15T09:05:00.000Z"
      }
    ],
    "total": 2
  }
}
```

---

### 8.2 POST /api/allergies

**Mô tả:** Thêm một loại thuốc vào danh sách dị ứng của người dùng.

**Auth required:** Có — Bearer JWT token

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `drugName` | `string` | Bắt buộc | 2–200 ký tự, không rỗng |

**Request Body Example:**

```json
{
  "drugName": "Penicillin"
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Thêm dị ứng thuốc thành công",
  "data": {
    "id": "allergy-c3d4e5f6-a7b8-9012-cdef-234567890123",
    "drugName": "Penicillin",
    "createdAt": "2026-05-20T14:30:00.000Z"
  }
}
```

**Response 409 — Đã tồn tại:**

```json
{
  "success": false,
  "message": "Thuốc này đã có trong danh sách dị ứng",
  "data": null,
  "error": { "code": "CONFLICT" }
}
```

---

### 8.3 DELETE /api/allergies/:id

**Mô tả:** Xóa một loại thuốc khỏi danh sách dị ứng của người dùng.

**Auth required:** Có — Bearer JWT token

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string (UUID)` | ID của allergy record |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Xóa dị ứng thuốc thành công",
  "data": null
}
```

---

## 9. Admin

> Tất cả endpoint trong section này yêu cầu **role = `admin`**. Người dùng thông thường gọi sẽ nhận lỗi `403 Forbidden`.

**Request Headers chung cho Admin:**

```
Content-Type: application/json
Authorization: Bearer <adminAccessToken>
```

---

### 9.1 GET /api/admin/drugs

**Mô tả:** Lấy danh sách thuốc với pagination và tìm kiếm. Bao gồm cả thuốc đã soft delete (có thể lọc).

**Auth required:** Có — role `admin`

**Query Parameters:**

| Parameter | Type | Default | Mô tả |
|---|---|---|---|
| `page` | `integer` | `1` | Số trang |
| `limit` | `integer` | `20` | Số item mỗi trang |
| `search` | `string` | — | Tìm theo tên thuốc hoặc hoạt chất |
| `includeDeleted` | `boolean` | `false` | Bao gồm thuốc đã soft delete |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy danh sách thuốc thành công",
  "data": {
    "items": [
      {
        "id": "d001",
        "name": "Paracetamol 500mg",
        "activeIngredient": "Paracetamol",
        "drugGroup": "Giảm đau - Hạ sốt",
        "description": "Thuốc giảm đau hạ sốt thông thường",
        "warnings": ["Không dùng quá 8 viên/ngày", "Tránh dùng cùng rượu"],
        "contraindications": ["Suy gan nặng"],
        "isDeleted": false,
        "createdAt": "2026-05-01T00:00:00.000Z",
        "updatedAt": "2026-05-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 350,
      "totalPages": 18,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 9.2 POST /api/admin/drugs

**Mô tả:** Tạo một loại thuốc mới trong hệ thống.

**Auth required:** Có — role `admin`

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | `string` | Bắt buộc | 2–200 ký tự |
| `activeIngredient` | `string` | Bắt buộc | 2–200 ký tự |
| `drugGroup` | `string` | Bắt buộc | 2–100 ký tự |
| `description` | `string` | Tùy chọn | Tối đa 2000 ký tự |
| `warnings` | `string[]` | Tùy chọn | Mảng string, mỗi chuỗi tối đa 500 ký tự |
| `contraindications` | `string[]` | Tùy chọn | Mảng string |

**Request Body Example:**

```json
{
  "name": "Ibuprofen 400mg",
  "activeIngredient": "Ibuprofen",
  "drugGroup": "NSAIDs",
  "description": "Thuốc kháng viêm không steroid, hạ sốt và giảm đau",
  "warnings": [
    "Uống sau ăn để tránh kích ứng dạ dày",
    "Không dùng quá 1200mg/ngày"
  ],
  "contraindications": [
    "Loét dạ dày tá tràng",
    "Suy thận nặng"
  ]
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Tạo thuốc mới thành công",
  "data": {
    "id": "d002",
    "name": "Ibuprofen 400mg",
    "activeIngredient": "Ibuprofen",
    "drugGroup": "NSAIDs",
    "description": "Thuốc kháng viêm không steroid, hạ sốt và giảm đau",
    "warnings": ["Uống sau ăn để tránh kích ứng dạ dày", "Không dùng quá 1200mg/ngày"],
    "contraindications": ["Loét dạ dày tá tràng", "Suy thận nặng"],
    "isDeleted": false,
    "createdAt": "2026-05-20T14:30:00.000Z",
    "updatedAt": "2026-05-20T14:30:00.000Z"
  }
}
```

---

### 9.3 PUT /api/admin/drugs/:id

**Mô tả:** Cập nhật toàn bộ thông tin một loại thuốc.

**Auth required:** Có — role `admin`

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string` | ID của thuốc |

**Request Body Schema:** (giống POST /api/admin/drugs)

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Cập nhật thuốc thành công",
  "data": {
    "id": "d002",
    "name": "Ibuprofen 400mg (cập nhật)",
    "activeIngredient": "Ibuprofen",
    "drugGroup": "NSAIDs",
    "description": "Mô tả đã cập nhật",
    "warnings": ["Uống sau ăn"],
    "contraindications": ["Loét dạ dày tá tràng"],
    "isDeleted": false,
    "updatedAt": "2026-05-20T15:00:00.000Z"
  }
}
```

---

### 9.4 DELETE /api/admin/drugs/:id

**Mô tả:** Soft delete một loại thuốc (đánh dấu `isDeleted = true`, không xóa khỏi DB). Thuốc bị soft delete sẽ không xuất hiện trong gợi ý của AI nhưng vẫn được giữ lại trong DB để tham chiếu lịch sử.

**Auth required:** Có — role `admin`

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string` | ID của thuốc |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Đã xóa thuốc thành công (soft delete)",
  "data": {
    "id": "d002",
    "isDeleted": true,
    "deletedAt": "2026-05-20T15:00:00.000Z"
  }
}
```

---

### 9.5 POST /api/admin/drugs/import

**Mô tả:** Import danh sách thuốc hàng loạt từ file CSV. Trả về kết quả tổng hợp số bản ghi thành công / thất bại.

**Auth required:** Có — role `admin`

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <adminAccessToken>
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `file` | `file` | Bắt buộc | File CSV, tối đa 5MB |

**CSV Format (các cột bắt buộc):**

```csv
name,activeIngredient,drugGroup,description,warnings,contraindications
Paracetamol 500mg,Paracetamol,Giảm đau - Hạ sốt,Thuốc hạ sốt giảm đau,"Không dùng quá 8 viên/ngày;Tránh rượu bia","Suy gan nặng"
```

> Lưu ý: `warnings` và `contraindications` là chuỗi phân cách bằng dấu chấm phẩy `;`.

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Import thuốc hoàn tất",
  "data": {
    "totalRows": 150,
    "imported": 145,
    "skipped": 5,
    "errors": [
      {
        "row": 12,
        "reason": "Thiếu trường activeIngredient"
      },
      {
        "row": 47,
        "reason": "Tên thuốc đã tồn tại trong hệ thống"
      }
    ]
  }
}
```

---

### 9.6 GET /api/admin/symptoms

**Mô tả:** Lấy danh sách tất cả triệu chứng với pagination.

**Auth required:** Có — role `admin`

**Query Parameters:** page, limit, search (giống GET /api/symptoms)

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Lấy danh sách triệu chứng thành công",
  "data": {
    "items": [
      {
        "id": "s001",
        "name": "sot",
        "displayName": "Sốt",
        "displayNameEn": "Fever",
        "description": "Nhiệt độ cơ thể cao hơn bình thường",
        "category": "general",
        "createdAt": "2026-05-01T00:00:00.000Z",
        "updatedAt": "2026-05-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 9.7 POST /api/admin/symptoms

**Mô tả:** Tạo một triệu chứng mới trong hệ thống.

**Auth required:** Có — role `admin`

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | `string` | Bắt buộc | Slug lowercase, dấu gạch dưới, duy nhất (e.g., `dau_dau`) |
| `displayName` | `string` | Bắt buộc | 2–100 ký tự (tiếng Việt) |
| `displayNameEn` | `string` | Tùy chọn | 2–100 ký tự (tiếng Anh) |
| `description` | `string` | Tùy chọn | Tối đa 500 ký tự |
| `category` | `string` | Bắt buộc | `general` \| `neurological` \| `respiratory` \| `gastrointestinal` \| `cardiovascular` \| `musculoskeletal` \| `dermatological` \| `other` |

**Request Body Example:**

```json
{
  "name": "kho_tho",
  "displayName": "Khó thở",
  "displayNameEn": "Shortness of breath",
  "description": "Cảm giác thiếu không khí hoặc khó thở",
  "category": "respiratory"
}
```

**Response 201 — Created:**

```json
{
  "success": true,
  "message": "Tạo triệu chứng mới thành công",
  "data": {
    "id": "s045",
    "name": "kho_tho",
    "displayName": "Khó thở",
    "displayNameEn": "Shortness of breath",
    "description": "Cảm giác thiếu không khí hoặc khó thở",
    "category": "respiratory",
    "createdAt": "2026-05-20T14:30:00.000Z",
    "updatedAt": "2026-05-20T14:30:00.000Z"
  }
}
```

---

### 9.8 PUT /api/admin/symptoms/:id

**Mô tả:** Cập nhật thông tin một triệu chứng.

**Auth required:** Có — role `admin`

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string` | ID của triệu chứng |

**Request Body Schema:** (giống POST /api/admin/symptoms)

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Cập nhật triệu chứng thành công",
  "data": {
    "id": "s045",
    "name": "kho_tho",
    "displayName": "Khó thở (cập nhật)",
    "displayNameEn": "Dyspnea",
    "description": "Mô tả đã cập nhật",
    "category": "respiratory",
    "updatedAt": "2026-05-20T15:00:00.000Z"
  }
}
```

---

### 9.9 DELETE /api/admin/symptoms/:id

**Mô tả:** Xóa một triệu chứng. Lưu ý: không thể xóa triệu chứng đang được liên kết với thuốc trong bảng `drug_symptoms`.

**Auth required:** Có — role `admin`

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `id` | `string` | ID của triệu chứng |

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Xóa triệu chứng thành công",
  "data": null
}
```

**Response 409 — Có ràng buộc:**

```json
{
  "success": false,
  "message": "Không thể xóa triệu chứng này vì đang được liên kết với thuốc trong hệ thống",
  "data": null,
  "error": {
    "code": "CONFLICT",
    "details": "Symptom is referenced by 5 drug mappings"
  }
}
```

---

### 9.10 PUT /api/admin/drugs/:drugId/symptoms

**Mô tả:** Cập nhật toàn bộ danh sách triệu chứng và confidence score cho một loại thuốc. Thao tác này **thay thế hoàn toàn** (overwrite) các mapping cũ.

**Auth required:** Có — role `admin`

**Path Parameters:**

| Parameter | Type | Mô tả |
|---|---|---|
| `drugId` | `string` | ID của thuốc |

**Request Body Schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `mappings` | `array` | Bắt buộc | Mảng object, có thể rỗng để xóa tất cả |
| `mappings[].symptomId` | `string` | Bắt buộc | ID triệu chứng hợp lệ |
| `mappings[].confidenceScore` | `number` | Bắt buộc | Giá trị từ 0.0 đến 1.0 |

**Request Body Example:**

```json
{
  "mappings": [
    {
      "symptomId": "s001",
      "confidenceScore": 0.90
    },
    {
      "symptomId": "s002",
      "confidenceScore": 0.75
    },
    {
      "symptomId": "s010",
      "confidenceScore": 0.60
    }
  ]
}
```

**Response 200 — OK:**

```json
{
  "success": true,
  "message": "Cập nhật mapping thuốc-triệu chứng thành công",
  "data": {
    "drugId": "d001",
    "drugName": "Paracetamol 500mg",
    "mappingsUpdated": 3,
    "mappings": [
      {
        "symptomId": "s001",
        "symptomName": "Sốt",
        "confidenceScore": 0.90
      },
      {
        "symptomId": "s002",
        "symptomName": "Đau đầu",
        "confidenceScore": 0.75
      },
      {
        "symptomId": "s010",
        "symptomName": "Mệt mỏi",
        "confidenceScore": 0.60
      }
    ],
    "updatedAt": "2026-05-20T14:30:00.000Z"
  }
}
```

---

## 10. AI Service Contract (Internal)

> AI Service **không được expose ra internet**. Chỉ Backend gọi nội bộ qua private network Railway.
>
> - **Base URL:** `http://ai-service:8000` (internal Docker network)
> - **Không có authentication** (bảo vệ bằng network isolation)
> - **Timeout mặc định của Backend khi gọi AI:** 10 giây

### 10.1 POST /ai/recommend

**Mô tả:** Nhận danh sách triệu chứng cùng hồ sơ người dùng, trả về danh sách thuốc gợi ý có confidence score và lý do giải thích.

**Request Body Schema:**

| Field | Type | Required | Mô tả |
|---|---|---|---|
| `symptoms_text` | `string` | Bắt buộc | Văn bản triệu chứng gốc từ người dùng |
| `history` | `string[]` | Tùy chọn | Danh sách tên bệnh mãn tính (từ patient_history) |
| `medications` | `string[]` | Tùy chọn | Danh sách thuốc đang dùng (từ patient_history) |
| `allergies` | `string[]` | Tùy chọn | Danh sách tên thuốc dị ứng (từ allergies table) |

**Request Body Example:**

```json
{
  "symptoms_text": "Tôi bị sốt cao khoảng 38.5 độ từ sáng đến giờ, kèm theo đau đầu và mệt mỏi",
  "history": ["tieu_duong_type_2", "huyet_ap_cao"],
  "medications": ["Metformin 500mg", "Amlodipine 5mg"],
  "allergies": ["Penicillin", "Aspirin"]
}
```

**Response 200 Schema:**

| Field | Type | Mô tả |
|---|---|---|
| `recognized_symptoms` | `array` | Danh sách triệu chứng AI nhận diện được |
| `recognized_symptoms[].id` | `string` | ID chuẩn hóa từ DB symptoms |
| `recognized_symptoms[].name` | `string` | Slug name |
| `recognized_symptoms[].display_name` | `string` | Tên hiển thị |
| `recognized_symptoms[].severity` | `string` | `light` \| `medium` \| `severe` |
| `recommendations` | `array` | Danh sách thuốc gợi ý, sắp xếp theo confidence giảm dần |
| `recommendations[].drug_id` | `string` | ID thuốc |
| `recommendations[].drug_name` | `string` | Tên thuốc |
| `recommendations[].active_ingredient` | `string` | Hoạt chất |
| `recommendations[].confidence` | `number` | Điểm tin cậy 0.0–1.0 |
| `recommendations[].reason` | `string` | Giải thích lý do gợi ý (Explainable AI) |
| `recommendations[].warnings` | `string[]` | Danh sách cảnh báo |
| `recommendations[].contraindications` | `string[]` | Chống chỉ định |
| `recommendations[].is_filtered_allergy` | `boolean` | `true` nếu thuốc này có trong danh sách dị ứng |
| `danger_alert` | `object \| null` | Cảnh báo triệu chứng nguy hiểm nếu có |
| `danger_alert.level` | `string` | `warning` \| `critical` |
| `danger_alert.message` | `string` | Nội dung cảnh báo |
| `danger_alert.symptoms_triggered` | `string[]` | Các triệu chứng kích hoạt cảnh báo |
| `engine_version` | `string` | Phiên bản engine AI |
| `processing_time_ms` | `integer` | Thời gian xử lý (milliseconds) |

**Response 200 — OK Example:**

```json
{
  "recognized_symptoms": [
    {
      "id": "s001",
      "name": "sot",
      "display_name": "Sốt",
      "severity": "medium"
    },
    {
      "id": "s002",
      "name": "dau_dau",
      "display_name": "Đau đầu",
      "severity": "medium"
    },
    {
      "id": "s010",
      "name": "met_moi",
      "display_name": "Mệt mỏi",
      "severity": "light"
    }
  ],
  "recommendations": [
    {
      "drug_id": "d001",
      "drug_name": "Paracetamol 500mg",
      "active_ingredient": "Paracetamol",
      "drug_group": "Giảm đau - Hạ sốt",
      "confidence": 0.87,
      "reason": "Phù hợp với triệu chứng sốt (mức Vừa) và đau đầu. Không có tương tác với Metformin và Amlodipine. Không trong danh sách dị ứng.",
      "warnings": [
        "Không dùng quá 8 viên/ngày (4000mg)",
        "Tránh dùng cùng rượu bia"
      ],
      "contraindications": [],
      "is_filtered_allergy": false
    },
    {
      "drug_id": "d003",
      "drug_name": "Ibuprofen 400mg",
      "active_ingredient": "Ibuprofen",
      "drug_group": "NSAIDs",
      "confidence": 0.70,
      "reason": "Có tác dụng hạ sốt và giảm đau đầu. Lưu ý: bệnh nhân có tiền sử tiểu đường type 2 cần thận trọng.",
      "warnings": [
        "Uống sau ăn để tránh kích ứng dạ dày",
        "Thận trọng với bệnh nhân tiểu đường"
      ],
      "contraindications": [],
      "is_filtered_allergy": false
    },
    {
      "drug_id": "d004",
      "drug_name": "Aspirin 100mg",
      "active_ingredient": "Acetylsalicylic acid",
      "drug_group": "NSAIDs",
      "confidence": 0.55,
      "reason": "Thuốc này nằm trong danh sách dị ứng của bạn và đã bị lọc.",
      "warnings": [],
      "contraindications": [],
      "is_filtered_allergy": true
    }
  ],
  "danger_alert": null,
  "engine_version": "ml-v1",
  "processing_time_ms": 245
}
```

**Response 200 với Danger Alert:**

```json
{
  "recognized_symptoms": [
    {
      "id": "s020",
      "name": "dau_nguc",
      "display_name": "Đau ngực",
      "severity": "severe"
    },
    {
      "id": "s021",
      "name": "kho_tho",
      "display_name": "Khó thở",
      "severity": "severe"
    }
  ],
  "recommendations": [],
  "danger_alert": {
    "level": "critical",
    "message": "Các triệu chứng bạn mô tả có thể là dấu hiệu của bệnh tim mạch hoặc nhồi máu cơ tim. Vui lòng đến cơ sở y tế ngay lập tức.",
    "symptoms_triggered": ["dau_nguc", "kho_tho"]
  },
  "engine_version": "ml-v1",
  "processing_time_ms": 89
}
```

---

### 10.2 GET /health

**Mô tả:** Health check endpoint cho AI Service. Backend gọi trước khi gửi request predict để kiểm tra trạng thái.

**Response 200 — OK:**

```json
{
  "status": "ok",
  "service": "medassist-ai",
  "version": "1.0.0",
  "engine_version": "ml-v1",
  "model_loaded": true,
  "uptime_seconds": 3600,
  "timestamp": "2026-05-20T14:30:00.000Z"
}
```

**Response 503 — Service Unavailable:**

```json
{
  "status": "error",
  "service": "medassist-ai",
  "error": "Model not loaded",
  "timestamp": "2026-05-20T14:30:00.000Z"
}
```

---

## 11. Luồng tích hợp

### 11.1 Luồng chính: Register → OTP → Login → Recommend

Đây là luồng tích hợp cơ bản nhất, mô tả cách frontend gọi nhiều endpoint theo thứ tự để hoàn thành tính năng gợi ý thuốc.

```
┌─────────────┐        ┌──────────────┐        ┌───────────────┐
│  Browser    │        │   Backend    │        │  AI Service   │
│ (Frontend)  │        │  (Node.js)   │        │  (Python)     │
└──────┬──────┘        └──────┬───────┘        └───────┬───────┘
       │                      │                        │
       │  [BƯỚC 1: ĐĂNG KÝ]  │                        │
       │──POST /api/auth/register──────────────────────>│
       │  { fullName, email, password }                 │
       │<─── 201 { userId, email, otpExpiresAt } ───────│
       │                      │                        │
       │  [BƯỚC 2: XÁC THỰC OTP]                       │
       │──POST /api/auth/verify-otp────────────────────>│
       │  { email, code: "483921" }                     │
       │<─── 200 { accessToken, refreshToken, user } ───│
       │                      │                        │
       │  [Client lưu tokens]                           │
       │                      │                        │
       │  [BƯỚC 3: LẤY HỒ SƠ (tùy chọn)]              │
       │──GET /api/auth/me──────────────────────────────>│
       │  Header: Bearer <accessToken>                  │
       │<─── 200 { id, fullName, email, role } ─────────│
       │                      │                        │
       │  [BƯỚC 4: GỢI Ý THUỐC]                        │
       │──POST /api/recommendations────────────────────>│
       │  { symptomsText: "tôi bị sốt..." }             │
       │                      │                        │
       │                      │──POST /ai/recommend────>│
       │                      │  { symptoms_text,      │
       │                      │    history[],          │
       │                      │    medications[],      │
       │                      │    allergies[] }       │
       │                      │<─── 200 { recognized_  │
       │                      │    symptoms,           │
       │                      │    recommendations,    │
       │                      │    danger_alert } ─────│
       │                      │                        │
       │<── 201 { id, recommendations, dangerAlert } ───│
       │                      │                        │
       │  [BƯỚC 5: XEM LỊCH SỬ (sau này)]              │
       │──GET /api/recommendations─────────────────────>│
       │<─── 200 { items[], pagination } ───────────────│
       │                      │                        │
```

### 11.2 Luồng Token Refresh (Tự động)

Khi accessToken hết hạn, frontend Axios interceptor tự động xử lý:

```
[Frontend gọi API bất kỳ] → 401 TOKEN_EXPIRED
       │
       ▼
[isRefreshing = true]
[Các request khác bị xếp vào failedQueue]
       │
       ▼
POST /api/auth/refresh { refreshToken }
       │
   ┌───┴───────────────────────┐
   │ Thành công                │ Thất bại
   ▼                           ▼
Lưu accessToken mới     Xóa tất cả tokens
Retry tất cả requests   Redirect → /login
trong failedQueue
```

### 11.3 Luồng Admin — Import & Mapping

```
Admin nhập file CSV
       │
       ▼
POST /api/admin/drugs/import
       │
       ▼ (200 OK)
Kiểm tra kết quả import (imported, errors)
       │
       ▼ (Với từng thuốc mới)
PUT /api/admin/drugs/:drugId/symptoms
{ mappings: [{ symptomId, confidenceScore }] }
       │
       ▼
AI engine tự động đọc mapping mới
từ DB trong lần request tiếp theo
```

---

## 12. Postman Collection Structure

### 12.1 Cấu trúc Collection gợi ý

```
📁 MedAssist AI — API v1
├── 📁 Auth
│   ├── Register
│   ├── Verify OTP
│   ├── Login
│   ├── Refresh Token
│   ├── Logout
│   └── Get Me
│
├── 📁 Symptoms
│   └── List Symptoms
│
├── 📁 Recommendations
│   ├── Create Recommendation
│   ├── List History (30 days)
│   └── Get Recommendation by ID
│
├── 📁 Patient History
│   ├── List History
│   ├── Add History Entry
│   ├── Update History Entry
│   └── Delete History Entry
│
├── 📁 Allergies
│   ├── List Allergies
│   ├── Add Allergy
│   └── Delete Allergy
│
└── 📁 Admin
    ├── 📁 Drugs
    │   ├── List Drugs (paginated)
    │   ├── Create Drug
    │   ├── Update Drug
    │   ├── Delete Drug (soft)
    │   ├── Import Drugs (CSV)
    │   └── Update Drug-Symptom Mappings
    └── 📁 Symptoms
        ├── List Symptoms
        ├── Create Symptom
        ├── Update Symptom
        └── Delete Symptom
```

### 12.2 Environments

**Environment: Development**

| Variable | Value |
|---|---|
| `BASE_URL` | `http://localhost:5000` |
| `ACCESS_TOKEN` | *(tự điền sau khi login)* |
| `REFRESH_TOKEN` | *(tự điền sau khi login)* |

**Environment: Production**

| Variable | Value |
|---|---|
| `BASE_URL` | `https://medassist-api.railway.app` |
| `ACCESS_TOKEN` | *(tự điền sau khi login)* |
| `REFRESH_TOKEN` | *(tự điền sau khi login)* |

### 12.3 Pre-request Script gợi ý (tự động lấy token)

Gắn vào folder cấp cao nhất để tự động điền token vào tất cả request:

```javascript
// Pre-request Script — tự động refresh token nếu cần
const accessToken = pm.environment.get("ACCESS_TOKEN");
if (accessToken) {
    pm.request.headers.add({
        key: "Authorization",
        value: `Bearer ${accessToken}`
    });
}
```

### 12.4 Test Script gợi ý (Login request)

Tự động lưu token sau khi login thành công:

```javascript
// Test Script cho POST /api/auth/login
if (pm.response.code === 200) {
    const body = pm.response.json();
    pm.environment.set("ACCESS_TOKEN", body.data.accessToken);
    pm.environment.set("REFRESH_TOKEN", body.data.refreshToken);
    console.log("Tokens đã được lưu vào environment");
}
```

---

## 13. Changelog

| Phiên bản | Ngày | Tác giả | Thay đổi |
|---|---|---|---|
| 1.0.0 | 20/05/2026 | Nhóm 5 | Tạo tài liệu lần đầu — đầy đủ tất cả endpoint v1 |
| *(1.0.1)* | *(TBD)* | — | *(Cập nhật sau khi Backend hoàn thành implement)* |
| *(1.1.0)* | *(TBD)* | — | *(Bổ sung endpoint khi có tính năng P1: feedback, dashboard)* |
| *(2.0.0)* | *(TBD)* | — | *(API v2 nếu có breaking change)* |

---

## Phụ lục A — Bảng từ viết tắt

| Từ viết tắt | Ý nghĩa |
|---|---|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| UUID | Universally Unique Identifier |
| CRUD | Create, Read, Update, Delete |
| NLP | Natural Language Processing |
| ML | Machine Learning |
| AI | Artificial Intelligence |
| REST | Representational State Transfer |
| HTTP | HyperText Transfer Protocol |
| ISO | International Organization for Standardization |
| UTC | Coordinated Universal Time |
| CSV | Comma-Separated Values |
| NSAIDs | Non-Steroidal Anti-Inflammatory Drugs |
| p95 | 95th Percentile |
| FE | Frontend |
| BE | Backend |

---

## Phụ lục B — Disclaimer Y tế

> **Tuyên bố miễn trách nhiệm:** Thông tin trên MedAssist AI chỉ mang tính chất tham khảo và không thay thế cho tư vấn y tế chuyên nghiệp. Luôn tham khảo ý kiến bác sĩ hoặc dược sĩ trước khi sử dụng bất kỳ loại thuốc nào. MedAssist AI không chịu trách nhiệm về hậu quả phát sinh từ việc sử dụng thông tin trên ứng dụng.

---

*Tài liệu này được tạo ngày 20/05/2026 cho đồ án tốt nghiệp — Nhóm 5, Đề tài 95.*
*Phiên bản tiếp theo sẽ được cập nhật sau khi Backend hoàn thành implement và test coverage đạt 80%.*
