# Tài liệu Quy trình Kiểm thử Phần mềm Chi tiết & Báo cáo Dự án
## Hệ thống Hỗ trợ Y tế Thông minh — MedAssist AI

Tài liệu này trình bày chi tiết về quy trình kiểm thử phần mềm được áp dụng trong dự án **MedAssist AI**, diễn giải chi tiết các thuật ngữ chuyên ngành tiếng Anh sang tiếng Việt, đồng thời phân tích vấn đề dự án giải quyết và mức độ hoàn thiện thực tế.

---

## PHẦN 1: DỰ ÁN GIẢI QUYẾT VẤN ĐỀ GÌ & MỨC ĐỘ NHƯ THẾ NÀO?

### 1. Vấn đề cốt lõi mà dự án giải quyết
Trong thực tế lâm sàng và tự chăm sóc sức khỏe tại nhà, có hai vấn đề y tế cực kỳ nguy hiểm thường xuyên xảy ra:
1. **Sai sót kê đơn và Chống chỉ định (Contraindications & Prescription Errors):** Người bệnh hoặc bác sĩ kê đơn thuốc chứa các hoạt chất gây dị ứng cho bệnh nhân, hoặc gây biến chứng nghiêm trọng do tương tác với bệnh nền sẵn có (Ví dụ: Kê thuốc kháng viêm NSAID như Ibuprofen cho bệnh nhân có tiền sử hen suyễn cấp hoặc viêm loét dạ dày). Việc người dùng nhập sai chính tả (ví dụ "parasetamol" thay vì "Paracetamol") thường làm trượt các bộ lọc so sánh chuỗi chính xác (exact match).
2. **"Ảo giác" của Trí tuệ Nhân tạo (AI Hallucinations):** Khi ứng dụng Chatbot AI tư vấn sức khỏe, các mô hình ngôn ngữ lớn (LLM) thông thường có xu hướng tự bịa ra thông tin thuốc (hallucination), bịa ra cách dùng hoặc đề xuất hoạt chất không có thật, hoặc đề xuất hoạt chất bị chống chỉ định y tế.
3. **Sự cố mạng hoặc quá tải API (LLM API Failure & Latency):** Các dịch vụ AI bên ngoài có thể bị quá tải, lỗi mạng hoặc trả về phản hồi chậm. Nếu không có giải pháp dự phòng, ứng dụng sẽ bị treo hoặc trả về dữ liệu rỗng gây gián đoạn trải nghiệm người dùng.

### 2. Mức độ giải quyết của hệ thống MedAssist AI
Hệ thống **MedAssist AI** giải quyết các vấn đề trên ở mức độ **Toàn diện và Đảm bảo An toàn Y tế (Production-Grade & Safety-First)** thông qua các thuật toán và kiến trúc kỹ thuật sau:

*   **Đối sánh dị ứng mờ (Fuzzy Allergy Matching):**
    *   *Mức độ giải quyết:* Khi người dùng gõ sai chính tả hoạt chất dị ứng, hệ thống áp dụng kỹ thuật **Trigram Indexing (PostgreSQL GIN)** để truy vấn nhanh ứng viên phù hợp nhất từ database trong vòng dưới **50ms** (giảm độ phức tạp từ $O(N)$ xuống $O(15)$), rồi áp dụng công thức **Dice's Coefficient** để tính độ tương đồng từ ngữ. Điều này đảm bảo không bỏ sót bất kỳ tác nhân dị ứng nào do nhập lỗi.
*   **Định tuyến AI dự phòng bền bỉ (Fault-Tolerant AI Routing & Circuit Breaker):**
    *   *Mức độ giải quyết:* Khi thực hiện kiểm tra triệu chứng, hệ thống định tuyến yêu cầu qua công cụ AI chính (**HttpAiServiceEngine** kết nối Gemini/Groq). Nếu kết nối bị lỗi hoặc quá thời gian phản hồi (timeout 1.5s), hệ thống tự động chuyển đổi giữa các provider (Gemini -> Groq -> GLM Zhipu) nhờ cơ chế **Circuit Breaker**. Trong trường hợp xấu nhất khi toàn bộ các nhà cung cấp AI sập, hệ thống tự động chuyển sang cơ chế dự phòng **DatabaseFallbackEngine** để sinh câu trả lời y tế an toàn dựa trên đồ thị bệnh lý đã được kiểm chứng (Disease Graph), tránh việc treo ứng dụng hoặc trả về dữ liệu rỗng.
