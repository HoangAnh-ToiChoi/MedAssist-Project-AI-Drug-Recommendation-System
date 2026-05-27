-- =======================================================
-- MEDASSIST AI — SYMPTOMS SEED DATA
-- Chạy file này SAU schema.sql
-- Gồm 100+ triệu chứng phân loại theo hệ cơ quan
-- =======================================================

-- Xóa dữ liệu cũ nếu có (để chạy lại an toàn)
TRUNCATE TABLE drug_symptoms CASCADE;
TRUNCATE TABLE symptoms CASCADE;

-- =======================================================
-- NHÓM 1: TRIỆU CHỨNG TOÀN THÂN (Systemic)
-- =======================================================
INSERT INTO symptoms (code, name_vi, name_en, keywords, is_danger) VALUES
('sot',          'Sốt',              'Fever',                   ARRAY['sốt','nóng người','nhiệt độ cao','38 độ','39 độ','40 độ','nóng sốt','bị sốt','sốt cao','sốt nhẹ','hâm hấp','thân nhiệt cao','sôt'],                               false),
('sot_cao',      'Sốt cao',          'High Fever',              ARRAY['sốt cao','40 độ','41 độ','sốt rất cao','sốt nặng','sốt quá cao','sot cao'],                                                                                        true),
('ot_lanh',      'Ớn lạnh',          'Chills',                  ARRAY['ớn lạnh','rét run','lạnh run','run rẩy','ớn rét','cảm lạnh','rét cắt','rét lạnh'],                                                                                false),
('met_moi',      'Mệt mỏi',          'Fatigue',                 ARRAY['mệt mỏi','kiệt sức','mệt','uể oải','suy nhược','không có sức','mệt lả','người mệt','cơ thể mệt','yếu sức','vô lực','đuối sức'],                                   false),
('yeu_ot',       'Yếu ớt',           'Weakness',                ARRAY['yếu ớt','yếu người','người yếu','không có lực','mềm người','suy nhược cơ thể','kiệt lực','tay chân yếu'],                                                         false),
('chan_an',      'Chán ăn',          'Loss of Appetite',        ARRAY['chán ăn','không muốn ăn','mất cảm giác thèm ăn','ăn không ngon','không buồn ăn','biếng ăn','thèm ăn kém'],                                                       false),
('sut_can',      'Sụt cân',          'Weight Loss',             ARRAY['sụt cân','giảm cân','gầy đi','mất cân','cân nặng giảm','hao gầy','ốm đi','tụt cân'],                                                                             false),
('mat_ngu',      'Mất ngủ',          'Insomnia',                ARRAY['mất ngủ','ngủ không được','khó ngủ','trằn trọc','thao thức','không ngủ được','ngủ ít','ngủ kém','mất ngủ kinh niên'],                                            false),
('ngu_nhieu',    'Ngủ nhiều',        'Hypersomnia',             ARRAY['ngủ nhiều','buồn ngủ','ngủ li bì','ngủ gà','ngủ ngày','lơ mơ','buồn ngủ quá mức'],                                                                               false),
('do_mo_hoi',    'Đổ mồ hôi',        'Sweating',                ARRAY['đổ mồ hôi','ra mồ hôi','toát mồ hôi','mồ hôi nhiều','vã mồ hôi','mồ hôi đêm','ra mồ hôi trộm'],                                                                 false),
('phu_toan_than','Phù toàn thân',     'Generalized Edema',       ARRAY['phù toàn thân','sưng phù khắp người','phù nề','người phù','nước tích tụ','sưng người'],                                                                          true),
('sot_kem_lanh', 'Sốt kèm ớn lạnh', 'Fever with Chills',       ARRAY['sốt kèm lạnh','vừa sốt vừa lạnh','sốt rét','cơn sốt rét','nóng lạnh xen kẽ'],                                                                                   false),

