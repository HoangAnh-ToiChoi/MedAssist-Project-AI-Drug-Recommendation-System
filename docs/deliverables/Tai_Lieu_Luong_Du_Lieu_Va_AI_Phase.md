# Báo cáo Kiến trúc Chi tiết: Luồng Dữ liệu & Hệ thống AI Phase
## Hệ thống Hỗ trợ Y tế Thông minh — MedAssist AI

Tài liệu này phân tích chi tiết hai luồng xử lý cốt lõi của hệ thống **MedAssist AI**: Luồng dữ liệu y khoa (nguồn gốc, cách thu thập, đối chiếu triệu chứng, lọc dị ứng mờ và kiểm tra chống chỉ định bệnh nền) và Luồng AI Phase (kiến trúc định tuyến đa mô hình với bộ ngắt mạch Circuit Breaker, cơ sở tri thức chống ảo giác và quy trình thiết lập Prompt/RAG).

---

## LUỒNG 1: QUY TRÌNH THU THẬP DỮ LIỆU & ĐỐI CHIẾU LÂM SÀNG CỦA HỆ THỐNG

### 1. Nguồn gốc Dữ liệu Thuốc, Triệu chứng và Bệnh lý (Data Origin)
Hệ thống **MedAssist AI** xây dựng một cơ sở tri thức y học cục bộ (Local Knowledge Base) nhằm đảm bảo tính toàn vẹn và tốc độ phản hồi tối ưu mà không phụ thuộc vào kết nối mạng bên ngoài tại thời điểm runtime (thời gian chạy). Nguồn gốc của các nhóm dữ liệu như sau:
*   **Dữ liệu Thuốc (Drugs):** Được cào (scrape) và làm sạch ngoại tuyến từ các nguồn dữ liệu chính thống bao gồm RxNorm, RxTerms (thư viện quốc gia Hoa Kỳ), openFDA (Cục quản lý Thực phẩm và Dược phẩm Hoa Kỳ) và thông tin đăng ký thuốc từ DAV (Cục Quản lý Dược Việt Nam). Dữ liệu sau khi làm sạch được lưu trữ tĩnh vào bảng `drugs` trong cơ sở dữ liệu Supabase PostgreSQL.
*   **Dữ liệu Triệu chứng & Bệnh lý (Symptoms & Diseases):** Triệu chứng được chuẩn hóa theo phân loại bệnh tật quốc tế ICD-10. Dữ liệu bệnh lý (diseases) được cào từ Clinical Tables API kết hợp với danh mục ICD-10 y khoa chính thức.
*   **Quan hệ Đồ thị Bệnh lý (Disease Graph):** Liên kết y học được mô hình hóa qua các bảng quan hệ nhiều-nhiều (Junction Tables) gồm: `disease_types` (chuyên khoa) $ightarrow$ `diseases` (bệnh lý) $ightarrow$ `disease_symptoms` (triệu chứng của bệnh với điểm số tin cậy `confidence_score`) $ightarrow$ `disease_drugs` (các thuốc điều trị bệnh với độ ưu tiên `priority_rank`).

