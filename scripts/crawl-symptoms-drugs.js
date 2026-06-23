/**
 * MedAssist AI - Web Crawling Script
 * Crawl Vietnamese medical data (symptoms + drugs) from Wikipedia
 * Usage:
 *   node scripts/crawl-symptoms-drugs.js           # crawl all
 *   node scripts/crawl-symptoms-drugs.js --symptoms # crawl chỉ symptoms
 *   node scripts/crawl-symptoms-drugs.js --drugs    # crawl chỉ drugs
 */

'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

// ============================================================
// CONFIG - Điều chỉnh các thông số tại đây
// ============================================================
const CONFIG = {
  SYMPTOMS_LIMIT: 25,
  DRUGS_LIMIT: 30,
  MAPPINGS_LIMIT: 40,
  REQUEST_DELAY: 1000, // ms giữa mỗi request
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  TIMEOUT: 10000,
  OUTPUT_DIR: path.resolve(__dirname, '../data/crawled'),
};

// ============================================================
// FALLBACK DATA - Dùng khi Wikipedia không crawl được
// ============================================================
const FALLBACK_SYMPTOMS = [
  { code: 'sot', name: 'Sốt', icd10_code: 'R50', description: 'Nhiệt độ cơ thể tăng cao trên 37.5°C, thường là phản ứng của cơ thể với nhiễm trùng.' },
  { code: 'dau_dau', name: 'Đau đầu', icd10_code: 'R51', description: 'Đau hoặc khó chịu ở vùng đầu, có thể do căng thẳng, thiếu ngủ, hoặc bệnh lý.' },
  { code: 'ho', name: 'Ho', icd10_code: 'R05', description: 'Phản xạ bảo vệ của đường hô hấp, có thể khan hoặc có đờm.' },
  { code: 'met_moi', name: 'Mệt mỏi', icd10_code: 'R53', description: 'Cảm giác kiệt sức, thiếu năng lượng, khó tập trung.' },
  { code: 'buon_non', name: 'Buồn nôn', icd10_code: 'R11', description: 'Cảm giác muốn nôn, khó chịu ở dạ dày.' },
  { code: 'dau_bung', name: 'Đau bụng', icd10_code: 'R10', description: 'Đau hoặc khó chịu ở vùng bụng, từ nhẹ đến nặng.' },
  { code: 'kho_tho', name: 'Khó thở', icd10_code: 'R06', description: 'Cảm giác hụt hơi, thở không đủ, có thể kèm đau ngực.' },
  { code: 'chay_mui', name: 'Chảy mũi', icd10_code: 'R09.8', description: 'Dịch chảy ra từ mũi, thường gặp khi cảm lạnh hoặc dị ứng.' },
  { code: 'dau_hong', name: 'Đau họng', icd10_code: 'J02', description: 'Đau, rát hoặc ngứa cổ họng, khó nuốt.' },
  { code: 'tieu_chay', name: 'Tiêu chảy', icd10_code: 'A09', description: 'Đi ngoài phân lỏng nhiều lần trong ngày, có thể kèm đau bụng.' },
  { code: 'tao_bon', name: 'Táo bón', icd10_code: 'K59.0', description: 'Đi ngoài khó, ít hơn 3 lần/tuần, phân cứng.' },
  { code: 'chong_mat', name: 'Chóng mặt', icd10_code: 'R42', description: 'Cảm giác xoay vòng, mất thăng bằng, có thể kèm buồn nôn.' },
  { code: 'mat_ngu', name: 'Mất ngủ', icd10_code: 'G47.0', description: 'Khó vào giấc ngủ hoặc duy trì giấc ngủ, ngủ không sâu giấc.' },
  { code: 'dau_lung', name: 'Đau lưng', icd10_code: 'M54', description: 'Đau ở vùng lưng, từ cổ đến hông, do nhiều nguyên nhân khác nhau.' },
  { code: 'dau_khop', name: 'Đau khớp', icd10_code: 'M25.5', description: 'Đau, sưng, cứng khớp, giảm phạm vi cử động.' },
  { code: 'phat_ban', name: 'Phát ban', icd10_code: 'R21', description: 'Nổi mẩn đỏ hoặc thay đổi màu da, có thể ngứa hoặc không.' },
  { code: 'ngua', name: 'Ngứa', icd10_code: 'L29', description: 'Cảm giác ngứa ran trên da, muốn gãi.' },
  { code: 'sut_can', name: 'Sụt cân', icd10_code: 'R63.4', description: 'Giảm cân không chủ đích, có thể là dấu hiệu bệnh lý.' },
  { code: 'an_khong_ngon', name: 'Ăn không ngon', icd10_code: 'R63.0', description: 'Giảm hoặc mất cảm giác thèm ăn.' },
  { code: 'tim_dap_nhanh', name: 'Tim đập nhanh', icd10_code: 'R00.0', description: 'Nhịp tim tăng cao, cảm giác hồi hộp, đánh trống ngực.' },
  { code: 'sung_phu', name: 'Sưng phù', icd10_code: 'R60', description: 'Tích nước dưới da gây sưng, thường ở chân, tay.' },
  { code: 'roi_loan_tieu_tien', name: 'Rối loạn tiểu tiện', icd10_code: 'R35', description: 'Đi tiểu nhiều, ít, đau hoặc buốt khi tiểu.' },
  { code: 'ho_co_dom', name: 'Ho có đờm', icd10_code: 'R09.3', description: 'Ho kèm theo đờm, thường gặp trong viêm phế quản hoặc viêm phổi.' },
  { code: 'dau_nguc', name: 'Đau ngực', icd10_code: 'R07', description: 'Đau hoặc tức ngực, có thể do nhiều nguyên nhân từ tim mạch đến hô hấp.' },
  { code: 'noi_mu', name: 'Nổi mụn', icd10_code: 'L70', description: 'Mụn trứng cá hoặc các tổn thương da khác do viêm nang lông.' },
];