-- =======================================================
-- NHÓM 2: ĐẦU & NÃO (Neurological / Head)
-- =======================================================
('dau_dau',       'Đau đầu',          'Headache',               ARRAY['đau đầu','nhức đầu','nhức nửa đầu','đầu đau','đau đỉnh đầu','đau vùng đầu','đau đầu nặng','dau dau','nhuc dau'],                                                false),
('dau_nua_dau',   'Đau nửa đầu',      'Migraine',               ARRAY['đau nửa đầu','migraine','nhức nửa đầu','đau một bên đầu','đau đầu bên trái','đau đầu bên phải','đau đầu vận mạch'],                                              false),
('chong_mat',     'Chóng mặt',        'Dizziness',              ARRAY['chóng mặt','hoa mắt','choáng váng','quay đầu','chông chênh','mất thăng bằng','cảm giác quay','xây xẩm','hoa mắt chóng mặt'],                                     false),
('vet_nguyen',    'Ù tai',            'Tinnitus',               ARRAY['ù tai','tiếng ù trong tai','tiếng kêu trong tai','tai ù','reo tai','bị ù tai'],                                                                                  false),
('mat_nho',       'Mất trí nhớ',      'Memory Loss',            ARRAY['mất trí nhớ','hay quên','hay nhầm','trí nhớ kém','không nhớ','quên nhiều','lú lẫn'],                                                                            false),
('co_giat',       'Co giật',          'Seizure',                ARRAY['co giật','động kinh','ngã đột ngột','cơn co giật','giật tay chân','mất ý thức','ngã lăn ra','lên cơn'],                                                         true),
('liet_mat',      'Liệt mặt',         'Facial Palsy',           ARRAY['liệt mặt','xệ mặt','méo miệng','méo mồm','mặt lệch','cơ mặt yếu','liệt dây thần kinh mặt'],                                                                   true),
('te_biet_liet',  'Tê liệt',          'Paralysis',              ARRAY['tê liệt','liệt tay','liệt chân','không cử động được','bại liệt','tê bì tay chân','mất cảm giác tay chân'],                                                      true),
('roi_loan_y_thuc','Rối loạn ý thức', 'Altered Consciousness',  ARRAY['lú lẫn','không tỉnh táo','mất ý thức','lơ mơ','ngủ li bì','hôn mê','mất tri giác','không phản ứng'],                                                           true),
('dau_dau_dot_ngot','Đau đầu đột ngột','Sudden Severe Headache',ARRAY['đau đầu đột ngột','đau đầu dữ dội','đầu đau như búa bổ','đau đầu không chịu được','đau đầu kinh khủng'],                                                        true),

-- =======================================================
-- NHÓM 3: MẮT (Ophthalmological)
-- =======================================================
('do_mat',        'Đỏ mắt',           'Red Eye',                ARRAY['đỏ mắt','mắt đỏ','mắt viêm','kết mạc đỏ','mắt bị đỏ','mắt huyết'],                                                                                            false),
('cay_mat',       'Cay mắt',          'Eye Irritation',         ARRAY['cay mắt','ngứa mắt','mắt cay','mắt khó chịu','kích ứng mắt'],                                                                                                  false),
('nhin_mo',       'Nhìn mờ',          'Blurred Vision',         ARRAY['nhìn mờ','mờ mắt','nhìn không rõ','thị lực giảm','nhòe mắt','nhìn đôi','tầm nhìn kém'],                                                                        false),
('chay_mat',      'Chảy nước mắt',    'Watery Eyes',            ARRAY['chảy nước mắt','chảy ghèn','mắt chảy nước','nước mắt nhiều','ghèn mắt'],                                                                                       false),
('phu_mi',        'Phù mí mắt',       'Eyelid Swelling',        ARRAY['phù mí','sưng mí mắt','mí mắt sưng','mi mắt nề','mắt híp'],                                                                                                    false),
('dau_mat',       'Đau mắt',          'Eye Pain',               ARRAY['đau mắt','mắt đau','đau nhức mắt','đau hốc mắt','mắt nhức','nhức mắt'],                                                                                        false),
('mat_nhan_cao',  'Nhạy cảm ánh sáng','Photophobia',            ARRAY['nhạy cảm ánh sáng','sợ ánh sáng','chói mắt','không chịu được ánh sáng','photophobia'],                                                                         false),

