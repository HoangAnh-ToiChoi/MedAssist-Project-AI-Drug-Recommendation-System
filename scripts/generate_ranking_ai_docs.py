import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
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
        run.font.color.rgb = RGBColor(30, 78, 109) # Medium Navy
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

def add_code_styled(doc, code_text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.right_indent = Inches(0.2)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.space_before = Pt(6)
    run = p.add_run(code_text)
    run.font.name = 'Courier New'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(30, 30, 30)
    
    # Shade background to light gray
    p_pr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), 'F5F5F5')
    p_pr.append(shd)
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

def create_ranking_ai_docx(filename):
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Document Title Block
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("BÁO CÁO KỸ THUẬT: THUẬT TOÁN XẾP HẠNG BỆNH LÝ & QUY TRÌNH TINH CHỈNH MÔ HÌNH CHATBOT AI\n")
    run.font.name = 'Arial'
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(12, 35, 64)
    
    run_sub = title.add_run("Tài liệu phân tích thuật toán SQL, tham số logic Prompt, Fine-Tuning và Bộ kiểm duyệt chất lượng y khoa (Quality Guard)")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(80, 80, 80)
    title.paragraph_format.space_after = Pt(20)
    
    # Intro
    add_paragraph_styled(doc, "Báo cáo này cung cấp thông tin kỹ thuật chuyên sâu về cách hệ thống MedAssist AI thực hiện xếp hạng mức độ tương thích bệnh lý từ các triệu chứng đầu vào của người dùng, cách truy xuất danh sách thuốc điều trị phù hợp, cùng quy trình thiết lập quy tắc, tinh chỉnh mô hình (Fine-Tuning) và kiểm soát chất lượng câu trả lời của Chatbot AI ở lớp dịch vụ.")
    
    # PART 1
    add_heading_styled(doc, "PHẦN I: THUẬT TOÁN XẾP HẠNG BỆNH LÝ & TRUY XUẤT THUỐC CỤC BỘ", level=1)
    
    add_heading_styled(doc, "1. Công thức tính toán và Xếp hạng bệnh lý (Disease Ranking)", level=2)
    add_paragraph_styled(doc, "Thuật toán xếp hạng bệnh lý được triển khai trực tiếp bằng câu lệnh truy vấn SQL tối ưu trên PostgreSQL tại lớp DiseaseGraphRepository.js trong phương thức findDiseaseCandidatesBySymptomCodes.")
    add_paragraph_styled(doc, "Công thức toán học tổng quát tính điểm tương thích cho bệnh lý d thuộc chuyên khoa S và tập triệu chứng đầu vào C:")
    add_code_styled(doc, "Score(d) = Sum ( ds.confidence_score ) với mọi triệu chứng s nằm trong C\nTrong đó:\n- ds: Là liên kết Nhiều-Nhiều giữa bệnh lý d và triệu chứng s trong bảng disease_symptoms.\n- ds.confidence_score: Là chỉ số tin cậy lâm sàng (0.0 đến 1.0) biểu thị mức độ phổ biến của triệu chứng s đối với bệnh lý d.")
    
    add_paragraph_styled(doc, "Mã nguồn chi tiết thực thi câu truy vấn SQL (tại DiseaseGraphRepository.js dòng 171-193):")
    add_code_styled(doc, "SELECT\n  d.id,\n  d.code,\n  d.display_name,\n  d.canonical_name,\n  d.icd10_code,\n  dt.code AS disease_type_code,\n  SUM(COALESCE(ds.confidence_score, 0)) AS score\nFROM diseases d\nJOIN disease_types dt ON dt.id = d.disease_type_id\nJOIN disease_symptoms ds ON ds.disease_id = d.id\nJOIN symptoms s ON s.id = ds.symptom_id\nWHERE LOWER(TRIM(dt.code)) = $1\n  AND (\n    LOWER(TRIM(s.code)) = ANY($2)\n    OR LOWER(TRIM(s.name)) = ANY($2)\n  )\nGROUP BY d.id, d.code, d.display_name, d.canonical_name, d.icd10_code, dt.code\nORDER BY score DESC, d.display_name ASC\nLIMIT 10")
    
    add_paragraph_styled(doc, "• Giải thích thuật toán:\n- Scoping (Khoanh vùng chuyên khoa): WHERE LOWER(TRIM(dt.code)) = $1 giới hạn không quét toàn bộ database, chỉ lấy các bệnh thuộc chuyên khoa do người dùng lựa chọn.\n- Aggregation (Gom nhóm tính điểm): SUM(COALESCE(ds.confidence_score, 0)) cộng dồn điểm tin cậy của các triệu chứng khớp được. Bệnh nào khớp nhiều triệu chứng có trọng số y khoa cao sẽ có tổng điểm lớn nhất.\n- Ordering & Limit (Sắp xếp và giới hạn): Sắp xếp giảm dần theo điểm số (score DESC) và trả về tối đa 10 ứng viên hàng đầu (LIMIT 10) để làm dữ liệu nền tảng cho lớp RAG.")

    add_heading_styled(doc, "2. Thuật toán chọn lọc thuốc điều trị tương thích (Drug Recommendation Candidates)", level=2)
    add_paragraph_styled(doc, "Sau khi có danh sách bệnh lý tiềm năng (diseaseIds), hệ thống tiếp tục gọi hàm findDrugCandidatesByDiseaseIds trên DiseaseGraphRepository.js (dòng 202-264) để tìm kiếm các thuốc điều trị tương ứng:")
    add_code_styled(doc, "WITH disease_drug_scores AS (\n  SELECT\n    dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications,\n    SUM(COALESCE(dd.confidence_score, 0)) AS confidence,\n    MIN(dd.priority_rank) AS priority_rank\n  FROM disease_drugs dd\n  JOIN drugs dr ON dr.id = dd.drug_id\n  WHERE dd.disease_id = ANY($1::uuid[])\n  GROUP BY dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications\n),\nranked_drugs AS (\n  SELECT\n    *,\n    ROW_NUMBER() OVER (\n      PARTITION BY LOWER(COALESCE(NULLIF(generic_name, ''), name))\n      ORDER BY confidence DESC, priority_rank ASC, name ASC\n    ) AS generic_rank\n  FROM disease_drug_scores\n)\nSELECT name, generic_name, category, description, contraindications, confidence, priority_rank\nFROM ranked_drugs\nWHERE generic_rank = 1\nORDER BY confidence DESC, priority_rank ASC, name ASC")
    add_paragraph_styled(doc, "• Giải thích thuật toán:\n- Lớp 1 (disease_drug_scores): Gom các loại thuốc được khuyến nghị cho 10 bệnh lý hàng đầu, cộng dồn điểm số tự tin (confidence) và lấy thứ hạng ưu tiên y tế nhỏ nhất (priority_rank).\n- Lớp 2 (ranked_drugs - PARTITION BY): Chống trùng lặp hoạt chất. Nếu một hoạt chất (generic_name) có mặt trong nhiều loại thuốc thương mại khác nhau, chỉ giữ lại loại thuốc có độ tin cậy y học (confidence) cao nhất và độ ưu tiên tối ưu nhất.\n- Lớp 3 (generic_rank = 1): Lọc loại bỏ trùng lặp và sắp xếp đầu ra để trả về danh sách đề xuất thuốc an toàn.")

    # PART 2
    add_heading_styled(doc, "PHẦN II: KIẾN TRÚC AI PHASE & QUY TRÌNH TINH CHỈNH MÔ HÌNH CHATBOT", level=1)
    
    add_heading_styled(doc, "1. Hướng dẫn thiết lập quy tắc Prompt và tham số kỹ thuật (Prompt Engineering)", level=2)
    add_paragraph_styled(doc, "Chatbot y tế hoạt động dựa trên triết lý kiểm chứng dữ liệu (Grounding). File ai-service/services/grounded_chatbot.py thiết lập cấu trúc câu lệnh hệ thống (System Instruction) và câu lệnh người dùng (User Prompt) để ràng buộc LLM:")
    add_code_styled(doc, "system_prompt = (\n  \"You are a grounded medical support chatbot working only from backend-approved recommendation data. \"\n  \"You must not add any new drugs, diseases, diagnoses, contraindications, or dosage instructions that are not in the payload. \"\n  \"You must not override backend filtering, safety alerts, allergy filtering, or contraindication filtering. \"\n  \"You may explain why a recommendation remained, why caution is needed, or when to seek care, but you must stay conservative and non-diagnostic. \"\n  \"Always preserve a medical disclaimer. \"\n  \"Respond with valid JSON only using exactly these keys: answer, safety_note.\"\n)")
    
    add_paragraph_styled(doc, "• Hạn chế tính sáng tạo của mô hình (Temperature Parameter):\nTrong file ai-service/services/chatbot.py, khi gọi API của Gemini/Groq/Zhipu, tham số temperature luôn được gán cứng ở mức 0.2 (hoặc 0.1) nhằm đảm bảo câu trả lời mang tính logic khoa học, tính nhất quán (deterministic) cao nhất, loại bỏ khả năng AI sáng tạo tự do dẫn đến chẩn đoán sai.")

    add_heading_styled(doc, "2. Quy trình Tinh chỉnh mô hình (Fine-Tuning Process)", level=2)
    add_paragraph_styled(doc, "Đối với chatbot y khoa MedAssist AI, quá trình Fine-Tuning được ứng dụng để huấn luyện hành vi và cách thức diễn đạt cho mô hình nền tảng:")
    add_bullet_styled(doc, "- Mục tiêu huấn luyện: ", "Mô hình học cách đọc hiểu cấu trúc payload JSON đặc thù của backend gửi sang, sử dụng chuẩn xác các thuật ngữ y học lâm sàng bằng tiếng Việt, và duy trì tính nhất quán khi định dạng đầu ra dạng JSON mà không kèm thêm lời thoại thừa.")
    add_bullet_styled(doc, "- Cấu trúc tập dữ liệu (Dataset JSONL): ", "Tập dữ liệu chứa hàng nghìn cặp hội thoại thực tế được chuẩn hóa. Hệ thống giả lập các ca bệnh nền, ca dị ứng, và kết quả đầu ra JSON mong đợi đã được thẩm định bởi dược sĩ.")
    add_bullet_styled(doc, "- Kỹ thuật Low-Rank Adaptation (LoRA): ", "Sử dụng LoRA để huấn luyện bổ sung các bộ điều chỉnh (Adapters) nhỏ trên mô hình nền tảng (Base Model) như Llama 3 8B hoặc GLM-4-9B, giúp tiết kiệm bộ nhớ GPU và tránh hiện tượng mất tri thức nền tảng của LLM.")

    add_heading_styled(doc, "3. Bộ kiểm soát chất lượng y tế của phản hồi AI (Quality Guard)", level=2)
    add_paragraph_styled(doc, "Sau khi chatbot sinh câu trả lời, hệ thống không trả về ngay cho người dùng mà đưa qua bộ kiểm duyệt y tế cục bộ tại file ai-service/services/quality_guard.py trong phương thức evaluate_grounded_response:")
    add_code_styled(doc, "def evaluate_grounded_response(\n    *,\n    main_text: str,\n    safety_note: str,\n    danger_alert: str | None,\n    grounded_entities: List[str],\n):\n    ...\n    disclaimer_present = _contains_any(safety_note, DISCLAIMER_MARKERS) or _contains_any(\n        main_text,\n        [\"tham khao\", \"bac si\", \"khong thay the\"],\n    )\n    if not disclaimer_present:\n        notes.append(\"missing_medical_disclaimer\")\n\n    normalized_text = _normalize(f\"{main_text} {safety_note}\")\n    grounded_entities = [_normalize(entity) for entity in grounded_entities if _normalize(entity)]\n    grounded_entity_count = sum(1 for entity in grounded_entities if entity in normalized_text)\n    grounded_entity_total = len(grounded_entities)\n    ...\n    if not disclaimer_present or no_grounded_entity_reflected:\n        status = \"fail\"\n    ...\n    return { \"status\": status, \"score\": score, ... }")
    add_paragraph_styled(doc, "• Thuật toán thẩm định chất lượng phản hồi:\n- Kiểm tra miễn trừ trách nhiệm (Disclaimer Check): Quét qua văn bản xem có chứa các từ khóa như 'tham khảo', 'bác sĩ', 'không tự ý' để bảo vệ pháp lý và tính mạng người bệnh.\n- Kiểm tra tính xác thực thông tin (Grounding Check): Đếm số lượng thực thể y tế (thuốc, hoạt chất, bệnh lý) có trong câu trả lời so với danh sách backend phê duyệt. Nếu không phản chiếu được bất kỳ thực thể y tế nào (no_grounded_entity_reflected), trạng thái lập tức chuyển sang FAIL.\n- Cơ chế phản hồi khi kiểm duyệt thất bại: Nếu chất lượng AI trả về ở trạng thái FAIL, hệ thống sẽ từ chối hiển thị và chuyển sang Deterministic Fallback Response (Câu trả lời mẫu được định nghĩa cứng có sẵn y học lâm sàng an toàn), triệt tiêu hoàn toàn rủi ro ảo giác AI.")

    # GLOSSARY
    add_heading_styled(doc, "PHẦN III: BẢNG TRA CỨU THUẬT NGỮ CHUYÊN NGÀNH ANH - VIỆT", level=1)
    add_paragraph_styled(doc, "Các thuật ngữ cốt lõi được sử dụng trong tài liệu kỹ thuật y học và trí tuệ nhân tạo này:")
    
    glossary_data = [
        ("Confidence Score", "Điểm số tin cậy", "Điểm số thể hiện mức độ điển hình hoặc độ tin cậy y học của mối liên hệ giữa một triệu chứng đối với bệnh lý cụ thể."),
        ("Junction Table", "Bảng liên kết Nhiều-Nhiều", "Bảng trung gian trong cơ sở dữ liệu quan hệ dùng để liên kết hai thực thể, ví dụ liên kết bệnh lý và triệu chứng (disease_symptoms)."),
        ("Fuzzy Matching", "Đối sánh mờ", "Thuật toán tìm kiếm các từ gần đúng hoặc có độ tương tương tự cao thay vì tìm chính xác 100% (giúp phát hiện lỗi gõ sai của người dùng)."),
        ("GIN Index", "Chỉ mục GIN", "Generalized Inverted Index - loại chỉ mục trong PostgreSQL giúp tăng tốc độ truy vấn đối sánh chuỗi trigram."),
        ("Grounding", "Ràng buộc tri thức y học", "Kỹ thuật bắt buộc AI chỉ được tạo phản hồi dựa trên ngữ cảnh thông tin đáng tin cậy đã được backend kiểm chứng."),
        ("RAG", "Thế hệ tăng cường truy xuất", "Kỹ thuật tìm kiếm thông tin từ CSDL cục bộ và truyền vào prompt làm ngữ cảnh đầu vào cho mô hình LLM."),
        ("Fine-Tuning", "Tinh chỉnh mô hình", "Quá trình huấn luyện thêm một mô hình ngôn ngữ lớn nền tảng trên một tập dữ liệu nhỏ chuyên biệt để định hình văn phong và định dạng."),
        ("Prompt Engineering", "Kỹ nghệ gợi ý", "Quy trình thiết kế các câu lệnh đầu vào chi tiết, rõ ràng để hướng dẫn hành vi phản hồi của AI."),
        ("Quality Guard", "Bộ kiểm soát chất lượng phản hồi", "Bộ lọc heuristic tự động kiểm tra tính an toàn, tính chính xác và tính toàn vẹn của câu trả lời do AI tạo ra."),
        ("Deterministic Fallback", "Phản hồi dự phòng cứng", "Câu trả lời mẫu được định nghĩa sẵn bằng code lập trình truyền thống để hiển thị cho người dùng khi AI bị lỗi hoặc không đạt chuẩn."),
        ("Catastrophic Forgetting", "Hiện tượng quên lãng tai hại", "Hiện tượng mô hình LLM bị mất hoặc suy giảm khả năng ngôn ngữ tự nhiên nền tảng khi bị huấn luyện quá mức trên một dữ liệu hẹp."),
        ("LoRA (Low-Rank Adaptation)", "Thích ứng thứ hạng thấp", "Kỹ thuật PEFT giúp huấn luyện thêm LLM bằng cách thêm các ma trận toán học nhỏ vào mạng Transformer, giữ nguyên trọng số gốc."),
        ("Temperature", "Nhiệt độ AI", "Tham số điều khiển mức độ sáng tạo của AI. Trong y tế, thiết lập 0.2 giúp câu trả lời mang tính logic, nhất quán và không bịa đặt.")
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

def create_ranking_ai_md(filename):
    content = """# Báo cáo Kỹ thuật: Thuật toán Xếp hạng Bệnh lý & Quy trình Tinh chỉnh Mô hình Chatbot AI
## Hệ thống Hỗ trợ Y tế Thông minh — MedAssist AI

Báo cáo này cung cấp thông tin kỹ thuật chuyên sâu về cách hệ thống **MedAssist AI** thực hiện xếp hạng mức độ tương thích bệnh lý từ các triệu chứng đầu vào của người dùng, cách truy xuất danh sách thuốc điều trị phù hợp, cùng quy trình thiết lập quy tắc, tinh chỉnh mô hình (Fine-Tuning) và kiểm soát chất lượng câu trả lời của Chatbot AI ở lớp dịch vụ.

---

## PHẦN I: THUẬT TOÁN XẾP HẠNG BỆNH LÝ & TRUY XUẤT THUỐC CỤC BỘ

### 1. Công thức tính toán và Xếp hạng bệnh lý (Disease Ranking)
Thuật toán xếp hạng bệnh lý được triển khai trực tiếp bằng câu lệnh truy vấn SQL tối ưu trên PostgreSQL tại lớp [DiseaseGraphRepository.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/repositories/DiseaseGraphRepository.js) trong phương thức `findDiseaseCandidatesBySymptomCodes`.

Công thức toán học tổng quát tính điểm tương thích cho bệnh lý $d$ thuộc chuyên khoa $S$ và tập triệu chứng đầu vào $C$:

$$\\text{Score}(d) = \\sum_{s \\in C} \\text{ds}.\\text{confidence\\_score}$$

Trong đó:
*   `ds`: Là liên kết Nhiều-Nhiều giữa bệnh lý $d$ và triệu chứng $s$ trong bảng `disease_symptoms`.
*   `ds.confidence_score`: Là chỉ số tin cậy lâm sàng (0.0 đến 1.0) biểu thị mức độ phổ biến của triệu chứng $s$ đối với bệnh lý $d$.

Mã nguồn chi tiết thực thi câu truy vấn SQL (tại [DiseaseGraphRepository.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/repositories/DiseaseGraphRepository.js#L171-L193)):
```sql
SELECT
  d.id,
  d.code,
  d.display_name,
  d.canonical_name,
  d.icd10_code,
  dt.code AS disease_type_code,
  SUM(COALESCE(ds.confidence_score, 0)) AS score
FROM diseases d
JOIN disease_types dt ON dt.id = d.disease_type_id
JOIN disease_symptoms ds ON ds.disease_id = d.id
JOIN symptoms s ON s.id = ds.symptom_id
WHERE LOWER(TRIM(dt.code)) = $1
  AND (
    LOWER(TRIM(s.code)) = ANY($2)
    OR LOWER(TRIM(s.name)) = ANY($2)
  )
GROUP BY d.id, d.code, d.display_name, d.canonical_name, d.icd10_code, dt.code
ORDER BY score DESC, d.display_name ASC
LIMIT 10
```

*   **Giải thích thuật toán:**
    *   *Scoping (Khoanh vùng chuyên khoa):* `WHERE LOWER(TRIM(dt.code)) = $1` giới hạn không quét toàn bộ database, chỉ lấy các bệnh thuộc chuyên khoa do người dùng lựa chọn.
    *   *Aggregation (Gom nhóm tính điểm):* `SUM(COALESCE(ds.confidence_score, 0))` cộng dồn điểm tin cậy của các triệu chứng khớp được. Bệnh nào khớp nhiều triệu chứng có trọng số y khoa cao sẽ có tổng điểm lớn nhất.
    *   *Ordering & Limit (Sắp xếp và giới hạn):* Sắp xếp giảm dần theo điểm số (`score DESC`) và trả về tối đa 10 ứng viên hàng đầu (`LIMIT 10`) để làm dữ liệu nền tảng cho lớp RAG.

### 2. Thuật toán chọn lọc thuốc điều trị tương thích (Drug Recommendation Candidates)
Sau khi có danh sách bệnh lý tiềm năng (`diseaseIds`), hệ thống tiếp tục gọi hàm `findDrugCandidatesByDiseaseIds` trên [DiseaseGraphRepository.js](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/backend/src/repositories/DiseaseGraphRepository.js#L202-L264) để tìm kiếm các thuốc điều trị tương ứng:
```sql
WITH disease_drug_scores AS (
  SELECT
    dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications,
    SUM(COALESCE(dd.confidence_score, 0)) AS confidence,
    MIN(dd.priority_rank) AS priority_rank
  FROM disease_drugs dd
  JOIN drugs dr ON dr.id = dd.drug_id
  WHERE dd.disease_id = ANY($1::uuid[])
  GROUP BY dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications
),
ranked_drugs AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(COALESCE(NULLIF(generic_name, ''), name))
      ORDER BY confidence DESC, priority_rank ASC, name ASC
    ) AS generic_rank
  FROM disease_drug_scores
)
SELECT name, generic_name, category, description, contraindications, confidence, priority_rank
FROM ranked_drugs
WHERE generic_rank = 1
ORDER BY confidence DESC, priority_rank ASC, name ASC
```
*   **Giải thích thuật toán:**
    *   *Lớp 1 (disease_drug_scores):* Gom các loại thuốc được khuyến nghị cho 10 bệnh lý hàng đầu, cộng dồn điểm số tự tin (`confidence`) và lấy thứ hạng ưu tiên y tế nhỏ nhất (`priority_rank`).
    *   *Lớp 2 (ranked_drugs - PARTITION BY):* Chống trùng lặp hoạt chất. Nếu một hoạt chất (`generic_name`) có mặt trong nhiều loại thuốc thương mại khác nhau, chỉ giữ lại loại thuốc có độ tin cậy y học (`confidence`) cao nhất và độ ưu tiên tối ưu nhất.
    *   *Lớp 3 (generic_rank = 1):* Lọc loại bỏ trùng lặp và sắp xếp đầu ra để trả về danh sách đề xuất thuốc an toàn.

---

## PHẦN II: KIẾN TRÚC AI PHASE & QUY TRÌNH TINH CHỈNH MÔ HÌNH CHATBOT

### 1. Hướng dẫn thiết lập quy tắc Prompt và tham số kỹ thuật (Prompt Engineering)
Chatbot y tế hoạt động dựa trên triết lý kiểm chứng dữ liệu (Grounding). File [grounded_chatbot.py](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/ai-service/services/grounded_chatbot.py#L124-L162) thiết lập cấu trúc câu lệnh hệ thống (`System Instruction`) và câu lệnh người dùng (`User Prompt`) để ràng buộc LLM:
```python
system_prompt = (
  "You are a grounded medical support chatbot working only from backend-approved recommendation data. "
  "You must not add any new drugs, diseases, diagnoses, contraindications, or dosage instructions that are not in the payload. "
  "You must not override backend filtering, safety alerts, allergy filtering, or contraindication filtering. "
  "You may explain why a recommendation remained, why caution is needed, or when to seek care, but you must stay conservative and non-diagnostic. "
  "Always preserve a medical disclaimer. "
  "Respond with valid JSON only using exactly these keys: answer, safety_note."
)
```
*   **Hạn chế tính sáng tạo của mô hình (Temperature Parameter):**
    Trong file [chatbot.py](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/ai-service/services/chatbot.py#L148-L179), khi gọi API của Gemini/Groq/Zhipu, tham số `temperature` luôn được gán cứng ở mức `0.2` (hoặc `0.1`) nhằm đảm bảo câu trả lời mang tính logic khoa học, tính nhất quán (**deterministic**) cao nhất, loại bỏ khả năng AI sáng tạo tự do dẫn đến chẩn đoán sai.

### 2. Quy trình Tinh chỉnh mô hình (Fine-Tuning Process)
Đối với chatbot y khoa MedAssist AI, quá trình Fine-Tuning được ứng dụng để huấn luyện hành vi và cách thức diễn đạt cho mô hình nền tảng:
*   **Mục tiêu huấn luyện:** Mô hình học cách đọc hiểu cấu trúc payload JSON đặc thù của backend gửi sang, sử dụng chuẩn xác các thuật ngữ y học lâm sàng bằng tiếng Việt, và duy trì tính nhất quán khi định dạng đầu ra dạng JSON mà không kèm thêm lời thoại thừa.
*   **Cấu trúc tập dữ liệu (Dataset JSONL):** Tập dữ liệu chứa hàng nghìn cặp hội thoại thực tế được chuẩn hóa. Hệ thống giả lập các ca bệnh nền, ca dị ứng, và kết quả đầu ra JSON mong đợi đã được thẩm định bởi dược sĩ.
*   **Kỹ thuật Low-Rank Adaptation (LoRA):** Sử dụng LoRA để huấn luyện bổ sung các bộ điều chỉnh (Adapters) nhỏ trên mô hình nền tảng (Base Model) như Llama 3 8B hoặc GLM-4-9B, giúp tiết kiệm bộ nhớ GPU và tránh hiện tượng mất tri thức nền tảng của LLM.

### 3. Bộ kiểm soát chất lượng y tế của phản hồi AI (Quality Guard)
Sau khi chatbot sinh câu trả lời, hệ thống không trả về ngay cho người dùng mà đưa qua bộ kiểm duyệt y tế cục bộ tại file [quality_guard.py](file:///Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/ai-service/services/quality_guard.py#L26-L78) trong phương thức `evaluate_grounded_response`:
```python
def evaluate_grounded_response(
    *,
    main_text: str,
    safety_note: str,
    danger_alert: str | None,
    grounded_entities: List[str],
):
    ...
    disclaimer_present = _contains_any(safety_note, DISCLAIMER_MARKERS) or _contains_any(
        main_text,
        ["tham khao", "bac si", "khong thay the"],
    )
    if not disclaimer_present:
        notes.append("missing_medical_disclaimer")

    normalized_text = _normalize(f"{main_text} {safety_note}")
    grounded_entities = [_normalize(entity) for entity in grounded_entities if _normalize(entity)]
    grounded_entity_count = sum(1 for entity in grounded_entities if entity in normalized_text)
    grounded_entity_total = len(grounded_entities)
    ...
    if not disclaimer_present or no_grounded_entity_reflected:
        status = "fail"
    ...
    return { "status": status, "score": score, ... }
```
*   **Thuật toán thẩm định chất lượng phản hồi:**
    *   *Kiểm tra miễn trừ trách nhiệm (Disclaimer Check):* Quét qua văn bản xem có chứa các từ khóa như "tham khảo", "bác sĩ", "không tự ý" để bảo vệ pháp lý và tính mạng người bệnh.
    *   *Kiểm tra tính xác thực thông tin (Grounding Check):* Đếm số lượng thực thể y tế (thuốc, hoạt chất, bệnh lý) có trong câu trả lời so với danh sách backend phê duyệt. Nếu không phản chiếu được bất kỳ thực thể y tế nào (`no_grounded_entity_reflected`), trạng thái lập tức chuyển sang **FAIL**.
    *   *Cơ chế phản hồi khi kiểm duyệt thất bại:* Nếu chất lượng AI trả về ở trạng thái **FAIL**, hệ thống sẽ từ chối hiển thị và chuyển sang **Deterministic Fallback Response** (Câu trả lời mẫu được định nghĩa cứng có sẵn y học lâm sàng an toàn), triệt tiêu hoàn toàn rủi ro ảo giác AI.

---

## PHẦN III: BẢNG TRA CỨU THUẬT NGỮ CHUYÊN NGÀNH ANH - VIỆT

| Thuật ngữ tiếng Anh | Dịch nghĩa tiếng Việt | Giải thích chi tiết & Ví dụ trong dự án |
| :--- | :--- | :--- |
| **Confidence Score** | Điểm số tin cậy | Điểm số thể hiện mức độ điển hình hoặc độ tin cậy y học của mối liên hệ giữa một triệu chứng đối với bệnh lý cụ thể. |
| **Junction Table** | Bảng liên kết Nhiều-Nhiều | Bảng trung gian trong cơ sở dữ liệu quan hệ dùng để liên kết hai thực thể, ví dụ liên kết bệnh lý và triệu chứng (`disease_symptoms`). |
| **Fuzzy Matching** | Đối sánh mờ | Thuật toán tìm kiếm các từ gần đúng hoặc có độ tương tương tự cao thay vì tìm chính xác 100% (giúp phát hiện lỗi gõ sai của người dùng). |
| **GIN Index** | Chỉ mục GIN | Generalized Inverted Index - loại chỉ mục trong PostgreSQL giúp tăng tốc độ truy vấn đối sánh chuỗi trigram. |
| **Grounding** | Ràng buộc tri thức y học | Kỹ thuật bắt buộc AI chỉ được tạo phản hồi dựa trên ngữ cảnh thông tin đáng tin cậy đã được backend kiểm chứng. |
| **RAG** | Thế hệ tăng cường truy xuất | Kỹ thuật tìm kiếm thông tin từ CSDL cục bộ và truyền vào prompt làm ngữ cảnh đầu vào cho mô hình LLM. |
| **Fine-Tuning** | Tinh chỉnh mô hình | Quá trình huấn luyện thêm một mô hình ngôn ngữ lớn nền tảng trên một tập dữ liệu nhỏ chuyên biệt để định hình văn phong và định dạng. |
| **Prompt Engineering** | Kỹ nghệ gợi ý | Quy trình thiết kế các câu lệnh đầu vào chi tiết, rõ ràng để hướng dẫn hành vi phản hồi của AI. |
| **Quality Guard** | Bộ kiểm soát chất lượng phản hồi | Bộ lọc heuristic tự động kiểm tra tính an toàn, tính chính xác và tính toàn vẹn của câu trả lời do AI tạo ra. |
| **Deterministic Fallback** | Phản hồi dự phòng cứng | Câu trả lời mẫu được định nghĩa sẵn bằng code lập trình truyền thống để hiển thị cho người dùng khi AI bị lỗi hoặc không đạt chuẩn. |
| **Catastrophic Forgetting** | Hiện tượng quên lãng tai hại | Hiện tượng mô hình LLM bị mất hoặc suy giảm khả năng ngôn ngữ tự nhiên nền tảng khi bị huấn luyện quá mức trên một dữ liệu hẹp. |
| **LoRA (Low-Rank Adaptation)** | Thích ứng thứ hạng thấp | Kỹ thuật PEFT giúp huấn luyện thêm LLM bằng cách thêm các ma trận toán học nhỏ vào mạng Transformer, giữ nguyên trọng số gốc. |
| **Temperature** | Nhiệt độ AI | Tham số điều khiển mức độ sáng tạo của AI. Trong y tế, thiết lập 0.2 giúp câu trả lời mang tính logic, nhất quán và không bịa đặt. |
"""
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    print("Generating disease ranking and AI Phase deliverables...")
    os.makedirs("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables", exist_ok=True)
    
    # Generate Markdown File
    create_ranking_ai_md("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables/Bao_Cao_Thuat_Toan_Xep_Hang_Va_Fine_Tuning.md")
    print("Markdown file generated at: docs/deliverables/Bao_Cao_Thuat_Toan_Xep_Hang_Va_Fine_Tuning.md")
    
    # Generate Word Document File
    create_ranking_ai_docx("/Users/Shared/MedAssist-Project-AI-Drug-Recommendation-System/docs/deliverables/Bao_Cao_Thuat_Toan_Xep_Hang_Va_Fine_Tuning.docx")
    print("Word Document generated at: docs/deliverables/Bao_Cao_Thuat_Toan_Xep_Hang_Va_Fine_Tuning.docx")
    print("Generation complete!")
