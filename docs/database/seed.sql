-- ============================================================
-- MedAssist AI — Seed Data v1.0
-- Chạy file này trong Supabase SQL Editor SAU KHI chạy schema.sql
--
-- AN TOÀN KHI CHẠY NHIỀU LẦN:
--   - Symptoms/Drugs: ON CONFLICT DO UPDATE (cập nhật nếu thiếu data)
--   - Drug_symptoms : ON CONFLICT DO NOTHING (bỏ qua nếu đã có)
--
-- Nếu đã import CSV vào Supabase:
--   - symptoms  : file này sẽ cập nhật/bổ sung thêm nếu thiếu
--   - drugs     : file này sẽ bỏ qua nếu tên thuốc đã tồn tại
--   - mappings  : CSV import KHÔNG tạo được drug_symptoms vì cần UUID
--                 → file này sẽ tạo đúng các mapping dựa trên code/name
-- ============================================================

-- Unique index cho drugs.name để hỗ trợ ON CONFLICT (nếu chưa có)
CREATE UNIQUE INDEX IF NOT EXISTS idx_drugs_name_unique ON drugs(name);

-- ============================================================
-- BƯỚC 1: SYMPTOMS (25 triệu chứng)
-- ============================================================
INSERT INTO symptoms (code, name, icd10_code, description) VALUES
  ('sot',               'Sốt',                 'R50',   'Nhiệt độ cơ thể tăng cao trên 37.5°C, thường là phản ứng của cơ thể với nhiễm trùng.'),
  ('dau_dau',           'Đau đầu',              'R51',   'Đau hoặc khó chịu ở vùng đầu, có thể do căng thẳng, thiếu ngủ, hoặc bệnh lý.'),
  ('ho',                'Ho',                   'R05',   'Phản xạ bảo vệ của đường hô hấp, có thể khan hoặc có đờm.'),
  ('met_moi',           'Mệt mỏi',              'R53',   'Cảm giác kiệt sức, thiếu năng lượng, khó tập trung.'),
  ('buon_non',          'Buồn nôn',             'R11',   'Cảm giác muốn nôn, khó chịu ở dạ dày.'),
  ('dau_bung',          'Đau bụng',             'R10',   'Đau hoặc khó chịu ở vùng bụng, từ nhẹ đến nặng.'),
  ('kho_tho',           'Khó thở',              'R06',   'Cảm giác hụt hơi, thở không đủ, có thể kèm đau ngực.'),
  ('chay_mui',          'Chảy mũi',             'R09.8', 'Dịch chảy ra từ mũi, thường gặp khi cảm lạnh hoặc dị ứng.'),
  ('dau_hong',          'Đau họng',             'J02',   'Đau, rát hoặc ngứa cổ họng, khó nuốt.'),
  ('tieu_chay',         'Tiêu chảy',            'A09',   'Đi ngoài phân lỏng nhiều lần trong ngày, có thể kèm đau bụng.'),
  ('tao_bon',           'Táo bón',              'K59.0', 'Đi ngoài khó, ít hơn 3 lần/tuần, phân cứng.'),
  ('chong_mat',         'Chóng mặt',            'R42',   'Cảm giác xoay vòng, mất thăng bằng, có thể kèm buồn nôn.'),
  ('mat_ngu',           'Mất ngủ',              'G47.0', 'Khó vào giấc ngủ hoặc duy trì giấc ngủ, ngủ không sâu giấc.'),
  ('dau_lung',          'Đau lưng',             'M54',   'Đau ở vùng lưng, từ cổ đến hông, do nhiều nguyên nhân khác nhau.'),
  ('dau_khop',          'Đau khớp',             'M25.5', 'Đau, sưng, cứng khớp, giảm phạm vi cử động.'),
  ('phat_ban',          'Phát ban',             'R21',   'Nổi mẩn đỏ hoặc thay đổi màu da, có thể ngứa hoặc không.'),
  ('ngua',              'Ngứa',                 'L29',   'Cảm giác ngứa ran trên da, muốn gãi.'),
  ('sut_can',           'Sụt cân',              'R63.4', 'Giảm cân không chủ đích, có thể là dấu hiệu bệnh lý.'),
  ('an_khong_ngon',     'Ăn không ngon',        'R63.0', 'Giảm hoặc mất cảm giác thèm ăn.'),
  ('tim_dap_nhanh',     'Tim đập nhanh',        'R00.0', 'Nhịp tim tăng cao, cảm giác hồi hộp, đánh trống ngực.'),
  ('sung_phu',          'Sưng phù',             'R60',   'Tích nước dưới da gây sưng, thường ở chân, tay.'),
  ('roi_loan_tieu_tien','Rối loạn tiểu tiện',   'R35',   'Đi tiểu nhiều, ít, đau hoặc buốt khi tiểu.'),
  ('ho_co_dom',         'Ho có đờm',            'R09.3', 'Ho kèm theo đờm, thường gặp trong viêm phế quản hoặc viêm phổi.'),
  ('dau_nguc',          'Đau ngực',             'R07',   'Đau hoặc tức ngực, có thể do nhiều nguyên nhân từ tim mạch đến hô hấp.'),
  ('noi_mu',            'Nổi mụn',              'L70',   'Mụn trứng cá hoặc các tổn thương da khác do viêm nang lông.')
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  icd10_code  = EXCLUDED.icd10_code,
  description = EXCLUDED.description;