-- =======================================================
-- NHÓM 4: TAI MŨI HỌNG (ENT)
-- =======================================================
('nghet_mui',     'Nghẹt mũi',        'Nasal Congestion',       ARRAY['nghẹt mũi','tắc mũi','mũi nghẹt','khó thở mũi','mũi tắc','ngạt mũi','mũi bị nghẹt'],                                                                          false),
('so_mui',        'Sổ mũi',           'Runny Nose',             ARRAY['sổ mũi','chảy mũi','nước mũi','mũi chảy','xổ mũi','chảy dịch mũi','mũi ướt'],                                                                                  false),
('dau_hong',      'Đau họng',         'Sore Throat',            ARRAY['đau họng','rát họng','viêm họng','khó nuốt','cổ họng đau','họng rát','nuốt đau','dau hong'],                                                                    false),
('ho',            'Ho',               'Cough',                  ARRAY['ho','ho khan','ho có đờm','ho nhiều','bị ho','ho dai dẳng','ho ra máu','ho đêm','ho sáng'],                                                                     false),
('ho_dam',        'Ho có đờm',        'Productive Cough',       ARRAY['ho đờm','ho có đờm','ho ra đờm','đờm vàng','đờm xanh','đờm máu','đờm nhiều','ho đặc đờm'],                                                                    false),
('mat_giong',     'Mất giọng',        'Hoarseness',             ARRAY['khàn giọng','mất giọng','giọng khàn','nói khó','khàn tiếng','mất tiếng','nói không ra'],                                                                       false),
('kho_nuot',      'Khó nuốt',         'Dysphagia',              ARRAY['khó nuốt','nuốt khó','nghẹn','nuốt đau','không nuốt được','vướng cổ họng','khó ăn'],                                                                           false),
('vet_tai',       'Đau tai',          'Ear Pain',               ARRAY['đau tai','tai đau','nhức tai','ù tai','tai đau nhức','chảy dịch tai','tai chảy mủ'],                                                                           false),
('chay_mau_mui',  'Chảy máu mũi',     'Nosebleed',              ARRAY['chảy máu mũi','ra máu mũi','chảy máu cam','máu mũi','mũi chảy máu'],                                                                                          false),

-- =======================================================
-- NHÓM 5: HÔ HẤP (Respiratory)
-- =======================================================
('kho_tho',       'Khó thở',          'Shortness of Breath',    ARRAY['khó thở','thở khó','thở khò khè','không thở được','hụt hơi','thở gấp','thở nặng','ngộp thở','kho tho'],                                                       true),
('tho_kho_khe',   'Thở khò khè',      'Wheezing',               ARRAY['thở khò khè','khò khè','thở rít','tiếng thở bất thường','thở có tiếng','thở rè rè'],                                                                          false),
('dau_nguc',      'Đau ngực',         'Chest Pain',             ARRAY['đau ngực','tức ngực','nặng ngực','đau tim','ngực đau','đau vùng tim','dau nguc','tuc nguc'],                                                                    true),
('tuc_nguc',      'Tức ngực',         'Chest Tightness',        ARRAY['tức ngực','nặng ngực','ngực tức','ép ngực','ngực bị bóp','cảm giác nặng ngực'],                                                                               true),
('kho_nuot_lon',  'Khó thở khi nằm',  'Orthopnea',              ARRAY['khó thở khi nằm','nằm xuống khó thở','phải ngồi thở','thở khó khi nằm'],                                                                                     true),
('dau_nguc_trai', 'Đau ngực trái',    'Left Chest Pain',        ARRAY['đau ngực trái','đau bên ngực trái','đau tim','đau phía trái ngực','đau phần trái'],                                                                            true),
('ho_ra_mau',     'Ho ra máu',        'Hemoptysis',             ARRAY['ho ra máu','ho máu','ra máu khi ho','đờm lẫn máu','ho đàm máu','ho ra đàm đỏ'],                                                                              true),

