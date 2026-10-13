import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Sparkles, ChevronUp, ChevronDown,
  Zap, RefreshCw, X
} from 'lucide-react';
import { ChatMessage, Task } from '../types';
import { parseAICommand, executeIntent } from '../workspace/aiEngine';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  aiActionsUsed: number;
  aiActionsLimit: number;
  isProcessing: boolean;
  tasks: Task[];
  onUpdateTask: (id: number, field: string, value: string) => void;
  onAddTask: () => void;
  onDeleteTask: (rowIndex: number) => void;
  onBatchUpdate: (updates: { rowIndex: number; colKey: string; value: string }[]) => void;
}

export default function ChatBox({
  messages, onSendMessage, aiActionsUsed, aiActionsLimit, isProcessing,
  tasks, onUpdateTask, onAddTask, onDeleteTask, onBatchUpdate
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      processAIMessage(input.trim());
      setInput('');
    }
  };

  const processAIMessage = (message: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    onSendMessage(message);

    // Parse intent using AI engine
    const intent = parseAICommand(message, tasks);

    // Execute intent
    const response = executeIntent(intent, tasks, {
      updateCell: (rowIndex, colKey, value) => {
        if (rowIndex >= 0 && rowIndex < tasks.length) {
          onUpdateTask(tasks[rowIndex].id, colKey, value);
        }
      },
      addRow: () => onAddTask(),
      deleteRow: (rowIndex) => onDeleteTask(rowIndex),
      batchUpdate: (updates) => onBatchUpdate(updates)
    });

    // Add AI response after delay
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      // We need to add this to messages - use the callback
      onSendMessage('__AI_RESPONSE__' + JSON.stringify(assistantMsg));
    }, 800);
  };

  const suggestions = [
    'Show me all blocked tasks',
    'Mark task #105 as Done',
    'Give me a summary',
    'Who has the most tasks?',
    'Sort by priority',
    'Add a task for Mike due tomorrow',
  ];

  const usagePercentage = (aiActionsUsed / aiActionsLimit) * 100;

  return (
    <motion.div
      animate={{ height: expanded ? 380 : 52 }}
      transition={{ duration: 0.3 }}
      className="border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-800/30 transition-colors flex-shrink-0"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                Column-Aware
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              {aiActionsUsed}/{aiActionsLimit} actions • Understands all columns
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-yellow-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <Zap className="w-3 h-3 text-slate-500" />
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Column awareness indicator */}
            <div className="px-4 py-1.5 border-b border-slate-800/50 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500">I understand:</span>
              {['ID', 'Task', 'Assignee', 'Status', 'Priority', 'Due Date', 'Category', 'Notes'].map((col) => (
                <span key={col} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                  {col}
                </span>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 mb-3">I understand your spreadsheet columns. Ask me anything about your data!</p>
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-lg mx-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 hover:border-slate-600 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-4 py-2.5 border-t border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-all">
                <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your data... (e.g., 'Show blocked tasks', 'Mark #105 as Done')"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  disabled={isProcessing}
                />
                {isProcessing && <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />}
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg flex items-center justify-center text-white transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 text-center">
                I can read, write, filter, sort, and analyze your spreadsheet columns • {aiActionsLimit - aiActionsUsed} actions remaining
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