*   **Giám sát chất lượng phản hồi AI (Explainable AI & Audit Logging):**
    *   *Mức độ giải quyết:* Mỗi câu trả lời từ chatbot AI đều đi qua một bộ lọc chất lượng (**Quality Guard**). Mọi thông tin bao gồm: Request Payload, Response Payload, độ trễ (latency), trạng thái định tuyến (Direct/Fallback), chất lượng phản hồi (Pass/Fail) và log lỗi chi tiết đều được mã hóa lưu trữ bền vững tại bảng `ai_audit_logs` để quản trị viên có thể truy vết kiểm định trên Dashboard **AI Insights**.

---

## PHẦN 2: QUY TRÌNH KIỂM THỬ PHẦN MỀM CHI TIẾT (SOFTWARE TESTING PROCESS - STLC)

Dự án áp dụng Vòng đời Kiểm thử Phần mềm (**STLC - Software Testing Life Cycle**) chuyên nghiệp qua 6 giai đoạn sau:

1. **Phân tích yêu cầu (Requirement Analysis):** Đội ngũ QA phân tích các yêu cầu như đăng nhập mạng xã hội (Google, Facebook, Apple), kiểm tra triệu chứng y khoa, bảo mật OAuth 2.0, và các chuẩn chống dò quét thông tin người dùng.
2. **Lập kế hoạch kiểm thử (Test Planning):** Định nghĩa phạm vi kiểm thử (Scope), chiến lược kiểm thử, lập lịch trình, xác định tài nguyên và chiến lược giả lập (Mocking) đối với các API bên thứ ba (Google OAuth, Facebook Graph, Gemini API).
3. **Thiết kế kịch bản kiểm thử (Test Case Design):** Phát triển các kịch bản kiểm thử chi tiết. Code kiểm thử tự động được viết trong thư mục `backend/test` (sử dụng native `node:test`) và `ai-service/tests` (sử dụng `pytest`).
4. **Thiết lập môi trường kiểm thử (Test Environment Setup):** Cấu hình cơ sở dữ liệu test biệt lập (sử dụng in-memory database mock hoặc Supabase test instance), chuẩn bị biến môi trường trong file `.env.test`.
5. **Thực thi kiểm thử (Test Execution):** Chạy kiểm thử tự động bằng lệnh `npm test` và `pytest`, kết hợp kiểm thử thủ công (Manual Testing) trên trình duyệt để ghi nhận và báo cáo lỗi (Bugs).
6. **Đóng chu kỳ kiểm thử (Test Cycle Closure):** Đánh giá mức độ bao phủ mã nguồn (Code Coverage), xem xét số lượng lỗi đã được vá và phát hành báo cáo nghiệm thu sản phẩm.

---

## PHẦN 3: CÁC CẤP ĐỘ KIỂM THỬ THỰC TẾ TRONG DỰ ÁN (TESTING LEVELS)

Hệ thống áp dụng mô hình Kim tự tháp Kiểm thử (**Testing Pyramid**) để tối ưu hóa thời gian chạy và độ tin cậy:

### 1. Unit Testing (Kiểm thử đơn vị)
*   **Định nghĩa:** Kiểm thử độc lập từng đoạn mã nhỏ nhất (hàm, phương thức) một cách cô lập hoàn toàn.
*   **Cách áp dụng trong dự án:**
    *   **Backend Node.js (74 test cases):** Sử dụng native test runner của Node.js (`node:test`).
        *   `authService.test.js`: Kiểm tra thuật toán mã hóa mật khẩu, mã hóa JWT, logic tạo OTP.
        *   `validate.test.js`: Kiểm tra tính hợp lệ của dữ liệu đầu vào sử dụng Joi validation schema.
    *   **AI Service Python (15 test cases):** Sử dụng `pytest`.
        *   `test_provider_router.py`: Kiểm tra thuật toán định tuyến LLM giữa các provider (Gemini, Groq, GLM).
        *   `test_chatbot.py`: Kiểm tra cấu trúc JSON phản hồi từ AI.
*   **Kỹ thuật Mocking (Giả lập):**
    *   Sử dụng `createUserRepoMock()` để giả lập database PostgreSQL bằng một `Map` trong RAM giúp test chạy độc lập và cực nhanh (dưới 2 giây).
    *   Giả lập các LLM Engine để tránh tốn chi phí gọi API thật của Google/Groq và loại bỏ độ trễ mạng trong khi test.

### 2. Integration Testing (Kiểm thử tích hợp)
*   **Định nghĩa:** Kiểm tra sự tương tác và tích hợp giữa các thành phần riêng lẻ sau khi kết nối với nhau.
*   **Cách áp dụng trong dự án:**
    *   `allergyRoutes.test.js`: Kiểm tra tích hợp giữa API và Database thực hiện đối sánh mờ pg_trgm.
    *   `profileRoutes.test.js`: Kiểm tra việc lưu trữ thông tin cá nhân và định dạng chuẩn hóa giới tính.
    *   `recommendationService.test.js`: Kiểm tra tích hợp chéo dịch vụ (Cross-service) giữa Backend Node.js và AI Service Python, đặc biệt là kiểm thử cơ chế tự động kích hoạt **DatabaseFallbackEngine** khi AI Service bị ngắt kết nối.

