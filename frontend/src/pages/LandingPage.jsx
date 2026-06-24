import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 overflow-hidden flex flex-col font-sans">
      {/* Background Glowing Orbs (Soft Teals & Emeralds) */}
      <div className="bg-glow-orb w-[500px] h-[500px] bg-teal-500 top-[-10%] left-[-10%] opacity-[0.08]"></div>
      <div className="bg-glow-orb w-[600px] h-[600px] bg-cyan-600 bottom-[-20%] right-[-10%] opacity-[0.08]"></div>
      <div className="bg-glow-orb w-[300px] h-[300px] bg-emerald-500 top-[40%] left-[30%] opacity-[0.06]"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0B0F19]/40 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              M
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              MedAssist <span className="text-teal-400">AI</span>
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn-gradient px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow container mx-auto px-6 py-16 md:py-24 flex flex-col items-center justify-center">
        <div className="text-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border-teal-500/20 text-xs font-semibold text-teal-400 mb-2 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.1)]">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            Hệ thống Y tế AI thế hệ mới
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Cách Tốt Nhất Để <br className="hidden md:inline" />
            <span className="text-gradient-neon">Kiểm Tra Triệu Chứng</span> & Nhận Gợi Ý Thuốc
          </h1>

          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Hệ thống hỗ trợ sức khỏe thông minh dựa trên trí tuệ nhân tạo. Phân tích triệu chứng, quản lý tiền sử bệnh án và ngăn ngừa nguy cơ dị ứng thuốc chỉ trong vài cú chạm.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/register" className="btn-gradient w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl shadow-[0_0_25px_rgba(20,184,166,0.35)]">
              Bắt đầu trải nghiệm ngay
            </Link>
            <Link to="/login" className="btn-neon-outline w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl">
              Khám phá các chức năng
            </Link>
          </div>
        </div>

        {/* Dynamic CSS UI Mockup */}
        <div className="mt-16 md:mt-24 w-full max-w-4xl relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-cyan-500/10 rounded-2xl blur-2xl"></div>
          
          <div className="relative glass-card rounded-2xl overflow-hidden border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Window bar */}
            <div className="h-10 bg-black/40 border-b border-white/5 flex items-center px-4 space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              <span className="text-xs text-slate-500 ml-4 font-mono">medassist-ai.io/dashboard</span>
            </div>

            {/* Mockup Content */}
            <div className="p-6 md:p-10 grid md:grid-cols-5 gap-6 bg-black/20">
              {/* Left Column: Selector Mockup */}
              <div className="md:col-span-3 space-y-4">
                <div className="h-6 w-32 bg-white/10 rounded-lg"></div>
                <div className="h-10 bg-white/5 border border-white/10 rounded-xl flex items-center px-3 space-x-2 text-slate-500 text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span>Tìm kiếm triệu chứng (ví dụ: đau đầu, ho sốt...)</span>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {['Đau đầu', 'Sốt nhẹ', 'Ho khan', 'Nghẹt mũi'].map((t, idx) => (
                    <span key={idx} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${idx === 0 ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      + {t}
                    </span>
                  ))}
                </div>
                <div className="h-12 w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                  <span>Phân Tích Bằng Trí Tuệ Nhân Tạo</span>
                </div>
              </div>

              {/* Right Column: AI Suggestion Card Mockup */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-bl-full"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-teal-500/20 rounded-md"></div>
                    <span className="text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-full">Độ tin cậy 92%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-white/10 rounded"></div>
                    <div className="h-3 w-5/6 bg-white/5 rounded"></div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-slate-500">
                    <span>Liều lượng: 2 viên / ngày</span>
                    <span>Tình trạng: Phù hợp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 bg-black/30 border-t border-white/5 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Được Tích Hợp Các Tính Năng <span className="text-teal-400">Bảo Vệ Sức Khỏe</span> Vượt Trội
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Triệu chứng (Pill/Checklist SVG) */}
            <div className="glass-card p-8 rounded-2xl border-white/5 hover:border-teal-500/30 transition-all duration-300 group hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(20,184,166,0.15)] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Kiểm tra triệu chứng</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Nhập các triệu chứng hiện tại của bạn, thuật toán AI thông minh sẽ phân tích và đưa ra danh mục gợi ý thuốc phù hợp cùng các cảnh báo an toàn tức thời.
              </p>
            </div>

            {/* Card 2: Bệnh lý (Folder Open SVG) */}
            <div className="glass-card p-8 rounded-2xl border-white/5 hover:border-cyan-500/30 transition-all duration-300 group hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(8,145,178,0.15)] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Tiền sử bệnh lý</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Lưu trữ và đồng bộ hóa thông tin tiền sử bệnh lý cá nhân. Hệ thống AI sẽ căn cứ vào đây để loại trừ các tác nhân gây hại có nguy cơ bùng phát.
              </p>
            </div>

            {/* Card 3: Cảnh báo (Exclamation/Shield SVG) */}
            <div className="glass-card p-8 rounded-2xl border-white/5 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.15)] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Cảnh báo dị ứng</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Đăng ký danh mục các thành phần dị ứng thuốc của bạn. MedAssist AI sẽ tự động kiểm duyệt và chặn đứng mọi khuyến nghị chứa hoạt chất nguy hại.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 space-y-4 md:space-y-0">
          <div>
            &copy; {new Date().getFullYear()} MedAssist AI. Đã đăng ký bản quyền.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