const FALLBACK_DRUGS = [
  { name: 'Panadol', generic_name: 'Paracetamol', category: 'analgesic', dosage_form: 'tablet', contraindications: 'Không dùng khi suy gan nặng, dị ứng Paracetamol, uống rượu nhiều.' },
  { name: 'Ibuprofen 400', generic_name: 'Ibuprofen', category: 'nsaid', dosage_form: 'tablet', contraindications: 'Không dùng khi loét dạ dày, suy thận, dị ứng NSAID, có thai 3 tháng cuối.' },
  { name: 'Amoxicillin', generic_name: 'Amoxicillin', category: 'antibiotic', dosage_form: 'capsule', contraindications: 'Không dùng khi dị ứng Penicillin, có tiền sử phản ứng dị ứng nghiêm trọng.' },
  { name: 'Cetirizine', generic_name: 'Cetirizine', category: 'antihistamine', dosage_form: 'tablet', contraindications: 'Không dùng khi suy thận nặng, dị ứng Hydroxyzine.' },
  { name: 'Omeprazole', generic_name: 'Omeprazole', category: 'proton_pump_inhibitor', dosage_form: 'capsule', contraindications: 'Không dùng khi dị ứng Omeprazole hoặc các PPI khác.' },
  { name: 'Metformin', generic_name: 'Metformin', category: 'antidiabetic', dosage_form: 'tablet', contraindications: 'Không dùng khi suy thận nặng, suy gan, nghiện rượu, nhiễm toan lactic.' },
  { name: 'Amlodipine', generic_name: 'Amlodipine', category: 'antihypertensive', dosage_form: 'tablet', contraindications: 'Không dùng khi sốc tim, hẹp động mạch chủ nặng, dị ứng Amlodipine.' },
  { name: 'Atorvastatin', generic_name: 'Atorvastatin', category: 'statin', dosage_form: 'tablet', contraindications: 'Không dùng khi bệnh gan hoạt động, có thai hoặc cho con bú, dị ứng Statin.' },
  { name: 'Salbutamol', generic_name: 'Salbutamol', category: 'bronchodilator', dosage_form: 'inhaler', contraindications: 'Thận trọng khi tim mạch không ổn định, cường giáp, tiểu đường.' },
  { name: 'Diazepam', generic_name: 'Diazepam', category: 'benzodiazepine', dosage_form: 'tablet', contraindications: 'Không dùng khi suy hô hấp nặng, phụ thuộc rượu, có thai, cho con bú.' },
  { name: 'Aspirin', generic_name: 'Acetylsalicylic acid', category: 'nsaid', dosage_form: 'tablet', contraindications: 'Không dùng cho trẻ dưới 12 tuổi, loét dạ dày, dị ứng Aspirin.' },
  { name: 'Dexamethasone', generic_name: 'Dexamethasone', category: 'corticosteroid', dosage_form: 'tablet', contraindications: 'Không dùng khi nhiễm trùng toàn thân chưa kiểm soát, dị ứng Corticosteroid.' },
  { name: 'Metronidazole', generic_name: 'Metronidazole', category: 'antibiotic', dosage_form: 'tablet', contraindications: 'Không dùng khi mang thai 3 tháng đầu, dị ứng Metronidazole, uống rượu.' },
  { name: 'Loperamide', generic_name: 'Loperamide', category: 'antidiarrheal', dosage_form: 'capsule', contraindications: 'Không dùng khi viêm đại tràng cấp, tiêu chảy do kháng sinh, trẻ dưới 2 tuổi.' },
  { name: 'Ranitidine', generic_name: 'Ranitidine', category: 'h2_blocker', dosage_form: 'tablet', contraindications: 'Không dùng khi dị ứng Ranitidine, porphyria.' },
  { name: 'Simvastatin', generic_name: 'Simvastatin', category: 'statin', dosage_form: 'tablet', contraindications: 'Không dùng khi bệnh gan hoạt động, có thai hoặc cho con bú.' },
  { name: 'Lisinopril', generic_name: 'Lisinopril', category: 'ace_inhibitor', dosage_form: 'tablet', contraindications: 'Không dùng khi phù mạch, có thai, suy thận nặng.' },
  { name: 'Losartan', generic_name: 'Losartan', category: 'arb', dosage_form: 'tablet', contraindications: 'Không dùng khi có thai, dị ứng Losartan.' },
  { name: 'Clopidogrel', generic_name: 'Clopidogrel', category: 'antiplatelet', dosage_form: 'tablet', contraindications: 'Không dùng khi xuất huyết tiêu hóa, đột quỵ xuất huyết, suy gan nặng.' },
  { name: 'Warfarin', generic_name: 'Warfarin', category: 'anticoagulant', dosage_form: 'tablet', contraindications: 'Không dùng khi có thai, chảy máu nghiêm trọng, phẫu thuật lớn gần đây.' },
  { name: 'Furosemide', generic_name: 'Furosemide', category: 'diuretic', dosage_form: 'tablet', contraindications: 'Không dùng khi vô niệu, suy thận nặng, dị ứng Sulfonamide.' },
  { name: 'Prednisolone', generic_name: 'Prednisolone', category: 'corticosteroid', dosage_form: 'tablet', contraindications: 'Không dùng khi nhiễm nấm toàn thân, tiêm vắc xin sống, loét dạ dày tá tràng.' },
  { name: 'Azithromycin', generic_name: 'Azithromycin', category: 'antibiotic', dosage_form: 'tablet', contraindications: 'Không dùng khi dị ứng Macrolide, suy gan nặng.' },
  { name: 'Ciprofloxacin', generic_name: 'Ciprofloxacin', category: 'antibiotic', dosage_form: 'tablet', contraindications: 'Không dùng cho trẻ em đang tăng trưởng, phụ nữ có thai, cho con bú.' },
  { name: 'Paracetamol Siro', generic_name: 'Paracetamol', category: 'analgesic', dosage_form: 'syrup', contraindications: 'Không dùng khi dị ứng Paracetamol, suy gan nặng, trẻ dưới 3 tháng.' },
  { name: 'Vitamin C', generic_name: 'Ascorbic acid', category: 'vitamin', dosage_form: 'tablet', contraindications: 'Thận trọng khi sỏi thận, thiếu men G6PD.' },
  { name: 'Zinc', generic_name: 'Zinc sulfate', category: 'mineral', dosage_form: 'tablet', contraindications: 'Không dùng liều cao kéo dài, tránh dùng cùng kháng sinh Tetracycline.' },
  { name: 'Lactulose', generic_name: 'Lactulose', category: 'laxative', dosage_form: 'syrup', contraindications: 'Không dùng khi không dung nạp Galactose, tắc ruột.' },
  { name: 'Bisacodyl', generic_name: 'Bisacodyl', category: 'laxative', dosage_form: 'tablet', contraindications: 'Không dùng khi tắc ruột, viêm ruột thừa, đau bụng không rõ nguyên nhân.' },
  { name: 'Domperidone', generic_name: 'Domperidone', category: 'antiemetic', dosage_form: 'tablet', contraindications: 'Không dùng khi tắc dạ dày-ruột, chảy máu tiêu hóa, prolactinoma.' },
];

