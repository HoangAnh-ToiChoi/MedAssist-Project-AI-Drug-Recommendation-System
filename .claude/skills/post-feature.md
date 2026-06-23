# Skill: post-feature — Wrap-up sau khi hoàn thành một chức năng

Chạy skill này sau mỗi lần hoàn thành xây một feature.
Thực hiện **3 bước theo thứ tự**, không bỏ qua bước nào.

---

## Bước 1 — Code Review

Đọc `.claude/agent/code-reviewer.md` để lấy bộ tiêu chí.

Launch **1 Agent** (`general-purpose`) với:
- Nội dung đầy đủ của `code-reviewer.md`
- Danh sách các file vừa thay đổi trong feature này (đọc từ git diff hoặc từ context)
- Nhiệm vụ: Review từng file theo 4 tiêu chí OOP + Tell Don't Ask + layer isolation. Nếu có vi phạm → viết lại code ngay, không chỉ comment.

Chờ agent xong. Ghi nhận mức đánh giá: `PASS / MINOR / MAJOR / CRITICAL`.

---

## Bước 2 — Testing

Đọc `.claude/agent/tester.md` để lấy bộ test case template.

Launch **1 Agent** (`general-purpose`) với:
- Nội dung đầy đủ của `tester.md`
- Tên feature + danh sách endpoint vừa xây + server đang chạy ở port nào
- Nhiệm vụ: Sinh test case (happy path, error cases, performance, security, business rules), chạy test thực tế nếu server đang chạy, trả báo cáo.

Chờ agent xong. Ghi nhận: số PASS / FAIL / SKIP.

> **Chạy tuần tự** (review trước → test sau) — không song song, vì nếu review phát hiện bug thì test phải chạy lại trên code đã sửa.

---

## Bước 3 — Ghi Process Documentation

Tạo file `.claude/process/<tên-feature>.md` theo cấu trúc:

```markdown
# [Tên feature] — [Endpoint / mô tả ngắn]

## Luồng chạy
[Diagram text: Client → Route → Controller → Service → Repository]
[Mỗi bước mô tả rõ làm gì, nhánh lỗi xử lý như thế nào]

## Những gì xây ở từng tầng
[Bảng: File | Method | Mô tả]

## Chú ý quan trọng
[Quyết định thiết kế, lý do chọn approach, edge case]
[Nếu code reviewer phát hiện vi phạm và đã sửa → ghi lại để biết từng sai ở đâu]

## Kết quả tự test
[Bảng: Test case | Input | Expected | Actual ✅/❌]
[Test FAIL vì thiếu dependency → ghi rõ lý do]

## Chuẩn bảo mật áp dụng
[OWASP ASVS reference cụ thể nếu có]
```

**Quy tắc ghi:**
- Luồng phải là diagram text thực tế, không mô tả chung chung
- Kết quả test là kết quả **đã chạy thực tế**, không phải dự đoán
- File này không được reference trong CLAUDE.md — chỉ HA đọc khi cần báo cáo

---

## Cách gọi skill này

Sau khi xây xong một feature, nói với Claude:

> "chạy post-feature cho [tên feature]"

hoặc

> "/post-feature [tên feature]"

Claude sẽ đọc file này và thực hiện đúng 3 bước trên theo thứ tự.