-- =======================================================
-- NHÓM 6: TIM MẠCH (Cardiovascular)
-- =======================================================
('tim_dap_nhanh', 'Tim đập nhanh',    'Palpitations',           ARRAY['tim đập nhanh','hồi hộp','tim đập mạnh','trống ngực','tim đập loạn','nhịp tim nhanh','rối loạn nhịp tim'],                                                    false),
('tim_dap_cham',  'Tim đập chậm',     'Bradycardia',            ARRAY['tim đập chậm','nhịp tim chậm','mạch chậm','nhịp chậm'],                                                                                                       false),
('huyet_ap_cao',  'Huyết áp cao',     'Hypertension',           ARRAY['huyết áp cao','cao huyết áp','HA cao','tăng huyết áp','huyết áp tăng','áp huyết cao'],                                                                        false),
('huyet_ap_thap', 'Huyết áp thấp',    'Hypotension',            ARRAY['huyết áp thấp','thấp huyết áp','tụt áp','huyết áp giảm','ngất xỉu','choáng ngất'],                                                                           false),
('phu_chan',      'Phù chân',         'Leg Edema',              ARRAY['phù chân','sưng chân','chân phù','chân nề','sưng mắt cá','phù nề chân'],                                                                                      false),
('ngat_xiu',      'Ngất xỉu',         'Syncope/Fainting',       ARRAY['ngất xỉu','bất tỉnh','xỉu','ngã ngất','không tỉnh táo','mất ý thức thoáng qua','choáng ngã'],                                                                true),
('tim_dap_loan',  'Tim đập không đều','Arrhythmia',             ARRAY['tim loạn nhịp','nhịp tim không đều','tim đập không đều','loạn nhịp','tim không đều'],                                                                         true),

-- =======================================================
-- NHÓM 7: TIÊU HÓA (Gastrointestinal)
-- =======================================================
('dau_bung',      'Đau bụng',         'Abdominal Pain',         ARRAY['đau bụng','bụng đau','đau vùng bụng','quặn bụng','đau dạ dày','bụng quặn','đau ruột','bụng đau','dau bung'],                                                    false),
('buon_non',      'Buồn nôn',         'Nausea',                 ARRAY['buồn nôn','nôn nao','muốn nôn','cảm giác nôn','ói','buồn ói','buồn nôn','dạ dày khó chịu'],                                                                    false),
('non',           'Nôn mửa',          'Vomiting',               ARRAY['nôn','nôn mửa','ói mửa','nôn ói','nôn ra','nôn nhiều','nôn mọi thứ','nôn ra máu'],                                                                             false),
('tieu_chay',     'Tiêu chảy',        'Diarrhea',               ARRAY['tiêu chảy','đi ngoài','đi lỏng','phân lỏng','đi tướt','ỉa chảy','tiêu nhiều lần','phân toé nước'],                                                             false),
('tao_bon',       'Táo bón',          'Constipation',           ARRAY['táo bón','không đi cầu được','khó đi cầu','phân cứng','bón','bón bụng','không đại tiện được'],                                                                  false),
('day_hoi',       'Đầy hơi',          'Bloating',               ARRAY['đầy hơi','chướng bụng','bụng căng','bụng đầy','đầy bụng','hơi đầy','bụng khó chịu','chướng khí'],                                                              false),
('ot_chua',       'Ợ chua',           'Acid Reflux',            ARRAY['ợ chua','trào ngược','dạ dày ợ','ợ nóng','chua bụng','nóng rát thực quản','ợ acid'],                                                                           false),
('phan_co_mau',   'Phân có máu',      'Blood in Stool',         ARRAY['phân có máu','đi cầu ra máu','ra máu trực tràng','phân đỏ','đi ngoài ra máu','trĩ ra máu'],                                                                  true),
('vang_da',       'Vàng da',          'Jaundice',               ARRAY['vàng da','da vàng','mắt vàng','vàng mắt','hoàng đản','da ngả vàng'],                                                                                          true),
('dau_thuong_vi', 'Đau thượng vị',    'Epigastric Pain',        ARRAY['đau thượng vị','đau trên rốn','đau dạ dày','đau vùng thượng vị','dạ dày đau','đau ức'],                                                                        false),
('buon_di_tieu_nhieu','Đi tiểu nhiều lần','Frequent Urination', ARRAY['đi tiểu nhiều','tiểu nhiều lần','tiểu đêm','tiểu không hết','tiểu buốt','đái nhiều'],                                                                        false),
('dau_hai_mon',   'Đau hậu môn',      'Anal Pain',              ARRAY['đau hậu môn','đau vùng hậu môn','đau khi đi cầu','trĩ đau','ngứa hậu môn'],                                                                                  false),