### 3. End-to-End Testing (E2E Testing - Kiểm thử toàn trình)
*   **Định nghĩa:** Kiểm tra toàn bộ luồng hoạt động của ứng dụng đi từ giao diện người dùng (Frontend) xuống cơ sở dữ liệu.
*   **Cách áp dụng trong dự án:**
    *   Kiểm tra luồng đăng nhập mạng xã hội (Google, Facebook): Mở web -> nhấn nút Login -> chuyển hướng OAuth Consent -> xác thực thành công -> quay lại dashboard AI Insights mà không bị lặp chuyển hướng.

---

## PHẦN 4: CÁC PHƯƠNG PHÁP KIỂM THỬ ĐẶC BIỆT & BẢO MẬT

### 1. Security Testing (Kiểm thử bảo mật - chuẩn OWASP)
*   **Chống dò quét thông tin người dùng (Anti User Enumeration - OWASP V2.7):**
    *   API Đăng nhập và Quên mật khẩu được thiết kế để trả về cùng một thông báo lỗi chung và thời gian phản hồi (latency) tương tự nhau bất kể email nhập vào có tồn tại trên hệ thống hay không, ngăn chặn kẻ tấn công dò tìm danh sách email người dùng.
*   **Khóa tài khoản tạm thời (Account Lockout):**
    *   Hệ thống khóa tài khoản 15 phút nếu đăng nhập sai 5 lần liên tiếp (kiểm thử tự động tại `authService.test.js`).

### 2. Resiliency & Fallback Testing (Kiểm thử khả năng phục hồi)
*   **Circuit Breaker (Ngắt mạch tự động):** Chuyển sang nhà cung cấp AI dự phòng (Gemini -> Groq -> Zhipu) nếu API chính bị lỗi 2 lần liên tiếp.
*   **Database Fallback:** Đảm bảo hệ thống tự động trích xuất điều trị từ Đồ thị bệnh lý cục bộ khi mất kết nối mạng.

---

## PHẦN 5: BẢNG TRA CỨU THUẬT NGỮ KIỂM THỬ ANH - VIỆT CHI TIẾT