### 2. Cơ chế Quét Triệu chứng và Tiền sử Bệnh nền tìm thuốc phù hợp (Clinical Matching Flow)
Khi người dùng nhập triệu chứng vào hệ thống, thuật toán diễn ra khép kín qua các bước sau tại lớp Backend (`RecommendationService`):
1.  **Nhận diện và chuẩn hóa đầu vào:** Giao diện (Frontend) gửi mã chuyên khoa và mảng triệu chứng lên API backend. Backend tiến hành chuẩn hóa chuỗi triệu chứng về chữ thường không dấu và loại bỏ khoảng trắng dư thừa để tránh lỗi định dạng.
2.  **Truy vấn ứng viên bệnh lý và thuốc tiềm năng:** Hệ thống sử dụng danh sách triệu chứng quét qua bảng quan hệ `disease_symptoms` và `disease_drugs` để lọc ra các bệnh lý phù hợp nhất (xếp hạng theo `confidence_score`) và đề xuất danh sách thuốc điều trị tiềm năng ban đầu.
3.  **Lọc bỏ thuốc gây dị ứng (Allergies Filtering):** Hệ thống truy vấn danh sách chất dị ứng (`allergies`) của người dùng từ Database. Sử dụng chỉ mục **GIN Trigram Indexing** trên PostgreSQL kết hợp công thức **Dice's Coefficient**, hệ thống thực hiện đối sánh mờ (**Fuzzy Matching**) để tìm ra các thuốc gợi ý trùng khớp hoạt chất dị ứng của bệnh nhân kể cả khi người dùng nhập sai chính tả (ví dụ: 'parasetamol' và 'Paracetamol' vẫn khớp dị ứng và bị chặn đứng).
4.  **Lọc bỏ thuốc chống chỉ định với bệnh nền (Contraindications Filtering):** Hệ thống truy vấn tiền sử bệnh án (`patient_history`) của người dùng để lấy danh sách bệnh nền. Phương thức `#isDrugContraindicatedForHistory` tiến hành tách từ và đối chiếu văn bản không dấu giữa danh mục `contraindications` (chống chỉ định) của thuốc và danh sách bệnh nền của bệnh nhân. Nếu có từ khóa tương đồng (ví dụ bệnh nền 'viêm loét dạ dày' khớp với chống chỉ định 'loét dạ dày tá tràng' của Ibuprofen), thuốc đó sẽ bị loại bỏ lập tức khỏi kết quả gợi ý.
5.  **Xếp hạng và tối ưu hóa kết quả:** Các thuốc an toàn còn lại được sắp xếp theo độ tin cậy từ cao xuống thấp và cắt lát giới hạn ở mức tối đa (`MAX_RECOMMENDATIONS`) kèm theo liều lượng (`dosage`) và hướng dẫn sử dụng lấy trực tiếp từ database.

---

## LUỒNG 2: AI PHASE - KIẾN TRÚC MULTI-MODEL FALLBACK & CHATBOT CÓ KIỂM CHỨNG

### 1. Mô hình Fallback Multi-Model & Circuit Breaker
Để đảm bảo dịch vụ AI hoạt động liên tục 24/7 không bị gián đoạn do lỗi API bên ngoài, hệ thống AI Service (FastAPI) áp dụng kiến trúc định tuyến thông minh (Smart Provider Router) tích hợp mẫu thiết kế **Circuit Breaker** (Bộ ngắt mạch tự động):
*   **Chuỗi mô hình ngôn ngữ lớn (LLM Provider Chain):** Được sắp xếp theo mức độ ưu tiên tối ưu hóa chi phí và tốc độ: **Gemini 2.5 Flash** (chính) $ightarrow$ **Groq Llama 3 8B** (dự phòng cấp 1) $ightarrow$ **Zhipu AI GLM 4 Flash** (dự phòng cấp 2).
*   **Cơ chế hoạt động của Circuit Breaker:** Mỗi provider LLM được giám sát trạng thái sức khỏe liên tục. Nếu một provider bị lỗi gọi API hoặc phản hồi chậm vượt quá thời gian chờ (timeout 1.5 giây) liên tiếp 2 lần (`BREAKER_FAILURE_THRESHOLD = 2`), mạch của provider đó sẽ chuyển sang trạng thái **Mở (Open)**. Khi mạch Mở, mọi yêu cầu tiếp theo đến provider đó sẽ bị bỏ qua lập tức để chuyển thẳng sang provider dự phòng tiếp theo mà không cần chờ đợi. Sau 30 giây (`BREAKER_COOLDOWN_SECONDS`), trạng thái chuyển sang **Half-Open (Khép hờ)** để thử gọi lại 1 lần; nếu thành công, mạch đóng lại (**Closed**) để phục hồi dịch vụ chính, nếu tiếp tục lỗi, mạch quay lại **Open**.
*   **Cơ chế dự phòng cứng (Local Database Fallback):** Trong tình huống cực đoan khi toàn bộ internet mất kết nối hoặc các API Key của bên thứ ba bị sập hoàn toàn, backend Node.js tự động chuyển đổi sang `DatabaseFallbackEngine`, trích xuất dữ liệu tĩnh có sẵn trong Database Đồ thị Bệnh lý để trả về kết quả hướng dẫn điều trị an toàn cho người dùng trong vòng dưới 10ms.

