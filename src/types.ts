export interface Task {
  id: number;
  title: string;
  assignee: string;
  status: 'Not Started' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  category: string;
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface User {
  email: string;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  aiActionsUsed: number;
  aiActionsLimit: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}
