import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Navbar chính của ứng dụng với thiết kế Premium Glassmorphism
const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return {};
    }
  }

  const user = getStoredUser()

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    navigate('/')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Bảng điều khiển' },
    { to: '/symptoms', label: 'Kiểm tra triệu chứng' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="relative z-50 border-b border-white/5 bg-[#0B0B0C]/60 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00F0FF] to-[#8A2BE2] flex items-center justify-center font-bold text-black text-lg shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              M
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              MedAssist <span className="text-[#00F0FF]">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-all duration-300 relative py-2 ${
                  isActive(link.to)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00F0FF] to-[#8A2BE2] rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)]"></span>
                )}
              </Link>
            ))}
          </div>

          {/* User Info & Logout Button */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-gray-300 text-xs font-medium">{user.email || 'Người dùng'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-300"
            >
              Đăng xuất
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-white/5 space-y-3 bg-[#0B0B0C]">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-white/5 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/5 my-2 mx-4"></div>
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 font-semibold hover:underline"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