### 2. Cơ sở Tri thức của Chatbot & Cơ chế chống ảo giác (Grounding & Verification)
Chatbot y tế của MedAssist AI được thiết kế tuân thủ nguyên tắc *Safety-First* (an toàn là trên hết). Chatbot đưa ra lời khuyên dựa trên cơ chế **Grounding** (Ràng buộc tri thức) và kiểm duyệt chặt chẽ:
*   **Ràng buộc ngữ cảnh (Grounded Payload):** Chatbot KHÔNG tự do suy luận từ dữ liệu huấn luyện công cộng. Khi người dùng đặt câu hỏi, Backend đóng gói toàn bộ ngữ cảnh chính xác gồm: Chuyên khoa, danh sách bệnh lý có khả năng cao, danh sách thuốc và liều lượng đã được lọc an toàn, các cảnh báo nguy hiểm (`danger_alert`), bệnh sử và tiền sử dị ứng của người dùng thành một payload JSON gửi sang AI Service.
*   **Chỉ thị hệ thống (System Instruction):** LLM được cấp một Prompt hệ thống cực kỳ nghiêm ngặt: *"Bạn là một chatbot trợ giúp y tế có kiểm chứng. Bạn KHÔNG ĐƯỢC phép thêm bất kỳ loại thuốc, bệnh lý hay chẩn đoán mới nào không nằm trong payload. Bạn KHÔNG ĐƯỢC ghi đè lên các bộ lọc an toàn của backend."*
*   **Kiểm soát chất lượng phản hồi (Quality Guard):** Sau khi LLM tạo phản hồi, nội dung sẽ được kiểm duyệt bởi `quality_guard.py`. Bộ lọc này quét xem câu trả lời có chứa hoạt chất/bệnh lý lạ ngoài payload không, và có chứa câu cảnh báo y tế tối thiểu hay không. Nếu phát hiện vi phạm, câu trả lời của AI sẽ bị loại bỏ và thay thế bằng một câu trả lời mẫu được dựng sẵn hoàn toàn an toàn (**Deterministic Fallback Response**).

### 3. Quy trình Thiết lập quy tắc (Set Rule) và Huấn luyện (Train) cơ bản
MedAssist AI kết hợp cả ba phương pháp định hướng mô hình trí tuệ nhân tạo để đạt độ an toàn y tế tối đa:
1.  **Tinh chỉnh mô hình (Fine-Tuning):** Huấn luyện thêm mô hình LLM nền tảng với các tập dữ liệu y tế chuyên biệt để cải thiện khả năng đọc hiểu thuật ngữ y khoa chuyên ngành, văn phong tư vấn và cấu trúc phản hồi dạng JSON.
2.  **Kỹ nghệ Gợi ý (Prompt Engineering):** Định hình hành vi của AI thông qua System Instruction (Chỉ thị hệ thống) và cấu trúc dữ liệu RAG. Đồng thời thiết lập tham số nhiệt độ (**`temperature = 0.2`**) ở mức rất thấp nhằm triệt tiêu tính sáng tạo tự do của mô hình, đảm bảo tính nhất quán (**deterministic**) và tính chính xác khoa học trong câu trả lời.
3.  **Bộ lọc quy tắc lai (Hybrid Rule-Based Filtering):** Phối hợp lập trình truyền thống (SQL logic quét dị ứng, chống chỉ định, tính tương tự pg_trgm) với LLM. LLM đóng vai trò như một biên dịch viên ngôn ngữ tự nhiên để giải thích, còn CSDL y học cục bộ đóng vai trò là nguồn sự thật quyết định (**Authoritative Source**).

---

## PHẦN III: BẢNG TRA CỨU THUẬT NGỮ CHUYÊN NGÀNH ANH - VIỆT