// Symptom-drug mappings với confidence score
const SYMPTOM_DRUG_MAPPINGS = [
  { symptom_code: 'sot', drug_name: 'Panadol', confidence_score: 0.95, notes: 'Hạ sốt hiệu quả, an toàn cho mọi lứa tuổi' },
  { symptom_code: 'sot', drug_name: 'Ibuprofen 400', confidence_score: 0.88, notes: 'Hạ sốt và giảm đau kèm theo' },
  { symptom_code: 'sot', drug_name: 'Aspirin', confidence_score: 0.70, notes: 'Không dùng cho trẻ em dưới 12 tuổi' },
  { symptom_code: 'dau_dau', drug_name: 'Panadol', confidence_score: 0.92, notes: 'Giảm đau đầu thông thường' },
  { symptom_code: 'dau_dau', drug_name: 'Ibuprofen 400', confidence_score: 0.85, notes: 'Hiệu quả cho đau đầu do viêm' },
  { symptom_code: 'ho', drug_name: 'Salbutamol', confidence_score: 0.78, notes: 'Dùng cho ho do co thắt phế quản' },
  { symptom_code: 'ho_co_dom', drug_name: 'Azithromycin', confidence_score: 0.75, notes: 'Kháng sinh cho ho có đờm do vi khuẩn' },
  { symptom_code: 'dau_hong', drug_name: 'Amoxicillin', confidence_score: 0.80, notes: 'Kháng sinh phổ biến cho viêm họng' },
  { symptom_code: 'dau_hong', drug_name: 'Ibuprofen 400', confidence_score: 0.75, notes: 'Giảm đau và viêm họng' },
  { symptom_code: 'chay_mui', drug_name: 'Cetirizine', confidence_score: 0.88, notes: 'Kháng histamine cho chảy mũi dị ứng' },
  { symptom_code: 'ngua', drug_name: 'Cetirizine', confidence_score: 0.90, notes: 'Hiệu quả cao cho ngứa dị ứng' },
  { symptom_code: 'phat_ban', drug_name: 'Cetirizine', confidence_score: 0.82, notes: 'Kiểm soát phát ban dị ứng' },
  { symptom_code: 'phat_ban', drug_name: 'Prednisolone', confidence_score: 0.70, notes: 'Dùng cho phát ban nặng' },
  { symptom_code: 'buon_non', drug_name: 'Domperidone', confidence_score: 0.85, notes: 'Chống nôn và điều hoà nhu động ruột' },
  { symptom_code: 'tieu_chay', drug_name: 'Loperamide', confidence_score: 0.88, notes: 'Giảm số lần tiêu chảy nhanh chóng' },
  { symptom_code: 'tieu_chay', drug_name: 'Metronidazole', confidence_score: 0.72, notes: 'Tiêu chảy do vi khuẩn kị khí hoặc amibe' },
  { symptom_code: 'tao_bon', drug_name: 'Lactulose', confidence_score: 0.85, notes: 'Nhuận tràng nhẹ, an toàn dài hạn' },
  { symptom_code: 'tao_bon', drug_name: 'Bisacodyl', confidence_score: 0.78, notes: 'Nhuận tràng kích thích, tác dụng nhanh' },
  { symptom_code: 'dau_bung', drug_name: 'Omeprazole', confidence_score: 0.82, notes: 'Đau bụng do loét dạ dày hoặc trào ngược' },
  { symptom_code: 'dau_bung', drug_name: 'Ranitidine', confidence_score: 0.75, notes: 'Giảm axit dạ dày, giảm đau bụng trên' },
  { symptom_code: 'kho_tho', drug_name: 'Salbutamol', confidence_score: 0.90, notes: 'Giãn phế quản nhanh khi khó thở' },
  { symptom_code: 'kho_tho', drug_name: 'Prednisolone', confidence_score: 0.72, notes: 'Chống viêm cho khó thở do hen suyễn' },
  { symptom_code: 'dau_khop', drug_name: 'Ibuprofen 400', confidence_score: 0.88, notes: 'Giảm đau và viêm khớp hiệu quả' },
  { symptom_code: 'dau_khop', drug_name: 'Dexamethasone', confidence_score: 0.68, notes: 'Dùng cho viêm khớp nặng' },
  { symptom_code: 'dau_lung', drug_name: 'Ibuprofen 400', confidence_score: 0.85, notes: 'Giảm đau lưng do cơ hoặc viêm' },
  { symptom_code: 'dau_lung', drug_name: 'Panadol', confidence_score: 0.80, notes: 'Giảm đau lưng thông thường' },
  { symptom_code: 'dau_nguc', drug_name: 'Aspirin', confidence_score: 0.75, notes: 'Dùng trong đau ngực do tim (cần tư vấn bác sĩ)' },
  { symptom_code: 'tim_dap_nhanh', drug_name: 'Amlodipine', confidence_score: 0.65, notes: 'Kiểm soát nhịp tim (cần kê đơn)' },
  { symptom_code: 'sung_phu', drug_name: 'Furosemide', confidence_score: 0.78, notes: 'Lợi tiểu, giảm phù nề' },
  { symptom_code: 'mat_ngu', drug_name: 'Diazepam', confidence_score: 0.70, notes: 'Dùng ngắn hạn, cần kê đơn bác sĩ' },
  { symptom_code: 'chong_mat', drug_name: 'Panadol', confidence_score: 0.60, notes: 'Khi chóng mặt kèm đau đầu' },
  { symptom_code: 'met_moi', drug_name: 'Vitamin C', confidence_score: 0.65, notes: 'Tăng cường đề kháng, giảm mệt mỏi' },
  { symptom_code: 'met_moi', drug_name: 'Zinc', confidence_score: 0.62, notes: 'Bổ sung khoáng chất, hỗ trợ miễn dịch' },
  { symptom_code: 'roi_loan_tieu_tien', drug_name: 'Ciprofloxacin', confidence_score: 0.80, notes: 'Nhiễm trùng đường tiết niệu' },
  { symptom_code: 'noi_mu', drug_name: 'Dexamethasone', confidence_score: 0.60, notes: 'Dùng khi viêm nặng (thận trọng)' },
  { symptom_code: 'sut_can', drug_name: 'Metformin', confidence_score: 0.62, notes: 'Khi sụt cân liên quan tiểu đường type 2' },
  { symptom_code: 'an_khong_ngon', drug_name: 'Zinc', confidence_score: 0.68, notes: 'Thiếu kẽm gây giảm vị giác' },
  { symptom_code: 'dau_bung', drug_name: 'Metronidazole', confidence_score: 0.70, notes: 'Đau bụng do nhiễm trùng vi khuẩn kị khí' },
  { symptom_code: 'sot', drug_name: 'Paracetamol Siro', confidence_score: 0.90, notes: 'Hạ sốt cho trẻ em, dạng siro dễ uống' },
  { symptom_code: 'ho', drug_name: 'Prednisolone', confidence_score: 0.65, notes: 'Ho do viêm nặng hoặc hen suyễn' },
];

