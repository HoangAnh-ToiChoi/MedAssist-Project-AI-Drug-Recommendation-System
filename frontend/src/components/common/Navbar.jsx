import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Navbar chinh cua ung dung voi menu dieu huong
const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const navLinks = [
    { to: '/symptoms', label: 'Kiem tra trieu chung' },
    { to: '/history', label: 'Tien su benh' },
    { to: '/allergy', label: 'Di ung' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-primary shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/symptoms" className="flex items-center space-x-2">
            <span className="text-white font-bold text-xl">MedAssist AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.to)
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User info + Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-blue-100 text-sm">{user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-white text-primary px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Dang xuat
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 text-sm ${isActive(link.to) ? 'text-white font-semibold' : 'text-blue-100'}`}
              >
                {link.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="block mt-2 text-blue-100 text-sm">
              Dang xuat
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