| Thuật ngữ tiếng Anh | Dịch nghĩa tiếng Việt | Giải thích chi tiết & Ví dụ trong dự án |
| :--- | :--- | :--- |
| **Grounding** | Ràng buộc tri thức / Định vị thông tin | Phương pháp buộc AI chỉ được trả lời dựa trên tập dữ liệu đáng tin cậy được cung cấp sẵn, ngăn chặn ảo giác. |
| **AI Hallucination** | Ảo giác AI | Hiện tượng mô hình ngôn ngữ lớn (LLM) tự bịa ra thông tin không có thật nhưng trình bày rất tự tin. |
| **RAG (Retrieval-Augmented Generation)** | Thế hệ tăng cường truy xuất | Kỹ thuật kết hợp giữa truy xuất dữ liệu từ cơ sở dữ liệu và sức mạnh ngôn ngữ của LLM để tạo ra câu trả lời chuẩn xác. |
| **Fine-Tuning** | Tinh chỉnh mô hình | Quá trình huấn luyện thêm một mô hình đã có sẵn với tập dữ liệu chuyên biệt để thay đổi trọng số của nó. |
| **Prompt Engineering** | Kỹ nghệ gợi ý | Quy trình thiết kế, tối ưu hóa các câu lệnh (prompts) đầu vào để hướng dẫn LLM hoạt động đúng mục tiêu. |
| **System Instruction / System Prompt** | Chỉ thị hệ thống | Câu lệnh gốc quy định vai trò, quy tắc hành vi và giới hạn hoạt động của chatbot AI. |
| **Circuit Breaker** | Bộ ngắt mạch phần mềm | Mẫu thiết kế tự động ngắt kết nối với một dịch vụ bị lỗi liên tiếp để tránh gây nghẽn hệ thống, tự phục hồi sau thời gian cooldown. |
| **Breaker state: Open** | Trạng thái Mạch Hở | Mạch đang ngắt kết nối với dịch vụ chính, các yêu cầu sẽ lập tức chuyển sang dịch vụ dự phòng mà không cần đợi. |
| **Breaker state: Closed** | Trạng thái Mạch Đóng | Mạch hoạt động bình thường, các yêu cầu được chuyển trực tiếp đến dịch vụ chính. |
| **Breaker state: Half-Open** | Trạng thái Mạch Khép Hờ | Mạch thử gửi một vài yêu cầu đến dịch vụ chính sau thời gian hồi để kiểm tra xem dịch vụ đã khôi phục chưa. |
| **Fuzzy Matching** | Đối sánh mờ | Thuật toán tìm kiếm các từ gần đúng hoặc có độ tương tương tự cao thay vì tìm chính xác 100%. |
| **GIN Index (Generalized Inverted Index)** | Chỉ mục nghịch đảo tổng quát | Loại chỉ mục trong database PostgreSQL tối ưu cho việc tìm kiếm văn bản full-text search và đối sánh mờ trigram. |
| **Dice's Coefficient** | Hệ số Dice | Công thức đo lường mức độ tương đồng giữa hai chuỗi ký tự bằng cách chia văn bản thành các cặp ký tự liên tiếp. |
| **Junction Table** | Bảng liên kết trung gian | Bảng dùng để mô hình hóa quan hệ nhiều-nhiều (N:N) giữa hai thực thể trong cơ sở dữ liệu quan hệ. |
| **Database Fallback** | Dự phòng cơ sở dữ liệu | Cơ chế tự động lấy câu trả lời từ dữ liệu tĩnh trong DB khi các dịch vụ AI bên ngoài bị lỗi. |
| **Quality Guard** | Bộ kiểm soát chất lượng phản hồi | Bộ lọc heuristic tự động kiểm tra tính an toàn, tính chính xác và tính toàn vẹn của câu trả lời do AI tạo ra. |
| **Deterministic Response** | Phản hồi nhất quán | Câu trả lời luôn giống nhau với cùng một đầu vào, được sinh ra từ các quy tắc lập trình cứng thay vì suy luận ngẫu nhiên của AI. |
| **Temperature** | Nhiệt độ (trong tham số AI) | Tham số điều khiển mức độ sáng tạo của mô hình AI. Thiết lập gần 0 giúp mô hình trả lời logic, khoa học và nhất quán hơn. |
| **Clinical Tables API** | API Bảng Lâm sàng | Dịch vụ của Thư viện Y khoa Quốc gia Hoa Kỳ cung cấp danh mục chuẩn hóa về triệu chứng và bệnh lý. |
| **openFDA** | Cơ sở dữ liệu FDA mở | Cổng dữ liệu công khai của FDA chứa nhãn thuốc, cảnh báo an toàn và chống chỉ định chính thức. |
