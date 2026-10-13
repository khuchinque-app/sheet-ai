import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal, FileText, Image, FileSpreadsheet, Mail,
  Bell, Zap, TrendingUp, Clock, CheckCircle2, AlertCircle,
  X, Send, ChevronRight, BarChart3, PieChart
} from 'lucide-react';
import { Notification } from '../types';
import { mockNotifications } from '../data';

interface RightSidebarProps {
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
}

export default function RightSidebar({ notifications, onMarkNotificationRead }: RightSidebarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState<'pdf' | 'xlsx' | 'image'>('pdf');
  const [reportEmail, setReportEmail] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleSendReport = () => {
    setReportSending(true);
    setTimeout(() => {
      setReportSending(false);
      setReportSent(true);
      setTimeout(() => {
        setReportSent(false);
        setShowReportModal(false);
        setReportEmail('');
      }, 2000);
    }, 1500);
  };

  const stats = [
    { label: 'Completed', value: '4', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'In Progress', value: '4', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Blocked', value: '1', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'AI Actions', value: '45/50', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  const recentActivity = [
    { text: 'Task #104 marked as Done', time: '2 min ago', type: 'success' as const },
    { text: 'New task #112 created', time: '15 min ago', type: 'info' as const },
    { text: 'Report sent to team@co.com', time: '1 hour ago', type: 'success' as const },
    { text: 'Task #108 blocked', time: '3 hours ago', type: 'warning' as const },
  ];

  return (
    <div className="w-72 h-full bg-slate-900/50 border-l border-slate-700/50 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            More
          </button>

          <AnimatePresence>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-1">
                    <button
                      onClick={() => { setShowReportModal(true); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Generate Report
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all">
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      Export to Excel
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all">
                      <Image className="w-4 h-4 text-purple-400" />
                      Export as Image
                    </button>
                    <div className="my-1 border-t border-slate-700" />
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all">
                      <BarChart3 className="w-4 h-4 text-yellow-400" />
                      Analytics View
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all">
                      <PieChart className="w-4 h-4 text-pink-400" />
                      Summary Dashboard
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Stats Grid */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overview</h4>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${stat.bg} rounded-lg p-2.5 border border-slate-700/30`}>
                  <Icon className={`w-4 h-4 ${stat.color} mb-1`} />
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sprint Progress</h4>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-300">Completion Rate</span>
              <span className="text-xs font-bold text-indigo-400">33%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '33%' }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-500">4 of 12 tasks done</span>
              <TrendingUp className="w-3 h-3 text-green-400" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  activity.type === 'success' ? 'bg-green-400' :
                  activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{activity.text}</p>
                  <p className="text-[10px] text-slate-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notifications</h4>
            <Bell className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  notif.read
                    ? 'bg-slate-800/30 border-slate-700/30'
                    : 'bg-indigo-500/5 border-indigo-500/20'
                }`}
                onClick={() => onMarkNotificationRead(notif.id)}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    notif.type === 'success' ? 'bg-green-400' :
                    notif.type === 'warning' ? 'bg-yellow-400' :
                    notif.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200">{notif.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{notif.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-semibold text-white">Send Report</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Format selection */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Report Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pdf' as const, label: 'PDF', icon: FileText, color: 'text-red-400' },
                    { value: 'xlsx' as const, label: 'Excel', icon: FileSpreadsheet, color: 'text-green-400' },
                    { value: 'image' as const, label: 'Image', icon: Image, color: 'text-purple-400' },
                  ].map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.value}
                        onClick={() => setReportFormat(format.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          reportFormat === format.value
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${format.color}`} />
                        <span className="text-xs text-slate-300">{format.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email input */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Send to Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    placeholder="recipient@company.com"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 mb-2 block">Include</label>
                {['All tasks', 'Status summary', 'Priority breakdown', 'Assignee overview'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50" />
                    <span className="text-xs text-slate-300">{option}</span>
                  </label>
                ))}
              </div>

              {/* Send button */}
              <button
                onClick={handleSendReport}
                disabled={!reportEmail || reportSending || reportSent}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all"
              >
                {reportSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : reportSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Report Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate & Send Report
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
