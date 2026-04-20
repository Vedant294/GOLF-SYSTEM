import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Trophy, LogOut, LayoutDashboard, Target, History, User, Settings, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Successfully signed out')
      navigate('/')
    } catch (err) {
      navigate('/')
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[rgba(10,10,15,0.95)] backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-transparent'
    }`}>
      <div className="section-container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6EE7B7] to-[#3B82F6] flex items-center justify-center shadow-[0_0_20px_rgba(110,231,183,0.3)] group-hover:shadow-[0_0_30px_rgba(110,231,183,0.5)] transition-all duration-300">
              <Trophy size={20} className="text-[#0A0A0F]" />
            </div>
            <span className="font-syne font-800 text-xl text-white tracking-tight">
              Golff
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/how-it-works" className={`nav-link ${location.pathname === '/how-it-works' ? 'active' : ''}`}>How It Works</Link>
            <Link to="/charities" className={`nav-link ${location.pathname.startsWith('/charities') ? 'active' : ''}`}>Charities</Link>
            {user && <Link to="/draws" className={`nav-link ${location.pathname === '/draws' ? 'active' : ''}`}>Draws</Link>}
            {isAdmin && (
              <Link to="/admin" className="text-[#F59E0B] font-inter text-sm font-600 hover:text-[#FCD34D] transition-colors">
                Admin Panel
              </Link>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 glass-card px-4 py-2 hover:border-[rgba(110,231,183,0.3)] transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6EE7B7] to-[#818CF8] flex items-center justify-center text-[#0A0A0F] font-syne font-bold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-[#F8FAFC] font-inter text-sm font-500 max-w-[120px] truncate">{user.full_name}</span>
                  <ChevronDown size={14} className={`text-[#94A3B8] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 glass-card py-2 shadow-2xl border border-white/10"
                    >
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <LayoutDashboard size={15} className="text-[#6EE7B7]" />
                        <span className="text-[#F8FAFC] font-inter text-sm">Dashboard</span>
                      </Link>
                      <Link to="/scores" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <Target size={15} className="text-[#818CF8]" />
                        <span className="text-[#F8FAFC] font-inter text-sm">My Scores</span>
                      </Link>
                      <Link to="/draws" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <History size={15} className="text-[#F59E0B]" />
                        <span className="text-[#F8FAFC] font-inter text-sm">Draw History</span>
                      </Link>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <User size={15} className="text-[#94A3B8]" />
                        <span className="text-[#F8FAFC] font-inter text-sm">Profile</span>
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="border-t border-white/5 my-1" />
                          <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                            <Settings size={15} className="text-[#F59E0B]" />
                            <span className="text-[#F59E0B] font-inter text-sm font-600">Admin Panel</span>
                          </Link>
                        </>
                      )}
                      <div className="border-t border-white/5 my-1" />
                      <button
                        id="sign-out-btn"
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors w-full"
                      >
                        <LogOut size={15} className="text-[#F87171]" />
                        <span className="text-[#F87171] font-inter text-sm">Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="outline-btn text-sm py-2 px-5">Sign In</Link>
                <Link to="/signup" className="premium-btn text-sm py-2 px-5">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-btn"
            className="md:hidden text-[#F8FAFC] p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[rgba(10,10,15,0.98)] border-t border-white/5"
          >
            <div className="section-container py-4 flex flex-col gap-2">
              <Link to="/how-it-works" className="nav-link py-3">How It Works</Link>
              <Link to="/charities" className="nav-link py-3">Charities</Link>
              {user && <Link to="/dashboard" className="nav-link py-3">Dashboard</Link>}
              {user && <Link to="/scores" className="nav-link py-3">My Scores</Link>}
              {user && <Link to="/draws" className="nav-link py-3">Draws</Link>}
              {user && <Link to="/profile" className="nav-link py-3">Profile</Link>}
              {isAdmin && <Link to="/admin" className="text-[#F59E0B] py-3 font-inter text-sm">Admin Panel</Link>}
              <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                {user ? (
                  <button onClick={handleSignOut} className="text-[#F87171] text-left font-inter text-sm py-3 flex items-center gap-2">
                    <LogOut size={16} /> Sign Out
                  </button>
                ) : (
                  <>
                    <Link to="/login" className="outline-btn text-sm py-3 text-center">Sign In</Link>
                    <Link to="/signup" className="premium-btn text-sm py-3 text-center">Get Started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
