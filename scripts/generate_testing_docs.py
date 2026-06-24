import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def format_cell_bg(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def add_heading_styled(doc, text, level=1):
    heading = doc.add_heading(text, level=level)
    run = heading.runs[0]
    run.font.name = 'Arial'
    if level == 1:
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(12, 35, 64) # Navy Dark #0C2340
        heading.paragraph_format.space_before = Pt(18)
        heading.paragraph_format.space_after = Pt(8)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(30, 70, 110) # Medium Navy
        heading.paragraph_format.space_before = Pt(14)
        heading.paragraph_format.space_after = Pt(6)
    else:
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(51, 51, 51)
        heading.paragraph_format.space_before = Pt(10)
        heading.paragraph_format.space_after = Pt(4)
    return heading

def set_para_font(p, font_name='Arial', size_pt=10.5, line_spacing=1.2):
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_after = Pt(6)
    for run in p.runs:
        run.font.name = font_name
        run.font.size = Pt(size_pt)

def add_paragraph_styled(doc, text="", bold_prefix=None):
    p = doc.add_paragraph()
    if bold_prefix:
        r1 = p.add_run(bold_prefix)
        r1.bold = True
        r1.font.color.rgb = RGBColor(51, 51, 51)
    if text:
        r2 = p.add_run(text)
        r2.font.color.rgb = RGBColor(51, 51, 51)
    set_para_font(p)
    return p

def add_bullet_styled(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(4)
    r1 = p.add_run(bold_prefix)
    r1.bold = True
    r1.font.color.rgb = RGBColor(51, 51, 51)
    r2 = p.add_run(text)
    r2.font.color.rgb = RGBColor(51, 51, 51)
    set_para_font(p)
    return p

def create_testing_docx(filename):
    doc = docx.Document()
    
    # Page setup (Standard 1 inch margins)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Document Title Block
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("QUY TRÌNH KIỂM THỬ PHẦN MỀM CHI TIẾT & BÁO CÁO GIẢI PHÁP HỆ THỐNG\n")
    run.font.name = 'Arial'
    run.font.size = Pt(18)
    run.font.bold = True
    run.font.color.rgb = RGBColor(12, 35, 64)
    
    run_sub = title.add_run("Hệ thống Hỗ trợ Y tế Thông minh — MedAssist AI")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(13)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(80, 80, 80)
    title.paragraph_format.space_after = Pt(20)
    
    # Intro
    add_paragraph_styled(doc, "Hệ thống MedAssist AI là một ứng dụng y khoa đột phá, kết hợp giữa y học lâm sàng và trí tuệ nhân tạo (Generative AI). Để đảm bảo an toàn tính mạng cho người bệnh và tính chính xác thông tin y tế, quy trình kiểm thử phần mềm (Software Testing Process) được thiết lập và vận hành nghiêm ngặt tại cả 3 lớp: Giao diện người dùng (Frontend), API trung gian (Backend) và Động cơ AI (FastAPI AI Service). Tài liệu này trình bày chi tiết về quy trình kiểm thử đó, phân tích các vấn đề dự án giải quyết và cung cấp bảng tra cứu thuật ngữ kiểm thử Anh - Việt chi tiết.")
    
    # PART 1
    add_heading_styled(doc, "PHẦN I: VẤN ĐỀ DỰ ÁN GIẢI QUYẾT & MỨC ĐỘ GIẢI QUYẾT", level=1)
    add_paragraph_styled(doc, "MedAssist AI được thiết kế đặc thù để giải quyết các thách thức y tế và kỹ thuật nghiêm trọng dưới đây:")
    
    add_heading_styled(doc, "1. Chống chỉ định dị ứng thuốc & Sai sót kê đơn (Prescription Errors & Contraindications)", level=2)
    add_paragraph_styled(doc, "• Vấn đề: Bệnh nhân dị ứng với hoạt chất nhưng vô tình dùng phải thuốc chứa hoạt chất đó, hoặc dùng thuốc gây tương tác nguy hiểm với bệnh nền sẵn có (Ví dụ: dùng NSAID khi có bệnh dạ dày). Việc người dùng nhập sai chính tả (ví dụ 'parasetamol' thay vì 'Paracetamol') thường làm trượt các bộ lọc so sánh chuỗi chính xác (exact match).")
    add_paragraph_styled(doc, "• Giải pháp kỹ thuật & Mức độ giải quyết: Hệ thống tích hợp thuật toán đối sánh mờ (Fuzzy Matching) sử dụng GIN Trigram Indexing trên PostgreSQL kết hợp công thức Dice's Coefficient. Giải pháp này rút ngắn thời gian truy vấn ứng viên dị ứng tiềm năng từ O(N) xuống O(15) ứng viên trong vòng dưới 50ms, giúp giải quyết triệt để lỗi gõ sai từ của người dùng phổ thông. Đồng thời hệ thống tự động chặn và cảnh báo các hoạt chất chống chỉ định dựa trên lịch sử bệnh nền của bệnh nhân được lưu trữ trong DB.")
    
    add_heading_styled(doc, "2. Ảo giác AI (AI Hallucinations) trong tư vấn y tế", level=2)
    add_paragraph_styled(doc, "• Vấn đề: Các mô hình ngôn ngữ lớn (LLM) thông thường có xu hướng tự tạo ra thông tin thuốc không có thật hoặc tư vấn cách dùng phản khoa học khi không được ràng buộc dữ liệu nguồn (hallucination).")
    add_paragraph_styled(doc, "• Giải pháp kỹ thuật & Mức độ giải quyết: Áp dụng kiến trúc RAG (Retrieval-Augmented Generation) kết hợp với Disease Graph (Đồ thị bệnh lý) cục bộ. Phản hồi của AI bắt buộc phải đối chiếu (Grounded AI) và lấy thông tin từ database y học chính thức của hệ thống. Mọi đơn thuốc gợi ý từ AI đều đi kèm giải thích rõ ràng (Explainable AI) về cơ chế tác dụng, lý do lựa chọn và danh sách chống chỉ định liên quan.")
    
    add_heading_styled(doc, "3. Sự cố ngắt kết nối API hoặc AI bị quá tải (API Latency & Downtime)", level=2)
    add_paragraph_styled(doc, "• Vấn đề: AI Service từ các nhà cung cấp bên thứ ba (Google Gemini, Groq, Zhipu) có thể bị quá giới hạn lượt gọi (Rate Limit), lỗi kết nối mạng hoặc phản hồi quá lâu (High Latency).")
    add_paragraph_styled(doc, "• Giải pháp kỹ thuật & Mức độ giải quyết: AI Service tự động chuyển đổi giữa Gemini 2.0 Flash (chính), Llama 3.1 8B (dự phòng 1) và GLM 4 (dự phòng 2) nếu phát hiện lỗi hoặc độ trễ vượt ngưỡng bằng thuật toán Multi-Provider Routing & Circuit Breaker. Trong trường hợp xấu nhất khi toàn bộ các nhà cung cấp AI đều sập, hệ thống tự động kích hoạt DatabaseFallbackEngine để trả về hướng dẫn điều trị chuẩn từ Đồ thị Bệnh lý có sẵn trong Database trong vòng dưới 10ms, đảm bảo ứng dụng không bao giờ bị gián đoạn.")
    
    add_heading_styled(doc, "4. Truy vết và Kiểm toán dữ liệu AI (Audit Logging)", level=2)
    add_paragraph_styled(doc, "• Vấn đề: Rất khó để kiểm soát chất lượng và trách nhiệm pháp lý khi AI hoạt động độc lập mà không có nhật ký kiểm tra chi tiết.")
    add_paragraph_styled(doc, "• Giải pháp kỹ thuật & Mức độ giải quyết: Toàn bộ các yêu cầu tư vấn y khoa đều được ghi nhật ký bền vững vào bảng ai_audit_logs, bao gồm: Thời gian phản hồi, Trạng thái định tuyến (Direct/Fallback), Dữ liệu gửi đi/trả về, Lỗi phát sinh. Admin có thể xem trực tiếp các chỉ số này trên giao diện AI Insights để phát hiện kịp thời các câu trả lời lỗi của AI.")

    # PART 2
    add_heading_styled(doc, "PHẦN II: QUY TRÌNH KIỂM THỬ PHẦN MỀM CHI TIẾT (STLC)", level=1)
    add_paragraph_styled(doc, "Quy trình kiểm thử trong MedAssist AI được tổ chức chuyên nghiệp qua 6 giai đoạn cốt lõi của Vòng đời Kiểm thử Phần mềm (STLC - Software Testing Life Cycle):")
    
    add_bullet_styled(doc, "1. Phân tích yêu cầu (Requirement Analysis): ", "Đội ngũ QA phân tích các đặc tả tính năng như: Yêu cầu đăng nhập mạng xã hội (Google, Facebook, Apple ID), kiểm tra triệu chứng y tế, và các tiêu chuẩn bảo mật y tế (chống rò rỉ dữ liệu).")
    add_bullet_styled(doc, "2. Lập kế hoạch kiểm thử (Test Planning): ", "Xác định phạm vi kiểm thử (Scope), tài nguyên, lịch trình và các mức độ kiểm thử áp dụng (Unit, Integration, E2E). Thiết lập chiến lược Mocking cho các dịch vụ bên thứ ba (OAuth API, LLM API).")
    add_bullet_styled(doc, "3. Thiết kế kịch bản kiểm thử (Test Case Design): ", "Viết các Test Cases (kịch bản kiểm thử) cụ thể. Trong dự án, các test case được lập trình hóa thành các đoạn code kiểm thử tự động lưu ở thư mục backend/test (sử dụng module native node:test) và ai-service/tests (sử dụng pytest).")
    add_bullet_styled(doc, "4. Thiết lập môi trường kiểm thử (Test Environment Setup): ", "Chuẩn bị cơ sở dữ liệu test (sử dụng in-memory database mock hoặc Supabase test instance), môi trường Docker/Localhost, và biến môi trường cấu hình trong file .env.test.")
    add_bullet_styled(doc, "5. Thực thi kiểm thử (Test Execution): ", "Chạy các bài test tự động (npm test, pytest) và thực thi các bài test thủ công (Manual Testing) trên giao diện Web. Phát hiện lỗi và ghi nhận lỗi (Bug tracking).")
    add_bullet_styled(doc, "6. Đóng chu kỳ kiểm thử (Test Cycle Closure): ", "Đánh giá xem hệ thống đã đạt tiêu chuẩn bàn giao hay chưa dựa trên các chỉ số như Code Coverage (Độ phủ mã nguồn) và số lượng bug còn tồn đọng.")

    # PART 3
    add_heading_styled(doc, "PHẦN III: CÁC CẤP ĐỘ KIỂM THỬ THỰC TẾ TRONG DỰ ÁN", level=1)
    add_paragraph_styled(doc, "Hệ thống áp dụng mô hình Kim tự tháp Kiểm thử (Testing Pyramid) để đảm bảo chất lượng từ gốc:")
    
    add_heading_styled(doc, "1. Unit Testing (Kiểm thử đơn vị)", level=2)
    add_paragraph_styled(doc, "• Định nghĩa: Kiểm thử các đơn vị logic nhỏ nhất (hàm, lớp) một cách cô lập hoàn toàn.")
    add_paragraph_styled(doc, "• Thực tế trong dự án:")
    add_bullet_styled(doc, "- Backend Node.js (74 test cases): ", "Sử dụng thư viện test tích hợp sẵn của Node.js (node:test). Ví dụ: authService.test.js (kiểm tra thuật toán băm mật khẩu, mã hóa JWT, logic tạo mã OTP ngẫu nhiên); validate.test.js (kiểm tra tính đúng đắn của dữ liệu đầu vào thông qua Joi schema).")
    add_bullet_styled(doc, "- FastAPI AI Service (15 test cases): ", "Sử dụng pytest trong Python. Ví dụ: test_provider_router.py (kiểm tra thuật toán định tuyến LLM giữa các provider Gemini, Groq, GLM); test_chatbot.py (kiểm tra định dạng cấu trúc JSON trả về từ chatbot AI).")
    add_bullet_styled(doc, "- Kỹ thuật Mocking sử dụng: ", "Giả lập Repository (createUserRepoMock) để thực hiện các thao tác đọc/ghi dữ liệu trong RAM thay vì gọi database thật, giúp tăng tốc độ chạy test (dưới 2 giây cho toàn bộ 74 test cases). Giả lập LLM Engines giúp thay thế các cuộc gọi API thực tế tới Google/Groq (tốn phí và có độ trễ lớn) bằng các hàm giả lập trả về chuỗi văn bản mẫu.")
    
    add_heading_styled(doc, "2. Integration Testing (Kiểm thử tích hợp)", level=2)
    add_paragraph_styled(doc, "• Định nghĩa: Kiểm thử sự kết hợp và tương tác giữa nhiều thành phần riêng lẻ trong hệ thống.")
    add_paragraph_styled(doc, "• Thực tế trong dự án:")
    add_bullet_styled(doc, "- Kiểm thử tích hợp API và Database: ", "allergyRoutes.test.js (Kiểm tra xem khi API nhận chuỗi hoạt chất, Controller có gọi đúng AllergyService -> AllergyRepository -> Database để thực hiện truy vấn đối sánh mờ pg_trgm); profileRoutes.test.js (Kiểm tra việc đồng bộ hóa dữ liệu hồ sơ cá nhân người dùng giữa API Backend và cơ sở dữ liệu Supabase, đảm bảo định dạng giới tính tự động chuyển về chữ thường).")
    add_bullet_styled(doc, "- Kiểm thử tích hợp Liên dịch vụ (Cross-service integration): ", "recommendationService.test.js (Kiểm tra tích hợp giữa Node.js backend và FastAPI AI Service. Kiểm tra cơ chế tự động chuyển sang cơ chế dự phòng cục bộ khi AI Service gặp sự cố ngắt kết nối (Simulation of AI timeout)).")
    
    add_heading_styled(doc, "3. End-to-End (E2E) Testing (Kiểm thử toàn trình)", level=2)
    add_paragraph_styled(doc, "• Định nghĩa: Kiểm tra toàn bộ luồng nghiệp vụ từ đầu đến cuối trên môi trường giống thật nhất.")
    add_paragraph_styled(doc, "• Thực tế trong dự án: Thực hiện kiểm thử luồng đăng nhập mạng xã hội (OAuth 2.0). Bắt đầu từ việc người dùng click nút 'Đăng nhập bằng Google/Facebook' trên màn hình Frontend Vercel -> chuyển hướng sang Google OAuth Consent screen -> xác thực tài khoản -> nhận ID Token -> gửi về Backend Railway -> tạo/liên kết tài khoản trong DB Supabase -> chuyển hướng người dùng vào trang Dashboard AI Insights.")

    # PART 4
    add_heading_styled(doc, "PHẦN IV: CÁC PHƯƠNG PHÁP KIỂM THỬ ĐẶC BIỆT & BẢO MẬT", level=1)
    
    add_heading_styled(doc, "1. Kiểm thử bảo mật theo chuẩn OWASP (Security Testing)", level=2)
    add_paragraph_styled(doc, "• Chống dò quét thông tin người dùng (Anti User Enumeration - OWASP V2.7): Khi người dùng đăng nhập sai email, hệ thống trả về thông báo 'Email hoặc mật khẩu không chính xác'. Khi người dùng đăng nhập đúng email nhưng sai mật khẩu, hệ thống trả về cùng một thông điệp lỗi và có thời gian phản hồi tương đương (độ trễ hash bcrypt được đồng bộ hóa), ngăn chặn kẻ tấn công biết được email nào đã tồn tại trong hệ thống. Tương tự đối với luồng Quên mật khẩu.")
    add_paragraph_styled(doc, "• Khóa tài khoản tạm thời (Account Lockout): Hệ thống tự động khóa tài khoản trong 15 phút sau 5 lần đăng nhập sai liên tiếp nhằm chống tấn công dò mật khẩu (Brute-Force Attack). Quy trình này được kiểm thử tự động tại authService.test.js.")
    
    add_heading_styled(doc, "2. Kiểm thử khả năng phục hồi (Resiliency & Fallback Testing)", level=2)
    add_paragraph_styled(doc, "• Circuit Breaker (Bộ ngắt mạch AI): Kiểm tra xem khi Gemini API bị lỗi 2 lần liên tiếp, hệ thống có tự động ngắt mạch trong 30 giây và chuyển toàn bộ yêu cầu sang Groq/Zhipu hay không. Quy trình này được kiểm tra tự động bằng cách mô phỏng lỗi HTTP 500 từ API chính.")
    add_paragraph_styled(doc, "• Database Fallback Engine (Dự phòng CSDL cục bộ): Mô phỏng trường hợp toàn bộ mạng internet bị mất kết nối tới các dịch vụ AI bên ngoài. Kiểm thử chứng minh hệ thống vẫn tự động trích xuất các đề xuất điều trị chuẩn từ đồ thị bệnh lý trong database PostgreSQL nội bộ, đảm bảo tính sẵn sàng 99.9%.")
    
    add_heading_styled(doc, "3. Kiểm thử hồi quy (Regression Testing)", level=2)
    add_paragraph_styled(doc, "Mỗi khi mã nguồn được thay đổi (ví dụ: vá lỗi vòng lặp chuyển hướng trên trang AI Insights), toàn bộ hệ thống kiểm thử tự động npm test và pytest sẽ được kích hoạt thông qua GitHub Actions (CI/CD Pipeline) để phát hiện sớm các lỗi phát sinh ngoài ý muốn trên các phần code khác.")

    # PART 5
    add_heading_styled(doc, "PHẦN V: BẢNG THUẬT NGỮ KIỂM THỬ ANH - VIỆT CHI TIẾT", level=1)
    add_paragraph_styled(doc, "Dưới đây là bảng giải nghĩa chi tiết cho các thuật ngữ tiếng Anh chuyên ngành kiểm thử được sử dụng trong dự án:")
    
    glossary_data = [
        ("Software Testing", "Kiểm thử phần mềm", "Hoạt động kiểm tra xem phần mềm có chạy đúng thiết kế và không có lỗi hay không."),
        ("Unit Test", "Kiểm thử đơn vị", "Kiểm thử các đoạn mã nhỏ nhất (thường là một hàm hoặc một lớp) một cách riêng lẻ. Ví dụ: Test hàm băm mật khẩu bcrypt.hash."),
        ("Integration Test", "Kiểm thử tích hợp", "Kiểm tra xem các thành phần khác nhau khi ghép lại có hoạt động khớp nối với nhau hay không. Ví dụ: Test API gọi Database."),
        ("End-to-End (E2E) Test", "Kiểm thử toàn trình", "Kiểm thử luồng đi của dữ liệu từ giao diện người dùng (Frontend) đến máy chủ (Backend) và Cơ sở dữ liệu."),
        ("Regression Test", "Kiểm thử hồi quy", "Chạy lại các bài test cũ sau khi sửa code để đảm bảo không xuất hiện lỗi mới ở các phần tính năng cũ."),
        ("Manual Testing", "Kiểm thử thủ công", "Tester tự bấm trên màn hình ứng dụng để tìm lỗi mà không dùng code tự động."),
        ("Automated Testing", "Kiểm thử tự động", "Sử dụng mã nguồn để tự động chạy các kịch bản kiểm thử và đối chiếu kết quả."),
        ("Mocking / Mock", "Giả lập đối tượng", "Tạo ra một phiên bản giả của một dịch vụ (như Database hoặc API bên thứ ba) để phục vụ việc test nhanh và độc lập."),
        ("Assertion", "Khẳng định kết quả", "Câu lệnh dùng để so sánh kết quả thực tế với kết quả mong đợi trong code test. Nếu sai, test case sẽ thất bại."),
        ("Test Case", "Kịch bản kiểm thử", "Một tập hợp các điều kiện đầu vào, các bước thực hiện và kết quả mong đợi để kiểm tra một tính năng cụ thể."),
        ("Test Suite", "Tập hợp kịch bản kiểm thử", "Nhóm các test case có liên quan chặt chẽ với nhau (Ví dụ: Test suite dành riêng cho tính năng Đăng nhập)."),
        ("Code Coverage", "Độ phủ mã nguồn", "Tỷ lệ phần trăm số dòng code được chạy qua khi thực hiện các bài test tự động. Chỉ số này thường yêu cầu > 80%."),
        ("Bug / Defect", "Lỗi phần mềm", "Sự sai lệch giữa hành vi thực tế của phần mềm và tài liệu đặc tả yêu cầu."),
        ("Debug / Debugging", "Rà lỗi / Tìm lỗi", "Quy trình cô lập, tìm ra nguyên nhân gây lỗi trong mã nguồn và sửa chữa nó."),
        ("Hallucination", "Ảo giác AI", "Hiện tượng mô hình AI (LLM) bịa ra thông tin không có thật nhưng trình bày rất tự tin."),
        ("Grounded AI", "AI có kiểm chứng", "Phương pháp ràng buộc câu trả lời của AI vào một nguồn dữ liệu đáng tin cậy (như Database y học cục bộ)."),
        ("Circuit Breaker", "Bộ ngắt mạch phần mềm", "Cơ chế tự động ngừng gọi một dịch vụ bị lỗi nhiều lần để tránh làm treo toàn hệ thống, sau đó thử lại sau một khoảng thời gian."),
        ("Rate Limiting", "Giới hạn tần suất", "Cơ chế giới hạn số lượng yêu cầu mà một người dùng có thể gửi lên server trong một khoảng thời gian để chống spam API."),
        ("CORS", "Chia sẻ tài nguyên chéo nguồn gốc", "Cơ chế bảo mật của trình duyệt ngăn chặn việc giao diện ở domain A gọi API ở domain B nếu không được cho phép rõ ràng."),
        ("Payload", "Gói dữ liệu", "Nội dung dữ liệu chính được gửi đi trong một yêu cầu HTTP (Request payload) hoặc phản hồi (Response payload)."),
        ("User Enumeration", "Dò quét tài khoản người dùng", "Lỗi bảo mật cho phép hacker đoán được danh sách email người dùng đã đăng ký thông qua các phản hồi lỗi khác nhau từ hệ thống."),
        ("OAuth 2.0", "Giao thức ủy quyền bảo mật", "Chuẩn xác thực phổ biến cho phép đăng nhập bằng tài khoản Google, Facebook mà không cần chia sẻ mật khẩu."),
        ("GIN Index", "Chỉ mục nghịch đảo tổng quát", "Loại chỉ mục trong database PostgreSQL tối ưu cho việc tìm kiếm văn bản full-text search và đối sánh mờ trigram."),
        ("Trigram", "Nhóm 3 ký tự", "Kỹ thuật chia một từ thành các nhóm 3 ký tự liên tiếp để đo lường độ tương đồng của chuỗi (nhất là khi gõ sai chính tả)."),
        ("Fuzzy Matching", "Đối sánh mờ", "Thuật toán tìm kiếm các từ gần đúng hoặc có độ tương tương tự cao thay vì tìm chính xác 100%."),
        ("Fallback", "Cơ chế dự phòng", "Phương án thay thế tự động được kích hoạt khi phương án chính bị lỗi nhằm giữ cho ứng dụng hoạt động bình thường."),
        ("Joi Validation", "Xác thực dữ liệu (Joi)", "Công cụ kiểm tra định dạng và kiểu dữ liệu đầu vào trên server Node.js trước khi xử lý tiếp."),
        ("JWT (JSON Web Token)", "Mã mã hóa JSON", "Chuỗi ký tự chứa thông tin người dùng được mã hóa gửi kèm mỗi request để xác thực quyền truy cập API."),
        ("OTP", "Mật khẩu dùng một lần", "Mã số bảo mật ngắn hạn được gửi qua Email hoặc SMS để xác thực danh tính người dùng."),
        ("Circuit Breaker: Open", "Trạng thái Mạch Hở", "Mạch đang ngắt kết nối với dịch vụ chính, các yêu cầu sẽ lập tức chuyển sang dịch vụ dự phòng."),
        ("Circuit Breaker: Closed", "Trạng thái Mạch Đóng", "Mạch hoạt động bình thường, các yêu cầu được chuyển trực tiếp đến dịch vụ chính."),
        ("Circuit Breaker: Half-Open", "Trạng thái Mạch Khép Hờ", "Mạch thử gửi một vài yêu cầu đến dịch vụ chính sau thời gian hồi để kiểm tra xem dịch vụ đã khôi phục chưa.")
    ]
    
    # Table for Glossary
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Light Shading Accent 1'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Thuật ngữ tiếng Anh'
    hdr_cells[1].text = 'Dịch nghĩa tiếng Việt'
    hdr_cells[2].text = 'Giải thích chi tiết & Ví dụ trong dự án'
    
    for cell in hdr_cells:
        format_cell_bg(cell, "0C2340")
        set_cell_margins(cell)
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        cell.paragraphs[0].runs[0].font.name = 'Arial'
        cell.paragraphs[0].runs[0].font.size = Pt(10.5)

    for eng, vie, exp in glossary_data:
        row_cells = table.add_row().cells
        row_cells[0].text = eng
        row_cells[1].text = vie
        row_cells[2].text = exp
        for cell in row_cells:
            set_cell_margins(cell)
            for p in cell.paragraphs:
                set_para_font(p, size_pt=9.5)
                
    doc.save(filename)

def create_testing_md(filename):
    content = """# Tài liệu Quy trình Kiểm thử Phần mềm Chi tiết & Báo cáo Dự án
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
"""
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    print("Generating deliverables files...")
    # Make sure output directories exist
    os.makedirs("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables", exist_ok=True)
    
    # Generate Markdown File
    create_testing_md("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables/Quy_Trinh_Kiem_Thu_Phan_Mem.md")
    print("Markdown file generated at: docs/deliverables/Quy_Trinh_Kiem_Thu_Phan_Mem.md")
    
    # Generate Word Document File
    create_testing_docx("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables/Quy_Trinh_Kiem_Thu_Phan_Mem.docx")
    print("Word Document generated at: docs/deliverables/Quy_Trinh_Kiem_Thu_Phan_Mem.docx")
    print("Generation complete!")
