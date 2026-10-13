import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Moon, Sun, Command, Settings,
  ChevronDown, Crown
} from 'lucide-react';

interface HeaderProps {
  userName: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({ userName, darkMode, onToggleDarkMode }: HeaderProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-4 z-30 relative">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-white">Workspace</h1>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="hidden md:flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 w-72">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search anything..."
            className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none flex-1 ml-2"
          />
          <div className="flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
            <Command className="w-2.5 h-2.5" />
            K
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Upgrade badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-medium text-amber-300">Pro Plan</span>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-700">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {[
                      { title: 'Report Generated', desc: 'Weekly report sent to team@co.com', time: '2m ago', unread: true },
                      { title: 'AI Limit Warning', desc: '45/50 actions used this month', time: '1h ago', unread: true },
                      { title: 'New Team Member', desc: 'Alex Rivera joined workspace', time: '1d ago', unread: false },
                    ].map((notif, i) => (
                      <div key={i} className={`px-3 py-2.5 rounded-lg ${notif.unread ? 'bg-indigo-500/5' : ''} hover:bg-slate-700/50 cursor-pointer transition-all`}>
                        <div className="flex items-start gap-2">
                          {notif.unread && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />}
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-200">{notif.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{notif.desc}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-700">
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <Settings className="w-4 h-4" />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
