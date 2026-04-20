import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Public Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import HowItWorks from './pages/HowItWorks'
import Charities from './pages/Charities'
import CharityProfile from './pages/CharityProfile'

// User Pages
import Dashboard from './pages/Dashboard'
import Scores from './pages/Scores'
import Draws from './pages/Draws'
import Profile from './pages/Profile'
import WinnerVerify from './pages/WinnerVerify'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDraws from './pages/admin/AdminDraws'
import AdminCharities from './pages/admin/AdminCharities'
import AdminWinners from './pages/admin/AdminWinners'
import AdminReports from './pages/admin/AdminReports'
import DevMailDrawer from './components/DevMailDrawer'

function App() {
  const { loading, initialized } = useAuth()

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="mesh-bg" />
      <NavBar />
      <DevMailDrawer />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/charities" element={<Charities />} />
        <Route path="/charities/:slug" element={<CharityProfile />} />

        {/* User Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scores" element={<ProtectedRoute><Scores /></ProtectedRoute>} />
        <Route path="/draws" element={<ProtectedRoute><Draws /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/winners/verify" element={<ProtectedRoute><WinnerVerify /></ProtectedRoute>} />

        {/* Admin Protected */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/draws" element={<AdminRoute><AdminDraws /></AdminRoute>} />
        <Route path="/admin/charities" element={<AdminRoute><AdminCharities /></AdminRoute>} />
        <Route path="/admin/winners" element={<AdminRoute><AdminWinners /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