-- =======================================================
-- NHÓM 8: CƠ XƯƠNG KHỚP (Musculoskeletal)
-- =======================================================
('dau_khop',      'Đau khớp',         'Joint Pain',             ARRAY['đau khớp','nhức khớp','khớp đau','khớp sưng','đau xương khớp','khớp cứng','cứng khớp'],                                                                       false),
('dau_lung',      'Đau lưng',         'Back Pain',              ARRAY['đau lưng','nhức lưng','lưng đau','đau cột sống','lưng nhức','đau vùng lưng','đau thắt lưng','eo đau'],                                                          false),
('dau_co',        'Đau cơ',           'Muscle Pain',            ARRAY['đau cơ','cơ đau','đau mỏi cơ','nhức cơ','cơ nhức','đau bắp','cơ bị đau','đau bắp tay bắp chân'],                                                              false),
('dau_vai',       'Đau vai',          'Shoulder Pain',          ARRAY['đau vai','vai đau','nhức vai','vai nhức','đau vùng vai','vai căng','vai cứng'],                                                                                 false),
('dau_co_tranh',  'Đau cổ',           'Neck Pain',              ARRAY['đau cổ','cổ đau','nhức cổ','cổ cứng','đau vùng cổ','cổ không quay được','cứng cổ'],                                                                           false),
('dau_dau_goi',   'Đau đầu gối',      'Knee Pain',              ARRAY['đau đầu gối','gối đau','nhức đầu gối','sưng gối','gối sưng','đau khớp gối','đầu gối nhức'],                                                                   false),
('suu_khop',      'Sưng khớp',        'Joint Swelling',         ARRAY['sưng khớp','khớp sưng','khớp phù','khớp nề','khớp to lên','viêm khớp'],                                                                                      false),
('cuong_co',      'Chuột rút',        'Muscle Cramps',          ARRAY['chuột rút','vọp bẻ','co cơ đau','bắp chân co','chuột rút ban đêm','rút cơ','cơ bị cứng đột ngột'],                                                           false),

-- =======================================================
-- NHÓM 9: DA LIỄU (Dermatological)
-- =======================================================
('ngua_da',       'Ngứa da',          'Skin Itching',           ARRAY['ngứa','ngứa da','ngứa toàn thân','da ngứa','ngứa ngáy','ngứa không chịu được','ngứa dị ứng'],                                                                 false),
('phat_ban',      'Phát ban',         'Skin Rash',              ARRAY['phát ban','nổi ban','ban đỏ','mẩn đỏ','nổi mề đay','nổi mẩn','mẩn ngứa','ban da'],                                                                            false),
('noi_me_day',    'Mề đay',           'Urticaria/Hives',        ARRAY['mề đay','nổi mề đay','phát mề đay','ngứa nổi sần','sần ngứa','dị ứng mề đay'],                                                                               false),
('da_kho',        'Da khô',           'Dry Skin',               ARRAY['da khô','da bong tróc','da nứt','da bong','da thiếu ẩm','da bị khô','da ráp'],                                                                                false),
('mun_trung_ca',  'Mụn trứng cá',     'Acne',                   ARRAY['mụn','mụn trứng cá','mụn viêm','mụn bọc','nổi mụn','mụn đầu đen','mụn mủ'],                                                                                  false),
('bong_trom',     'Bỏng rộp',         'Blisters',               ARRAY['phồng rộp','bỏng rộp','nổi bọng','mụn nước','bọng nước','phỏng rộp','nổi bóng nước'],                                                                        false),
('da_vang',       'Da nhợt nhạt',     'Pallor',                 ARRAY['da xanh','da nhợt','da vàng nhợt','môi trắng bệch','da mặt trắng','nhợt nhạt','da xanh xao'],                                                                false),
('bam_tim',       'Bầm tím da',       'Bruising',               ARRAY['bầm','bầm tím','da bầm','bầm tím không rõ nguyên nhân','tụ máu dưới da','xuất huyết dưới da'],                                                               false),
('vay_nen',       'Vảy nến',          'Psoriasis',              ARRAY['vảy nến','da nổi vảy','da bong tróc','vùng da đỏ có vảy','vảy da','da có vảy trắng'],                                                                         false),