// ============================================================
// HELPERS
// ============================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const axiosInstance = axios.create({
  timeout: CONFIG.TIMEOUT,
  headers: { 'User-Agent': CONFIG.USER_AGENT },
});

/**
 * Fetch HTML từ URL, ném lỗi nếu không thành công
 */
async function fetchPage(url) {
  try {
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    throw new Error(`Không thể fetch ${url}: ${err.message}`);
  }
}

/**
 * Chuyển tên tiếng Việt sang snake_case không dấu
 */
function toSnakeCode(name) {
  const map = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a',
    è: 'e', é: 'e', ê: 'e', ë: 'e',
    ì: 'i', í: 'i', î: 'i', ï: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
    ù: 'u', ú: 'u', û: 'u', ü: 'u',
    ý: 'y', ÿ: 'y', ñ: 'n', ç: 'c', đ: 'd',
    ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ậ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a',
    ả: 'a', ạ: 'a',
    ế: 'e', ệ: 'e', ề: 'e', ể: 'e', ễ: 'e',
    ẽ: 'e', ẹ: 'e', ẻ: 'e',
    ị: 'i', ỉ: 'i', ĩ: 'i',
    ố: 'o', ộ: 'o', ồ: 'o', ổ: 'o', ỗ: 'o',
    ớ: 'o', ợ: 'o', ờ: 'o', ở: 'o', ỡ: 'o',
    ọ: 'o', ỏ: 'o',
    ứ: 'u', ự: 'u', ừ: 'u', ử: 'u', ữ: 'u',
    ụ: 'u', ủ: 'u', ũ: 'u',
    ỳ: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
  };

  return name
    .toLowerCase()
    .split('')
    .map((c) => map[c] !== undefined ? map[c] : c)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ============================================================
