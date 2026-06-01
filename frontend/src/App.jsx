import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import TradesPage from './pages/TradesPage'
import ImportPage from './pages/ImportPage'
import RiskRewardPage from './pages/RiskRewardPage'

const navStyle = ({ isActive }) => ({
  padding: '8px 16px',
  borderRadius: '8px',
  fontWeight: 500,
  fontSize: '14px',
  color: isActive ? '#fff' : '#8892a4',
  background: isActive ? '#6366f1' : 'transparent',
  transition: 'all 0.15s',
})

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          background: '#1a1d27',
          borderBottom: '1px solid #2e3248',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '24px' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#6366f1"/>
              <polyline points="4,20 10,12 15,16 24,6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#e2e8f0' }}>TradeViewer</span>
          </div>
          <nav style={{ display: 'flex', gap: '4px' }}>
            <NavLink to="/" end style={navStyle}>Trades</NavLink>
            <NavLink to="/import" style={navStyle}>Import</NavLink>
            <NavLink to="/risk-reward" style={navStyle}>Risk / Reward</NavLink>
          </nav>
        </header>
        <main style={{ flex: 1, padding: '28px 24px' }}>
          <Routes>
            <Route path="/" element={<TradesPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/risk-reward" element={<RiskRewardPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