-- =======================================================
-- NHÓM 10: TIẾT NIỆU - SINH DỤC (Urogenital)
-- =======================================================
('tieu_buot',     'Tiểu buốt',        'Painful Urination',      ARRAY['tiểu buốt','đái buốt','tiểu đau','đau khi tiểu','tiểu rát','tiểu khó'],                                                                                      false),
('tieu_ra_mau',   'Tiểu ra máu',      'Hematuria',              ARRAY['tiểu ra máu','đái ra máu','nước tiểu đỏ','nước tiểu lẫn máu','tiểu đỏ'],                                                                                     true),
('dau_vung_chau', 'Đau vùng chậu',    'Pelvic Pain',            ARRAY['đau vùng chậu','đau hạ vị','đau bụng dưới','đau vùng bụng dưới','đau hạ vị'],                                                                                false),
('dau_than',      'Đau thận',         'Flank/Kidney Pain',      ARRAY['đau thận','đau vùng thắt lưng','đau hông','đau cạnh sườn','đau hai bên hông','đau vùng thận'],                                                               false),
('kho_tieu',      'Khó tiểu',         'Urinary Retention',      ARRAY['khó tiểu','tiểu không ra','bí tiểu','tiểu nhỏ giọt','không tiểu được','tia nước tiểu yếu'],                                                                  false),
('roi_loan_kinh',  'Rối loạn kinh nguyệt','Menstrual Irregularity',ARRAY['rối loạn kinh','kinh không đều','trễ kinh','mất kinh','kinh nguyệt bất thường','hành kinh đau','thống kinh','đau kinh'],                                   false),
('ra_khi_hu',      'Ra khí hư',        'Vaginal Discharge',      ARRAY['khí hư','ra khí hư','dịch âm đạo','tiết dịch âm đạo','ra dịch bất thường','ra huyết trắng'],                                                               false),

-- =======================================================
-- NHÓM 11: NỘI TIẾT - CHUYỂN HÓA (Endocrine / Metabolic)
-- =======================================================
('khat_nhieu',    'Khát nhiều',       'Excessive Thirst',       ARRAY['khát nước','khát nhiều','khát liên tục','uống nước nhiều','miệng khô','khô miệng','khát không ngừng'],                                                        false),
('run_tay',       'Run tay',          'Hand Tremor',            ARRAY['run tay','tay run','run rẩy','bàn tay run','tay run không kiểm soát','run người'],                                                                             false),
('to_mat',        'Cổ to',            'Goiter',                 ARRAY['cổ to','bướu cổ','tuyến giáp to','cổ sưng','sưng vùng cổ','u vùng cổ'],                                                                                      false),
('lo_lang',       'Lo lắng',          'Anxiety',                ARRAY['lo lắng','lo âu','hồi hộp lo lắng','căng thẳng','bất an','lo sợ','bồn chồn'],                                                                                false),
('tram_cam',      'Trầm cảm',         'Depression',             ARRAY['trầm cảm','buồn bã','chán nản','không muốn sống','mất hứng thú','buồn chán','tâm trạng xấu'],                                                               false),