// CRAWLERS
// ============================================================

// Từ điển loại trừ: navigation links Wikipedia, không phải triệu chứng
const WIKI_NAV_PATTERNS = /^(trang|bai|muc|danh|chinh|noi|chon|ngau|nhien|tim|kiem|lich|su|thao|luan|dong|gop|cong|dong|ho|tro|xem|them|sua|lich|ung|dung|cai|dat|thong|bao|ban|mau|giai|thich|phan|loai|chuyen|huong|dan|trang_chinh|wiki|wikipedia)/i;

/**
 * Crawl danh sách triệu chứng từ Wikipedia tiếng Việt.
 * Ưu tiên fallback data (đã curated với ICD-10), bổ sung Wikipedia nếu cần.
 */
async function crawlSymptoms() {
  console.log('\n🔍 Crawl SYMPTOMS từ Wikipedia...');

  // Khởi đầu với fallback data để đảm bảo chất lượng
  const symptoms = [...FALLBACK_SYMPTOMS.slice(0, CONFIG.SYMPTOMS_LIMIT)];
  console.log(`  ✅ Đã load ${symptoms.length} triệu chứng từ dữ liệu tĩnh (có ICD-10)`);

  // Thử bổ sung từ Wikipedia nếu chưa đủ limit
  if (symptoms.length < CONFIG.SYMPTOMS_LIMIT) {
    const urlsToTry = [
      'https://vi.wikipedia.org/wiki/Tri%E1%BB%87u_ch%E1%BB%A9ng',
    ];

    for (const url of urlsToTry) {
      try {
        console.log(`  📥 Bổ sung từ Wikipedia: ${url}`);
        const html = await fetchPage(url);
        const $ = cheerio.load(html);

        // Chỉ lấy link trong phần nội dung bài viết, bỏ qua sidebar/nav
        $('#mw-content-text li a[href^="/wiki/"]').each((_, el) => {
          if (symptoms.length >= CONFIG.SYMPTOMS_LIMIT) return false;
          const text = $(el).text().trim();
          const code = toSnakeCode(text);
          const isNavLink = WIKI_NAV_PATTERNS.test(code);
          const isValidLength = text.length > 3 && text.length < 60;
          const isNewEntry = !symptoms.find((s) => s.code === code);

          if (code && isValidLength && !isNavLink && isNewEntry) {
            symptoms.push({
              code,
              name: text,
              icd10_code: '',
              description: `Triệu chứng: ${text}`,
            });
          }
        });

        await sleep(CONFIG.REQUEST_DELAY);
        break;
      } catch (err) {
        console.log(`  ❌ Lỗi crawl Wikipedia: ${err.message}`);
      }
    }
  }

  const result = symptoms.slice(0, CONFIG.SYMPTOMS_LIMIT);
  console.log(`✅ Crawl được ${result.length} triệu chứng`);
  return result;
}

