import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, User, CreditCard, Bell, Shield, Palette,
  HelpCircle, MessageSquare, FileText, Activity,
  ChevronLeft, ChevronRight, LogOut, Settings
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  userName: string;
}

const navItems = [
  { id: 'workspace', icon: Database, label: 'Workspace' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'notifications', icon: Bell, label: 'Notifications', badge: 2 },
  { id: 'security', icon: Shield, label: 'Security' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
];

const bottomItems = [
  { id: 'help', icon: HelpCircle, label: 'Help Center' },
  { id: 'contact', icon: MessageSquare, label: 'Contact Us' },
  { id: 'docs', icon: FileText, label: 'Documentation' },
  { id: 'status', icon: Activity, label: 'Status' },
];

export default function Sidebar({ collapsed, onToggle, activeSection, onSectionChange, onLogout, userName }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.2 }}
      className="h-full bg-slate-900 border-r border-slate-800 flex flex-col relative z-20"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <Database className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-2.5 font-bold text-white text-lg"
          >
            DataFlow
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative group ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r"
                />
              )}
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {collapsed && hoveredItem === item.id && (
                <div className="absolute left-full ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-800">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all relative"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                {collapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{userName}</p>
              <p className="text-[10px] text-slate-500">Pro Plan</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <button className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Settings</span>}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg z-30"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