-- ============================================================
-- BƯỚC 2: DRUGS (30 loại thuốc)
-- ============================================================
INSERT INTO drugs (name, generic_name, category, dosage_form, contraindications) VALUES
  ('Panadol',          'Paracetamol',          'analgesic',             'tablet',  'Không dùng khi suy gan nặng, dị ứng Paracetamol, uống rượu nhiều.'),
  ('Ibuprofen 400',    'Ibuprofen',            'nsaid',                 'tablet',  'Không dùng khi loét dạ dày, suy thận, dị ứng NSAID, có thai 3 tháng cuối.'),
  ('Amoxicillin',      'Amoxicillin',          'antibiotic',            'capsule', 'Không dùng khi dị ứng Penicillin, có tiền sử phản ứng dị ứng nghiêm trọng.'),
  ('Cetirizine',       'Cetirizine',           'antihistamine',         'tablet',  'Không dùng khi suy thận nặng, dị ứng Hydroxyzine.'),
  ('Omeprazole',       'Omeprazole',           'proton_pump_inhibitor', 'capsule', 'Không dùng khi dị ứng Omeprazole hoặc các PPI khác.'),
  ('Metformin',        'Metformin',            'antidiabetic',          'tablet',  'Không dùng khi suy thận nặng, suy gan, nghiện rượu, nhiễm toan lactic.'),
  ('Amlodipine',       'Amlodipine',           'antihypertensive',      'tablet',  'Không dùng khi sốc tim, hẹp động mạch chủ nặng, dị ứng Amlodipine.'),
  ('Atorvastatin',     'Atorvastatin',         'statin',                'tablet',  'Không dùng khi bệnh gan hoạt động, có thai hoặc cho con bú, dị ứng Statin.'),
  ('Salbutamol',       'Salbutamol',           'bronchodilator',        'inhaler', 'Thận trọng khi tim mạch không ổn định, cường giáp, tiểu đường.'),
  ('Diazepam',         'Diazepam',             'benzodiazepine',        'tablet',  'Không dùng khi suy hô hấp nặng, phụ thuộc rượu, có thai, cho con bú.'),
  ('Aspirin',          'Acetylsalicylic acid', 'nsaid',                 'tablet',  'Không dùng cho trẻ dưới 12 tuổi, loét dạ dày, dị ứng Aspirin.'),
  ('Dexamethasone',    'Dexamethasone',        'corticosteroid',        'tablet',  'Không dùng khi nhiễm trùng toàn thân chưa kiểm soát, dị ứng Corticosteroid.'),
  ('Metronidazole',    'Metronidazole',        'antibiotic',            'tablet',  'Không dùng khi mang thai 3 tháng đầu, dị ứng Metronidazole, uống rượu.'),
  ('Loperamide',       'Loperamide',           'antidiarrheal',         'capsule', 'Không dùng khi viêm đại tràng cấp, tiêu chảy do kháng sinh, trẻ dưới 2 tuổi.'),
  ('Ranitidine',       'Ranitidine',           'h2_blocker',            'tablet',  'Không dùng khi dị ứng Ranitidine, porphyria.'),
  ('Simvastatin',      'Simvastatin',          'statin',                'tablet',  'Không dùng khi bệnh gan hoạt động, có thai hoặc cho con bú.'),
  ('Lisinopril',       'Lisinopril',           'ace_inhibitor',         'tablet',  'Không dùng khi phù mạch, có thai, suy thận nặng.'),
  ('Losartan',         'Losartan',             'arb',                   'tablet',  'Không dùng khi có thai, dị ứng Losartan.'),
  ('Clopidogrel',      'Clopidogrel',          'antiplatelet',          'tablet',  'Không dùng khi xuất huyết tiêu hóa, đột quỵ xuất huyết, suy gan nặng.'),
  ('Warfarin',         'Warfarin',             'anticoagulant',         'tablet',  'Không dùng khi có thai, chảy máu nghiêm trọng, phẫu thuật lớn gần đây.'),
  ('Furosemide',       'Furosemide',           'diuretic',              'tablet',  'Không dùng khi vô niệu, suy thận nặng, dị ứng Sulfonamide.'),
  ('Prednisolone',     'Prednisolone',         'corticosteroid',        'tablet',  'Không dùng khi nhiễm nấm toàn thân, tiêm vắc xin sống, loét dạ dày tá tràng.'),
  ('Azithromycin',     'Azithromycin',         'antibiotic',            'tablet',  'Không dùng khi dị ứng Macrolide, suy gan nặng.'),
  ('Ciprofloxacin',    'Ciprofloxacin',        'antibiotic',            'tablet',  'Không dùng cho trẻ em đang tăng trưởng, phụ nữ có thai, cho con bú.'),
  ('Paracetamol Siro', 'Paracetamol',          'analgesic',             'syrup',   'Không dùng khi dị ứng Paracetamol, suy gan nặng, trẻ dưới 3 tháng.'),
  ('Vitamin C',        'Ascorbic acid',        'vitamin',               'tablet',  'Thận trọng khi sỏi thận, thiếu men G6PD.'),
  ('Zinc',             'Zinc sulfate',         'mineral',               'tablet',  'Không dùng liều cao kéo dài, tránh dùng cùng kháng sinh Tetracycline.'),
  ('Lactulose',        'Lactulose',            'laxative',              'syrup',   'Không dùng khi không dung nạp Galactose, tắc ruột.'),
  ('Bisacodyl',        'Bisacodyl',            'laxative',              'tablet',  'Không dùng khi tắc ruột, viêm ruột thừa, đau bụng không rõ nguyên nhân.'),
  ('Domperidone',      'Domperidone',          'antiemetic',            'tablet',  'Không dùng khi tắc dạ dày-ruột, chảy máu tiêu hóa, prolactinoma.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- BƯỚC 3: DRUG_SYMPTOMS MAPPINGS (40 cặp)
-- Dùng JOIN để tự động lấy UUID từ code/name — không cần nhập thủ công
-- ON CONFLICT DO NOTHING → bỏ qua nếu cặp đó đã tồn tại
-- ============================================================
INSERT INTO drug_symptoms (drug_id, symptom_id, confidence_score)
SELECT d.id, s.id, v.confidence_score
FROM (VALUES
  -- Sốt
  ('sot',                'Panadol',          0.95),
  ('sot',                'Ibuprofen 400',    0.88),
  ('sot',                'Aspirin',          0.70),
  ('sot',                'Paracetamol Siro', 0.90),
  -- Đau đầu
  ('dau_dau',            'Panadol',          0.92),
  ('dau_dau',            'Ibuprofen 400',    0.85),
  -- Ho
  ('ho',                 'Salbutamol',       0.78),
  ('ho',                 'Prednisolone',     0.65),
  -- Ho có đờm
  ('ho_co_dom',          'Azithromycin',     0.75),
  -- Đau họng
  ('dau_hong',           'Amoxicillin',      0.80),
  ('dau_hong',           'Ibuprofen 400',    0.75),
  -- Chảy mũi
  ('chay_mui',           'Cetirizine',       0.88),
  -- Ngứa
  ('ngua',               'Cetirizine',       0.90),
  -- Phát ban
  ('phat_ban',           'Cetirizine',       0.82),
  ('phat_ban',           'Prednisolone',     0.70),
  -- Buồn nôn
  ('buon_non',           'Domperidone',      0.85),
  -- Tiêu chảy
  ('tieu_chay',          'Loperamide',       0.88),
  ('tieu_chay',          'Metronidazole',    0.72),
  -- Táo bón
  ('tao_bon',            'Lactulose',        0.85),
  ('tao_bon',            'Bisacodyl',        0.78),
  -- Đau bụng
  ('dau_bung',           'Omeprazole',       0.82),
  ('dau_bung',           'Ranitidine',       0.75),
  ('dau_bung',           'Metronidazole',    0.70),
  -- Khó thở
  ('kho_tho',            'Salbutamol',       0.90),
  ('kho_tho',            'Prednisolone',     0.72),
  -- Đau khớp
  ('dau_khop',           'Ibuprofen 400',    0.88),
  ('dau_khop',           'Dexamethasone',    0.68),
  -- Đau lưng
  ('dau_lung',           'Ibuprofen 400',    0.85),
  ('dau_lung',           'Panadol',          0.80),
  -- Đau ngực
  ('dau_nguc',           'Aspirin',          0.75),
  -- Tim đập nhanh
  ('tim_dap_nhanh',      'Amlodipine',       0.65),
  -- Sưng phù
  ('sung_phu',           'Furosemide',       0.78),
  -- Mất ngủ
  ('mat_ngu',            'Diazepam',         0.70),
  -- Chóng mặt
  ('chong_mat',          'Panadol',          0.60),
  -- Mệt mỏi
  ('met_moi',            'Vitamin C',        0.65),
  ('met_moi',            'Zinc',             0.62),
  -- Rối loạn tiểu tiện
  ('roi_loan_tieu_tien', 'Ciprofloxacin',    0.80),
  -- Nổi mụn
  ('noi_mu',             'Dexamethasone',    0.60),
  -- Sụt cân
  ('sut_can',            'Metformin',        0.62),
  -- Ăn không ngon
  ('an_khong_ngon',      'Zinc',             0.68)
) AS v(symptom_code, drug_name, confidence_score)
JOIN symptoms s ON s.code = v.symptom_code
JOIN drugs    d ON d.name = v.drug_name
ON CONFLICT (drug_id, symptom_id) DO NOTHING;
