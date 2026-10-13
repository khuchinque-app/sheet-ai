import { Task, Notification } from './types';

export const initialTasks: Task[] = [
  { id: 101, title: 'Design homepage wireframe', assignee: 'Sarah Chen', status: 'Done', priority: 'High', dueDate: '2026-01-15', category: 'Design', notes: 'Completed ahead of schedule' },
  { id: 102, title: 'Set up CI/CD pipeline', assignee: 'Mike Johnson', status: 'In Progress', priority: 'Critical', dueDate: '2026-01-20', category: 'DevOps', notes: 'GitHub Actions configured' },
  { id: 103, title: 'Write API documentation', assignee: 'Alex Rivera', status: 'In Progress', priority: 'Medium', dueDate: '2026-01-22', category: 'Documentation', notes: 'Using Swagger/OpenAPI' },
  { id: 104, title: 'User authentication module', assignee: 'Sarah Chen', status: 'Done', priority: 'Critical', dueDate: '2026-01-18', category: 'Backend', notes: 'JWT + refresh tokens' },
  { id: 105, title: 'Database schema migration', assignee: 'Mike Johnson', status: 'Not Started', priority: 'High', dueDate: '2026-01-25', category: 'Backend', notes: 'PostgreSQL v15 upgrade' },
  { id: 106, title: 'Mobile responsive layout', assignee: 'Lisa Park', status: 'In Progress', priority: 'Medium', dueDate: '2026-01-28', category: 'Frontend', notes: 'Breakpoints at 768px and 1024px' },
  { id: 107, title: 'Performance audit', assignee: 'Alex Rivera', status: 'Not Started', priority: 'Low', dueDate: '2026-02-01', category: 'QA', notes: 'Lighthouse score target: 90+' },
  { id: 108, title: 'Email template design', assignee: 'Lisa Park', status: 'Blocked', priority: 'Medium', dueDate: '2026-01-30', category: 'Design', notes: 'Waiting for copy from marketing' },
  { id: 109, title: 'Stripe integration', assignee: 'Sarah Chen', status: 'In Progress', priority: 'Critical', dueDate: '2026-02-05', category: 'Backend', notes: 'Webhooks configured' },
  { id: 110, title: 'User onboarding flow', assignee: 'Mike Johnson', status: 'Not Started', priority: 'High', dueDate: '2026-02-10', category: 'Frontend', notes: '3-step wizard' },
  { id: 111, title: 'Analytics dashboard', assignee: 'Alex Rivera', status: 'Not Started', priority: 'Medium', dueDate: '2026-02-15', category: 'Frontend', notes: 'Recharts implementation' },
  { id: 112, title: 'Security penetration test', assignee: 'Lisa Park', status: 'Not Started', priority: 'Critical', dueDate: '2026-02-20', category: 'QA', notes: 'OWASP Top 10 checklist' },
];

export const mockNotifications: Notification[] = [
  { id: '1', title: 'Report Generated', message: 'Weekly summary report has been emailed to team@company.com', type: 'success', read: false, timestamp: new Date(Date.now() - 300000) },
  { id: '2', title: 'AI Action Limit', message: 'You have used 45 of 50 AI actions this month', type: 'warning', read: false, timestamp: new Date(Date.now() - 3600000) },
  { id: '3', title: 'New Team Member', message: 'Alex Rivera has joined your workspace', type: 'info', read: true, timestamp: new Date(Date.now() - 86400000) },
  { id: '4', title: 'Database Backup', message: 'Automatic backup completed successfully', type: 'success', read: true, timestamp: new Date(Date.now() - 172800000) },
];

export const statusColors: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done': 'bg-green-100 text-green-700',
  'Blocked': 'bg-red-100 text-red-700',
};

export const priorityColors: Record<string, string> = {
  'Low': 'bg-slate-100 text-slate-600',
  'Medium': 'bg-yellow-100 text-yellow-700',
  'High': 'bg-orange-100 text-orange-700',
  'Critical': 'bg-red-100 text-red-700',
};