/**
 * Crawl thông tin thuốc từ Wikipedia tiếng Anh.
 * Ưu tiên fallback data (đã có đầy đủ thông tin y tế), bổ sung Wikipedia nếu cần.
 */
async function crawlDrugs() {
  console.log('\n💊 Crawl DRUGS từ Wikipedia...');

  // Khởi đầu với fallback data để đảm bảo chất lượng
  const drugs = [...FALLBACK_DRUGS.slice(0, CONFIG.DRUGS_LIMIT)];
  console.log(`  ✅ Đã load ${drugs.length} thuốc từ dữ liệu tĩnh (có đầy đủ thông tin)`);

  // Thử bổ sung từ Wikipedia nếu chưa đủ limit
  if (drugs.length < CONFIG.DRUGS_LIMIT) {
    const urlsToTry = [
      'https://en.wikipedia.org/wiki/WHO_Model_List_of_Essential_Medicines',
    ];

    for (const url of urlsToTry) {
      try {
        console.log(`  📥 Bổ sung từ Wikipedia: ${url}`);
        const html = await fetchPage(url);
        const $ = cheerio.load(html);

        $('table.wikitable tbody tr').each((_, row) => {
          if (drugs.length >= CONFIG.DRUGS_LIMIT) return false;
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const name = $(cells[0]).text().trim();
            if (name && name.length > 1 && name.length < 60) {
              const generic = $(cells[1]).text().trim() || name;
              if (!drugs.find((d) => d.name.toLowerCase() === name.toLowerCase())) {
                drugs.push({
                  name,
                  generic_name: generic,
                  category: 'other',
                  dosage_form: 'tablet',
                  contraindications: 'Cần tư vấn bác sĩ trước khi sử dụng.',
                });
              }
            }
          }
        });

        await sleep(CONFIG.REQUEST_DELAY);
        break;
      } catch (err) {
        console.log(`  ❌ Lỗi crawl Wikipedia: ${err.message}`);
      }
    }
  }

  const result = drugs.slice(0, CONFIG.DRUGS_LIMIT);
  console.log(`✅ Crawl được ${result.length} thuốc`);
  return result;
}

