import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import TradesPage from './pages/TradesPage'
import ImportPage from './pages/ImportPage'
import RiskRewardPage from './pages/RiskRewardPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#6366f1"/>
              <polyline points="4,20 10,12 15,16 24,6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="app-brand">TradeViewer</span>
          </div>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>Trades</NavLink>
            <NavLink to="/import" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>Import</NavLink>
            <NavLink to="/risk-reward" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>Risk / Reward</NavLink>
          </nav>
        </header>
        <main className="app-main">
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
