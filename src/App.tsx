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
import { v4 as uuidv4 } from 'uuid';

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

  const handleAddTask = () => {
    const newId = Math.max(...tasks.map(t => t.id)) + 1;
    const newTask: Task = {
      id: newId,
      title: 'New Task',
      assignee: userName || 'Unassigned',
      status: 'Not Started',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      category: 'General',
      notes: '',
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const processAIResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (lower.includes('mark') && lower.includes('done')) {
      const match = userMessage.match(/#?(\d+)/);
      if (match) {
        const taskId = parseInt(match[1]);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          handleUpdateTask(taskId, 'status', 'Done');
          return `✅ Done! Task #${taskId} "${task.title}" has been marked as **Done**. The grid has been updated in real-time.`;
        }
        return `❌ I couldn't find task #${taskId}. Please check the task ID and try again.`;
      }
      return `I'd be happy to mark a task as done. Please specify the task ID (e.g., "Mark task #105 as Done").`;
    }

    if (lower.includes('add') && (lower.includes('task') || lower.includes('new'))) {
      handleAddTask();
      const newId = Math.max(...tasks.map(t => t.id));
      return `✅ New task created with ID #${newId}. You can edit the details by double-clicking on any cell in the grid.`;
    }

    if (lower.includes('blocked')) {
      const blocked = tasks.filter(t => t.status === 'Blocked');
      if (blocked.length > 0) {
        const list = blocked.map(t => `• #${t.id}: ${t.title} (${t.assignee})`).join('\n');
        return `🔴 Found ${blocked.length} blocked task(s):\n${list}\n\nWould you like me to help resolve any of these?`;
      }
      return `✅ No blocked tasks found! All tasks are either in progress, completed, or not started.`;
    }

    if (lower.includes('report')) {
      return `📊 I can generate a report for you. Please use the **"More"** button in the right sidebar to:\n\n1. Select the format (PDF, Excel, or Image)\n2. Enter the recipient email\n3. Choose what to include\n\nThe report will be generated and emailed automatically.`;
    }

    if (lower.includes('status') || lower.includes('summary') || lower.includes('overview')) {
      const done = tasks.filter(t => t.status === 'Done').length;
      const inProgress = tasks.filter(t => t.status === 'In Progress').length;
      const notStarted = tasks.filter(t => t.status === 'Not Started').length;
      const blocked = tasks.filter(t => t.status === 'Blocked').length;
      return `📈 **Task Summary:**\n• ✅ Done: ${done}\n• 🔄 In Progress: ${inProgress}\n• ⏳ Not Started: ${notStarted}\n• 🚫 Blocked: ${blocked}\n\nTotal: ${tasks.length} tasks`;
    }

    if (lower.includes('help') || lower.includes('what can you do')) {
      return `🤖 I can help you with:\n\n• **Update tasks** - "Mark task #105 as Done"\n• **Create tasks** - "Add a new task for next week"\n• **Filter data** - "Show me all blocked tasks"\n• **Generate reports** - "Generate weekly report"\n• **Get summaries** - "Give me a task overview"\n\nJust type naturally and I'll handle the rest!`;
    }

    return `I understand you want to: "${userMessage}"\n\nI can help with task management, data analysis, and report generation. Try commands like:\n• "Mark task #105 as Done"\n• "Show me all blocked tasks"\n• "Give me a task summary"\n\nType "help" for more options.`;
  };

  const handleSendMessage = (message: string) => {
    if (aiActionsUsed >= aiActionsLimit) {
      const limitMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '⚠️ You have reached your AI action limit (50/50) for this month. Please upgrade your plan or wait until next month for more actions.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, limitMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = processAIResponse(message);
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);
      setAiActionsUsed(prev => prev + 1);
    }, 1200);
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Main layout */}
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
          {/* Header */}
          <Header
            userName={userName}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />

          {/* Workspace content */}
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
