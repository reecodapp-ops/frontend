import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Package,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import logo from '../../assets/images/Brand Mark coloured.png'

// NOTE: 'Sales' now links to the sales list page (/sales), which has its
// own "Record a sale" button linking to /sales/new — so there's no separate
// sidebar item for recording a sale anymore, just one entry point.
//
// nav item labels are translation keys — resolved at render time via t()
// so they update instantly when the user switches language.
const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, key: 'nav.dashboard'  },
  { to: '/sales',       icon: ShoppingCart,    key: 'nav.sales'      },
  { to: '/customers',   icon: Users,           key: 'nav.customers'  },
  { to: '/suppliers',   icon: Truck,           key: 'nav.suppliers'  },
  { to: '/products',    icon: Package,         key: 'nav.products'   },
  { to: '/settings',    icon: Settings,        key: 'nav.settings'   },
]

const Sidebar = () => {
  const { user, business, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-20">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Reecod" className="h-8 w-8 object-contain flex-shrink-0" />
          <div>
            <p className="text-muted text-xs truncate max-w-[120px]">
              {business?.name || user?.name || 'My Shop'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout + language selector */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-muted hover:text-danger hover:bg-red-50"
        >
          <LogOut size={16} />
          <span>{t('nav.log_out')}</span>
        </button>

        {/* Language picker — sits at the very bottom of the sidebar */}
        <div className="mt-3 px-2">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