| Thuật ngữ tiếng Anh | Dịch nghĩa tiếng Việt | Giải thích chi tiết & Ví dụ trong dự án |
| :--- | :--- | :--- |
| **Software Testing** | Kiểm thử phần mềm | Hoạt động kiểm tra xem phần mềm có chạy đúng thiết kế và không có lỗi hay không. |
| **Unit Test** | Kiểm thử đơn vị | Kiểm thử các đoạn mã nhỏ nhất (thường là một hàm hoặc một lớp) một cách riêng lẻ. Ví dụ: Test hàm băm mật khẩu `bcrypt.hash`. |
| **Integration Test** | Kiểm thử tích hợp | Kiểm tra xem các thành phần khác nhau khi ghép lại có hoạt động khớp nối với nhau hay không. Ví dụ: Test API gọi Database. |
| **End-to-End (E2E) Test** | Kiểm thử toàn trình | Kiểm thử luồng đi của dữ liệu từ giao diện người dùng (Frontend) đến máy chủ (Backend) và Cơ sở dữ liệu. |
| **Regression Test** | Kiểm thử hồi quy | Chạy lại các bài test cũ sau khi sửa code để đảm bảo không xuất hiện lỗi mới ở các phần tính năng cũ. |
| **Manual Testing** | Kiểm thử thủ công | Tester tự bấm trên màn hình ứng dụng để tìm lỗi mà không dùng code tự động. |
| **Automated Testing** | Kiểm thử tự động | Sử dụng mã nguồn để tự động chạy các kịch bản kiểm thử và đối chiếu kết quả. |
| **Mocking / Mock** | Giả lập đối tượng | Tạo ra một phiên bản giả của một dịch vụ (như Database hoặc API bên thứ ba) để phục vụ việc test nhanh và độc lập. |
| **Assertion** | Khẳng định kết quả | Câu lệnh dùng để so sánh kết quả thực tế với kết quả mong đợi trong code test. Nếu sai, test case sẽ thất bại. |
| **Test Case** | Kịch bản kiểm thử | Một tập hợp các điều kiện đầu vào, các bước thực hiện và kết quả mong đợi để kiểm tra một tính năng cụ thể. |
| **Test Suite** | Tập hợp kịch bản kiểm thử | Nhóm các test case có liên quan chặt chẽ với nhau (Ví dụ: Test suite dành riêng cho tính năng Đăng nhập). |
| **Code Coverage** | Độ phủ mã nguồn | Tỷ lệ phần trăm số dòng code được chạy qua khi thực hiện các bài test tự động. Chỉ số này thường yêu cầu > 80%. |
| **Bug / Defect** | Lỗi phần mềm | Sự sai lệch giữa hành vi thực tế của phần mềm và tài liệu đặc tả yêu cầu. |
| **Debug / Debugging** | Rà lỗi / Tìm lỗi | Quy trình cô lập, tìm ra nguyên nhân gây lỗi trong mã nguồn và sửa chữa nó. |
| **Hallucination** | Ảo giác AI | Hiện tượng mô hình AI (LLM) bịa ra thông tin không có thật nhưng trình bày rất tự tin. |
| **Grounded AI** | AI có kiểm chứng | Phương pháp ràng buộc câu trả lời của AI vào một nguồn dữ liệu đáng tin cậy (như Database y học cục bộ). |
| **Circuit Breaker** | Bộ ngắt mạch phần mềm | Cơ chế tự động ngừng gọi một dịch vụ bị lỗi nhiều lần để tránh làm treo toàn hệ thống, sau đó thử lại sau một khoảng thời gian. |
| **Rate Limiting** | Giới hạn tần suất | Cơ chế giới hạn số lượng yêu cầu mà một người dùng có thể gửi lên server trong một khoảng thời gian để chống spam API. |
| **Cross-Origin Resource Sharing (CORS)** | Chia sẻ tài nguyên chéo nguồn gốc | Cơ chế bảo mật của trình duyệt ngăn chặn việc giao diện ở domain A gọi API ở domain B nếu không được cho phép rõ ràng. |
| **Payload** | Gói dữ liệu | Nội dung dữ liệu chính được gửi đi trong một yêu cầu HTTP (Request payload) hoặc phản hồi (Response payload). |
| **User Enumeration** | Dò quét tài khoản người dùng | Lỗi bảo mật cho phép hacker đoán được danh sách email người dùng đã đăng ký thông qua các phản hồi lỗi khác nhau từ hệ thống. |
| **OAuth 2.0** | Giao thức ủy quyền bảo mật | Chuẩn xác thực phổ biến cho phép đăng nhập bằng tài khoản Google, Facebook mà không cần chia sẻ mật khẩu. |
| **GIN Index (Generalized Inverted Index)** | Chỉ mục nghịch đảo tổng quát | Loại chỉ mục trong database PostgreSQL tối ưu cho việc tìm kiếm văn bản full-text search và đối sánh mờ trigram. |
| **Trigram** | Nhóm 3 ký tự | Kỹ thuật chia một từ thành các nhóm 3 ký tự liên tiếp để đo lường độ tương đồng của chuỗi (nhất là khi gõ sai chính tả). |
| **Fuzzy Matching** | Đối sánh mờ | Thuật toán tìm kiếm các từ gần đúng hoặc có độ tương tương tự cao thay vì tìm chính xác 100%. |
| **Fallback** | Cơ chế dự phòng | Phương án thay thế tự động được kích hoạt khi phương án chính bị lỗi nhằm giữ cho ứng dụng hoạt động bình thường. |
| **Joi Validation** | Xác thực dữ liệu (Joi) | Công cụ kiểm tra định dạng và kiểu dữ liệu đầu vào trên server Node.js trước khi xử lý tiếp. |
| **JWT (JSON Web Token)** | Mã mã hóa JSON | Chuỗi ký tự chứa thông tin người dùng được mã hóa gửi kèm mỗi request để xác thực quyền truy cập API. |
| **OTP (One-Time Password)** | Mật khẩu dùng một lần | Mã số bảo mật ngắn hạn được gửi qua Email hoặc SMS để xác thực danh tính người dùng. |
| **Circuit Breaker: Open** | Trạng thái Mạch Hở | Mạch đang ngắt kết nối với dịch vụ chính, các yêu cầu sẽ lập tức chuyển sang dịch vụ dự phòng. |
| **Circuit Breaker: Closed** | Trạng thái Mạch Đóng | Mạch hoạt động bình thường, các yêu cầu được chuyển trực tiếp đến dịch vụ chính. |
| **Circuit Breaker: Half-Open** | Trạng thái Mạch Khép Hờ | Mạch thử gửi một vài yêu cầu đến dịch vụ chính sau thời gian hồi để kiểm tra xem dịch vụ đã khôi phục chưa. |
