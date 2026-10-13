import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DataGrid from './components/DataGrid';
import ChatBox from './components/ChatBox';
import RightSidebar from './components/RightSidebar';
import { Task, ChatMessage, Notification } from './types';
import { initialTasks, mockNotifications } from './data';
import { parseAICommand, executeIntent } from './workspace/aiEngine';

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('workspace');
  const [darkMode, setDarkMode] = useState(true);

  // Data state
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiActionsUsed, setAiActionsUsed] = useState(45);
  const aiActionsLimit = 50;

  const handleLogin = (email: string, name: string) => {
    setUserEmail(email);
    setUserName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserName('');
    setUserEmail('');
  };

  const handleUpdateTask = useCallback((id: number, field: string, value: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, [field]: value } : task
    ));
  }, []);

  const handleAddTask = useCallback(() => {
    setTasks(prev => {
      const newId = Math.max(...prev.map(t => t.id)) + 1;
      const newTask: Task = {
        id: newId,
        title: '',
        assignee: userName || 'Unassigned',
        status: 'Not Started',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'General',
        notes: '',
      };
      return [...prev, newTask];
    });
  }, [userName]);

  const handleDeleteTask = useCallback((rowIndex: number) => {
    setTasks(prev => prev.filter((_, i) => i !== rowIndex));
  }, []);

  const handleBatchUpdate = useCallback((updates: { rowIndex: number; colKey: string; value: string }[]) => {
    setTasks(prev => {
      const newTasks = [...prev];
      updates.forEach(u => {
        if (newTasks[u.rowIndex]) {
          newTasks[u.rowIndex] = { ...newTasks[u.rowIndex], [u.colKey]: u.value };
        }
      });
      return newTasks;
    });
  }, []);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleSendMessage = (message: string) => {
    // Check if this is an AI response being added
    if (message.startsWith('__AI_RESPONSE__')) {
      const msgData = JSON.parse(message.replace('__AI_RESPONSE__', ''));
      setChatMessages(prev => [...prev, msgData]);
      setIsProcessing(false);
      return;
    }

    if (aiActionsUsed >= aiActionsLimit) {
      const limitMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ You have reached your AI action limit (50/50) for this month. Please upgrade your plan or wait until next month.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, limitMsg]);
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Process with AI engine
    setTimeout(() => {
      const intent = parseAICommand(message, tasks);
      const response = executeIntent(intent, tasks, {
        updateCell: (rowIndex, colKey, value) => {
          if (rowIndex >= 0 && rowIndex < tasks.length) {
            handleUpdateTask(tasks[rowIndex].id, colKey, value);
          }
        },
        addRow: () => handleAddTask(),
        deleteRow: (rowIndex) => handleDeleteTask(rowIndex),
        batchUpdate: (updates) => handleBatchUpdate(updates)
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);
      setAiActionsUsed(prev => prev + 1);
    }, 600);
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={handleLogout}
          userName={userName}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            userName={userName}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />

          <AnimatePresence mode="wait">
            {activeSection === 'workspace' ? (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex overflow-hidden"
              >
                {/* Data Grid */}
                <div className="flex-1 overflow-hidden">
                  <DataGrid
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    onAddTask={handleAddTask}
                  />
                </div>

                {/* Right Sidebar */}
                <RightSidebar
                  notifications={notifications}
                  onMarkNotificationRead={handleMarkNotificationRead}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">
                      {activeSection === 'profile' && '👤'}
                      {activeSection === 'billing' && '💳'}
                      {activeSection === 'notifications' && '🔔'}
                      {activeSection === 'security' && '🔒'}
                      {activeSection === 'appearance' && '🎨'}
                      {activeSection === 'help' && '❓'}
                      {activeSection === 'contact' && '💬'}
                      {activeSection === 'docs' && '📄'}
                      {activeSection === 'status' && '📊'}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-white capitalize mb-1">{activeSection}</h2>
                  <p className="text-sm text-slate-400">This section is under development</p>
                  <button
                    onClick={() => setActiveSection('workspace')}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-all"
                  >
                    Back to Workspace
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Box */}
          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            aiActionsUsed={aiActionsUsed}
            aiActionsLimit={aiActionsLimit}
            isProcessing={isProcessing}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onBatchUpdate={handleBatchUpdate}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