// Drug categories xếp theo loại triệu chứng, dùng cho auto-mapping
const CATEGORY_RULES = [
  { symptomKeywords: ['dau', 'nhuc', 'sot', 'viem'], categories: ['analgesic', 'nsaid'], score: 0.68 },
  { symptomKeywords: ['ho', 'tho', 'mui', 'hong'], categories: ['bronchodilator', 'antibiotic', 'antihistamine'], score: 0.65 },
  { symptomKeywords: ['bung', 'tieu', 'tao', 'non'], categories: ['antidiarrheal', 'laxative', 'antiemetic', 'proton_pump_inhibitor'], score: 0.65 },
  { symptomKeywords: ['ngua', 'ban', 'mu', 'da'], categories: ['antihistamine', 'corticosteroid'], score: 0.64 },
  { symptomKeywords: ['met', 'ngu', 'can', 'an'], categories: ['vitamin', 'mineral'], score: 0.62 },
  { symptomKeywords: ['tim', 'phu', 'huyet', 'ap'], categories: ['antihypertensive', 'diuretic', 'ace_inhibitor', 'arb'], score: 0.62 },
];

/**
 * Generate symptom-drug mappings từ dữ liệu tĩnh + auto-mapping theo category
 */
function generateMappings(symptoms, drugs) {
  console.log('\n🔗 Generate SYMPTOM-DRUG MAPPINGS...');

  const symptomCodes = new Set(symptoms.map((s) => s.code));
  const drugNames = new Set(drugs.map((d) => d.name));
  const seen = new Set(); // "symptom_code|drug_name"

  const mappings = [];

  // Bước 1: Lấy mappings từ danh sách tĩnh nếu hợp lệ
  for (const m of SYMPTOM_DRUG_MAPPINGS) {
    if (symptomCodes.has(m.symptom_code) && drugNames.has(m.drug_name)) {
      const key = `${m.symptom_code}|${m.drug_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push(m);
      }
    }
  }

  // Bước 2: Auto-mapping theo keyword nếu chưa đủ
  if (mappings.length < CONFIG.MAPPINGS_LIMIT) {
    for (const symptom of symptoms) {
      if (mappings.length >= CONFIG.MAPPINGS_LIMIT) break;

      for (const rule of CATEGORY_RULES) {
        const matchKeyword = rule.symptomKeywords.some((kw) => symptom.code.includes(kw));
        if (!matchKeyword) continue;

        const matchedDrugs = drugs.filter((d) => rule.categories.includes(d.category));
        for (const drug of matchedDrugs) {
          if (mappings.length >= CONFIG.MAPPINGS_LIMIT) break;
          const key = `${symptom.code}|${drug.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            mappings.push({
              symptom_code: symptom.code,
              drug_name: drug.name,
              confidence_score: rule.score,
              notes: 'Auto-generated mapping based on symptom-drug category',
            });
          }
        }
        if (mappings.length >= CONFIG.MAPPINGS_LIMIT) break;
      }
    }
  }

  // Bước 3: Nếu vẫn chưa đủ, pair tất cả symptom với thuốc giảm đau cơ bản
  if (mappings.length < CONFIG.MAPPINGS_LIMIT) {
    const basicDrugs = drugs.filter((d) => ['analgesic', 'nsaid', 'antihistamine'].includes(d.category));
    for (const symptom of symptoms) {
      if (mappings.length >= CONFIG.MAPPINGS_LIMIT) break;
      for (const drug of basicDrugs) {
        if (mappings.length >= CONFIG.MAPPINGS_LIMIT) break;
        const key = `${symptom.code}|${drug.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          mappings.push({
            symptom_code: symptom.code,
            drug_name: drug.name,
            confidence_score: 0.60,
            notes: 'Auto-generated fallback mapping',
          });
        }
      }
    }
  }

  const result = mappings.slice(0, CONFIG.MAPPINGS_LIMIT);
  console.log(`✅ Generate được ${result.length} mappings`);
  return result;
}

// ============================================================
// CSV EXPORT
// ============================================================

async function exportSymptoms(symptoms) {
  console.log(`\n📄 Export SYMPTOMS → symptoms_crawled.csv`);
  const filePath = path.join(CONFIG.OUTPUT_DIR, 'symptoms_crawled.csv');

  const writer = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'code', title: 'code' },
      { id: 'name', title: 'name' },
      { id: 'icd10_code', title: 'icd10_code' },
      { id: 'description', title: 'description' },
    ],
    encoding: 'utf8',
  });

  await writer.writeRecords(symptoms);
  console.log(`  ✅ Exported ${symptoms.length} records → ${filePath}`);
}

async function exportDrugs(drugs) {
  console.log(`\n📄 Export DRUGS → drugs_crawled.csv`);
  const filePath = path.join(CONFIG.OUTPUT_DIR, 'drugs_crawled.csv');

  const writer = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'name', title: 'name' },
      { id: 'generic_name', title: 'generic_name' },
      { id: 'category', title: 'category' },
      { id: 'dosage_form', title: 'dosage_form' },
      { id: 'contraindications', title: 'contraindications' },
    ],
    encoding: 'utf8',
  });

  await writer.writeRecords(drugs);
  console.log(`  ✅ Exported ${drugs.length} records → ${filePath}`);
}

async function exportMappings(mappings) {
  console.log(`\n📄 Export MAPPINGS → mappings_crawled.csv`);
  const filePath = path.join(CONFIG.OUTPUT_DIR, 'mappings_crawled.csv');

  const writer = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'symptom_code', title: 'symptom_code' },
      { id: 'drug_name', title: 'drug_name' },
      { id: 'confidence_score', title: 'confidence_score' },
      { id: 'notes', title: 'notes' },
    ],
    encoding: 'utf8',
  });

  await writer.writeRecords(mappings);
  console.log(`  ✅ Exported ${mappings.length} records → ${filePath}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const crawlSymptomOnly = args.includes('--symptoms');
  const crawlDrugsOnly = args.includes('--drugs');
  const crawlAll = !crawlSymptomOnly && !crawlDrugsOnly;

  console.log('============================================================');
  console.log('MedAssist AI – Web Crawling Script (Node.js)');
  console.log('============================================================');

  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  let symptoms = [];
  let drugs = [];
  let mappings = [];

  try {
    if (crawlAll || crawlSymptomOnly) {
      symptoms = await crawlSymptoms();
    }

    if (crawlAll || crawlDrugsOnly) {
      drugs = await crawlDrugs();
    }

    if (crawlAll) {
      mappings = generateMappings(symptoms, drugs);
    }

    if (symptoms.length > 0) await exportSymptoms(symptoms);
    if (drugs.length > 0) await exportDrugs(drugs);
    if (mappings.length > 0) await exportMappings(mappings);

    console.log('\n============================================================');
    console.log('✅ Hoàn thành!');
    console.log('📊 Kết quả:');
    if (symptoms.length > 0) console.log(`   • Symptoms: ${symptoms.length}`);
    if (drugs.length > 0) console.log(`   • Drugs: ${drugs.length}`);
    if (mappings.length > 0) console.log(`   • Mappings: ${mappings.length}`);
    console.log(`\n📁 Files trong: ${CONFIG.OUTPUT_DIR}`);
    console.log('============================================================');
  } catch (err) {
    console.error(`\n❌ Lỗi nghiêm trọng: ${err.message}`);
    process.exit(1);
  }
}

main();