-- =======================================================
-- NHÓM 12: MÁU & ĐÔNG MÁU (Hematological)
-- =======================================================
('chay_mau_kho_cam', 'Chảy máu khó cầm', 'Abnormal Bleeding',  ARRAY['chảy máu khó cầm','dễ chảy máu','xuất huyết','chảy máu bất thường','chảy máu lâu cầm'],                                                                    true),
('xuat_huyet_duoi_da','Xuất huyết dưới da','Subcutaneous Bleeding',ARRAY['xuất huyết dưới da','đốm đỏ','ban xuất huyết','đỏ điểm da','nốt xuất huyết','chấm đỏ da'],                                                             true),
('thieu_mau',     'Thiếu máu',        'Anemia',                 ARRAY['thiếu máu','da nhợt','mệt mỏi thiếu máu','chóng mặt thiếu máu','ù tai thiếu máu','nhức đầu thiếu máu'],                                                     false),

-- =======================================================
-- NHÓM 13: TÂM THẦN - THẦN KINH (Psychiatric / Neurological)
-- =======================================================
('dot_quy',       'Triệu chứng đột quỵ','Stroke Symptoms',      ARRAY['đột quỵ','liệt nửa người','méo miệng đột ngột','liệt tay chân một bên','nói không ra','triệu chứng đột quỵ','stroke'],                                       true),
('tet_liet',      'Tê liệt một bên',  'Hemiplegia',             ARRAY['tê liệt một bên','liệt nửa người','yếu tay chân một bên','không cử động một bên','tê bì một bên'],                                                          true),
('noi_lap',       'Nói lắp',          'Slurred Speech',         ARRAY['nói lắp','nói không rõ','nói khó','giọng nói bất thường','không nói được','mất ngôn','rối loạn ngôn ngữ'],                                                  true),

-- =======================================================
-- NHÓM 14: DỊ ỨNG - MIỄN DỊCH (Allergic / Immune)
-- =======================================================
('di_ung_thuc_pham','Dị ứng thực phẩm','Food Allergy',          ARRAY['dị ứng thức ăn','dị ứng thực phẩm','ăn vào dị ứng','ngứa sau khi ăn','phát ban sau khi ăn'],                                                               false),
('phan_ve_di_ung', 'Phản vệ',          'Anaphylaxis',            ARRAY['phản vệ','sốc phản vệ','dị ứng nặng','khó thở do dị ứng','sưng mặt đột ngột','sưng lưỡi họng','dị ứng cấp'],                                               true),
('mat_phu',       'Mặt phù',          'Facial Swelling',        ARRAY['mặt sưng','phù mặt','sưng mặt','phù mi','mắt sưng','mặt nề','sưng phù vùng mặt'],                                                                           false),

-- =======================================================
-- NHÓM 15: TRẺ EM (Pediatric specific)
-- =======================================================
('quay_khoc',     'Quấy khóc (trẻ em)','Irritability (child)',  ARRAY['quấy khóc','bé quấy','trẻ khóc nhiều','em bé quấy','bé không chịu ngủ','trẻ hay khóc'],                                                                     false),
('bo_bu',         'Bỏ bú (trẻ em)',   'Poor Feeding (infant)',  ARRAY['bỏ bú','không chịu bú','bú ít','bé không ăn','trẻ biếng ăn','bé không chịu ăn'],                                                                           false),
('sot_cao_co_giat','Sốt cao co giật (trẻ)','Febrile Seizure',   ARRAY['sốt cao co giật','trẻ sốt co giật','co giật khi sốt','giật do sốt','sốt co giật trẻ em'],                                                                  true),
('than_nhiet_thap','Hạ thân nhiệt',   'Hypothermia',            ARRAY['hạ thân nhiệt','người lạnh','thân nhiệt thấp','cơ thể lạnh bất thường','nhiệt độ cơ thể thấp'],                                                             true);

-- =======================================================
-- THÔNG BÁO HOÀN TẤT
-- =======================================================
SELECT 
    COUNT(*) AS total_symptoms,
    SUM(CASE WHEN is_danger THEN 1 ELSE 0 END) AS danger_symptoms,
    SUM(CASE WHEN NOT is_danger THEN 1 ELSE 0 END) AS normal_symptoms
FROM symptoms;
