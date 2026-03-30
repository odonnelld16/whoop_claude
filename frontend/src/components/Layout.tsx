import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Heart, Moon, Battery, Dumbbell, Settings, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/heartrate', icon: Heart, label: 'Heart Rate' },
  { to: '/sleep', icon: Moon, label: 'Sleep' },
  { to: '/recovery', icon: Battery, label: 'Recovery' },
  { to: '/workouts', icon: Dumbbell, label: 'Workouts' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.sync(30)
    } finally {
      setTimeout(() => setSyncing(false), 2000)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060810' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r"
        style={{ background: '#0d1117', borderColor: '#1e2535' }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: '#1e2535' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF3B5C, #4FC3F7)' }}>
              <Heart size={14} color="white" fill="white" />
            </div>
            <span className="font-semibold text-sm tracking-wide text-white">FitMetrics</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(255,255,255,0.08)', color: 'white' } : {}
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sync + Settings */}
        <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: '#1e2535' }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-white/5 disabled:opacity-50"
            style={{ color: syncing ? '#4FC3F7' : '#6b7990' }}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Data'}
          </button>
          <NavLink
            to="/connect"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5 ${
                isActive ? 'text-white' : ''
              }`
            }
            style={{ color: '#6b7990' }}
          >
            <Settings size={16} />
            Connections
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
