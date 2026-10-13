import { Task } from '../types';

/**
 * AI Engine that deeply understands the spreadsheet columns
 * Maps natural language to actual column operations
 */

export interface AIIntent {
  type: 'filter' | 'update' | 'create' | 'query' | 'sort' | 'delete' | 'summary' | 'batch_update' | 'help';
  description: string;
  column?: string;
  columnKey?: string;
  value?: string;
  taskId?: number;
  filterValue?: string;
  filterOperator?: 'equals' | 'contains' | 'starts_with' | 'not_equals';
  sortDirection?: 'asc' | 'desc';
  createData?: Partial<Task>;
  batchUpdates?: { taskId: number; field: string; value: string }[];
}

// Column definitions the AI understands
const COLUMN_MAP: Record<string, { key: keyof Task; aliases: string[]; description: string }> = {
  id: { key: 'id', aliases: ['id', 'task id', 'number', '#', 'task number'], description: 'Unique task identifier' },
  title: { key: 'title', aliases: ['title', 'task', 'name', 'task name', 'description', 'what'], description: 'Task name or description' },
  assignee: { key: 'assignee', aliases: ['assignee', 'assigned to', 'owner', 'person', 'who', 'worker', 'team member'], description: 'Person responsible for the task' },
  status: { key: 'status', aliases: ['status', 'state', 'progress', 'done', 'complete'], description: 'Current task status (Not Started, In Progress, Done, Blocked)' },
  priority: { key: 'priority', aliases: ['priority', 'importance', 'urgency', 'level'], description: 'Task priority (Low, Medium, High, Critical)' },
  dueDate: { key: 'dueDate', aliases: ['due date', 'deadline', 'due', 'when', 'date', 'due by'], description: 'When the task is due' },
  category: { key: 'category', aliases: ['category', 'type', 'group', 'department', 'area'], description: 'Task category or department' },
  notes: { key: 'notes', aliases: ['notes', 'note', 'comments', 'comment', 'details', 'description'], description: 'Additional notes or comments' }
};

const STATUS_VALUES = ['Not Started', 'In Progress', 'Done', 'Blocked'];
const PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Critical'];

export function parseAICommand(message: string, tasks: Task[]): AIIntent {
  const lower = message.toLowerCase().trim();

  // Help
  if (lower === 'help' || lower.includes('what can you do') || lower.includes('how do i')) {
    return {
      type: 'help',
      description: 'Show available commands'
    };
  }

  // Summary / Overview
  if (lower.includes('summary') || lower.includes('overview') || lower.includes('how many') || lower.includes('count')) {
    return { type: 'summary', description: 'Generate data summary' };
  }

  // Sort commands
  const sortMatch = lower.match(/sort\s+(?:by\s+)?(\w+(?:\s+\w+)?)\s*(asc|desc|ascending|descending|a to z|z to a|up|down)?/);
  if (sortMatch || lower.includes('sort')) {
    const colName = sortMatch ? sortMatch[1] : extractColumnName(lower);
    const col = findColumn(colName);
    if (col) {
      const dir = sortMatch?.[2]?.includes('desc') || sortMatch?.[2]?.includes('down') || sortMatch?.[2]?.includes('z to a')
        ? 'desc' : 'asc';
      return {
        type: 'sort',
        description: `Sort by ${col.key}`,
        column: col.key,
        columnKey: col.key as string,
        sortDirection: dir
      };
    }
  }

  // Create / Add task
  if (lower.includes('add') || lower.includes('create') || lower.includes('new task') || lower.includes('insert')) {
    const createData: Partial<Task> = {};
    
    // Extract assignee
    const assigneeMatch = message.match(/(?:for|assign(?:ed)?\s+to|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (assigneeMatch) createData.assignee = assigneeMatch[1];
    
    // Extract title
    const titleMatch = message.match(/(?:task|called|named|titled)\s+(?:["']?)(.+?)(?:["']?\s+(?:for|assign|due|$))/i);
    if (titleMatch) createData.title = titleMatch[1].trim();
    else {
      // Try to get title from "add [title]"
      const simpleTitle = message.match(/(?:add|create|new)\s+(?:a\s+)?(?:task\s+)?(?:for\s+)?(.+)/i);
      if (simpleTitle && !simpleTitle[1].match(/^(for|assign)/i)) {
        createData.title = simpleTitle[1].replace(/\s+for\s+.+$/i, '').trim();
      }
    }
    
    // Extract due date
    const dateMatch = message.match(/(?:due|deadline|by)\s+(?:on\s+)?(.+?)(?:\s+(?:and|for|assign|$))/i);
    if (dateMatch) {
      createData.dueDate = parseDateExpression(dateMatch[1]);
    } else if (lower.includes('tomorrow')) {
      createData.dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    } else if (lower.includes('next week')) {
      createData.dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    }
    
    // Extract priority
    for (const p of PRIORITY_VALUES) {
      if (lower.includes(p.toLowerCase())) {
        createData.priority = p as Task['priority'];
        break;
      }
    }
    
    // Extract category
    const categoryMatch = message.match(/(?:in|category|type)\s+(\w+)/i);
    if (categoryMatch) createData.category = categoryMatch[1];
    
    createData.status = 'Not Started';
    
    return {
      type: 'create',
      description: 'Create new task',
      createData
    };
  }

  // Batch update (e.g., "mark all blocked tasks as done")
  const batchMatch = lower.match(/(?:mark|change|set|update)\s+(?:all\s+)?(.+?)\s+(?:tasks?)?\s+(?:to|as|into)\s+(.+)/);
  if (batchMatch && (batchMatch[1].includes('all') || batchMatch[1].includes('every'))) {
    const filterCol = findColumn(batchMatch[1].replace('all', '').trim());
    const newValue = batchMatch[2].trim();
    
    if (filterCol) {
      const matchingTasks = tasks.filter(t => {
        const val = String(t[filterCol.key]).toLowerCase();
        return val.includes(newValue.toLowerCase()) || newValue.toLowerCase().includes(val);
      });
      
      // Find what column to update
      const updateCol = guessUpdateColumn(newValue, tasks);
      if (updateCol) {
        return {
          type: 'batch_update',
          description: `Update all ${filterCol.key} matching "${newValue}"`,
          batchUpdates: matchingTasks.map(t => ({
            taskId: t.id,
            field: updateCol.key as string,
            value: resolveValue(updateCol.key as string, newValue)
          }))
        };
      }
    }
  }

  // Update specific task
  const updateMatch = message.match(/(?:mark|update|change|set)\s+(?:task\s+)?#?(\d+)\s+(?:to|as|into)\s+(.+)/i);
  if (updateMatch) {
    const taskId = parseInt(updateMatch[1]);
    const newValue = updateMatch[2].trim();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      const updateCol = guessUpdateColumn(newValue, tasks);
      if (updateCol) {
        return {
          type: 'update',
          description: `Update task #${taskId} ${updateCol.key} to "${newValue}"`,
          taskId,
          column: updateCol.key as string,
          columnKey: updateCol.key as string,
          value: resolveValue(updateCol.key as string, newValue)
        };
      }
    }
    
    return {
      type: 'update',
      description: `Could not find task #${taskId}`,
      taskId
    };
  }

  // Delete task
  if (lower.includes('delete') || lower.includes('remove')) {
    const idMatch = message.match(/#?(\d+)/);
    if (idMatch) {
      return {
        type: 'delete',
        description: `Delete task #${idMatch[1]}`,
        taskId: parseInt(idMatch[1])
      };
    }
  }

  // Filter / Query commands
  // "show me all tasks assigned to Sarah"
  // "what tasks are blocked"
  // "find high priority tasks"
  // "tasks due this week"
  const filterPatterns = [
    { regex: /(?:show|find|list|get|display)\s+(?:me\s+)?(?:all\s+)?(?:tasks?\s+)?(?:that\s+)?(?:are\s+|with\s+)?(\w+(?:\s+\w+)?)\s*(?:tasks?)?$/i, type: 'status' },
    { regex: /(?:show|find|list|get|display)\s+(?:me\s+)?(?:all\s+)?(?:tasks?\s+)?(?:assigned\s+to|for|by|owned\s+by)\s+(.+)/i, type: 'assignee' },
    { regex: /(?:show|find|list|get|display)\s+(?:me\s+)?(?:all\s+)?(?:tasks?\s+)?(?:in|from|with)\s+(?:category\s+)?(.+)/i, type: 'category' },
    { regex: /(?:show|find|list|get|display)\s+(?:me\s+)?(?:all\s+)?(\w+)\s+priority\s+(?:tasks?)?/i, type: 'priority' },
    { regex: /(\w+)\s+(?:tasks?|ones)/i, type: 'status' },
    { regex: /who\s+(?:is|are)\s+(?:assigned|working)/i, type: 'assignee_query' },
    { regex: /what\s+(?:is|are)\s+(?:the\s+)?(\w+)\s+(?:of|for)\s+(?:task\s+)?#?(\d+)/i, type: 'lookup' },
  ];

  // Lookup: "what is the status of task 105"
  const lookupMatch = message.match(/what\s+(?:is|are)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:of|for)\s+(?:task\s+)?#?(\d+)/i);
  if (lookupMatch) {
    const col = findColumn(lookupMatch[1]);
    const taskId = parseInt(lookupMatch[2]);
    if (col) {
      return {
        type: 'query',
        description: `Look up ${col.key} for task #${taskId}`,
        column: col.key as string,
        columnKey: col.key as string,
        taskId
      };
    }
  }

  // Filter by status
  for (const status of STATUS_VALUES) {
    if (lower.includes(status.toLowerCase()) || lower.includes(status.toLowerCase().replace(' ', ''))) {
      return {
        type: 'filter',
        description: `Filter tasks with status "${status}"`,
        column: 'status',
        columnKey: 'status',
        filterValue: status,
        filterOperator: 'equals'
      };
    }
  }

  // Filter by priority
  for (const priority of PRIORITY_VALUES) {
    if (lower.includes(priority.toLowerCase())) {
      return {
        type: 'filter',
        description: `Filter tasks with priority "${priority}"`,
        column: 'priority',
        columnKey: 'priority',
        filterValue: priority,
        filterOperator: 'equals'
      };
    }
  }

  // Filter by assignee
  const assigneeFilter = message.match(/(?:for|by|assigned\s+to|owned\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (assigneeFilter && (lower.includes('show') || lower.includes('find') || lower.includes('task') || lower.includes('filter'))) {
    return {
      type: 'filter',
      description: `Filter tasks assigned to "${assigneeFilter[1]}"`,
      column: 'assignee',
      columnKey: 'assignee',
      filterValue: assigneeFilter[1],
      filterOperator: 'contains'
    };
  }

  // Filter by category
  const categoryFilter = message.match(/(?:in|category|type)\s+(\w+)/i);
  if (categoryFilter && (lower.includes('show') || lower.includes('find') || lower.includes('filter'))) {
    return {
      type: 'filter',
      description: `Filter tasks in category "${categoryFilter[1]}"`,
      column: 'category',
      columnKey: 'category',
      filterValue: categoryFilter[1],
      filterOperator: 'equals'
    };
  }

  // "who is working on..." or "who has..."
  if (lower.includes('who')) {
    return {
      type: 'query',
      description: 'Show assignee breakdown',
      column: 'assignee',
      columnKey: 'assignee'
    };
  }

  // "report" or "export"
  if (lower.includes('report') || lower.includes('export') || lower.includes('email') || lower.includes('send')) {
    return {
      type: 'summary',
      description: 'Generate report'
    };
  }

  // Default: try to understand what column/value they're asking about
  const colName = extractColumnName(lower);
  const col = findColumn(colName);
  if (col) {
    return {
      type: 'query',
      description: `Query ${col.key} column`,
      column: col.key as string,
      columnKey: col.key as string
    };
  }

  return {
    type: 'help',
    description: 'Could not understand command'
  };
}

function findColumn(name: string): { key: keyof Task; description: string } | null {
  const lower = name.toLowerCase().trim();
  
  for (const [_, def] of Object.entries(COLUMN_MAP)) {
    if (def.aliases.some(a => lower.includes(a) || a.includes(lower))) {
      return { key: def.key, description: def.description };
    }
  }
  return null;
}

function extractColumnName(text: string): string {
  // Try to find column references in text
  for (const [_, def] of Object.entries(COLUMN_MAP)) {
    for (const alias of def.aliases) {
      if (text.includes(alias)) return alias;
    }
  }
  return text;
}

function guessUpdateColumn(value: string, tasks: Task[]): { key: keyof Task } | null {
  const lower = value.toLowerCase();
  
  // Check if it's a status value
  if (STATUS_VALUES.some(s => lower.includes(s.toLowerCase()))) {
    return { key: 'status' };
  }
  
  // Check if it's a priority value
  if (PRIORITY_VALUES.some(p => lower.includes(p.toLowerCase()))) {
    return { key: 'priority' };
  }
  
  // Check if it matches a category
  const categories = [...new Set(tasks.map(t => t.category))];
  if (categories.some(c => lower.includes(c.toLowerCase()))) {
    return { key: 'category' };
  }
  
  // Check if it matches an assignee
  const assignees = [...new Set(tasks.map(t => t.assignee))];
  if (assignees.some(a => lower.includes(a.toLowerCase()))) {
    return { key: 'assignee' };
  }
  
  // Default to status if it looks like an action word
  if (lower.includes('done') || lower.includes('complete') || lower.includes('finish') || lower.includes('start') || lower.includes('progress') || lower.includes('block')) {
    return { key: 'status' };
  }
  
  return { key: 'status' };
}

function resolveValue(columnKey: string, rawValue: string): string {
  const lower = rawValue.toLowerCase();
  
  if (columnKey === 'status') {
    if (lower.includes('done') || lower.includes('complete') || lower.includes('finish')) return 'Done';
    if (lower.includes('progress') || lower.includes('working') || lower.includes('active')) return 'In Progress';
    if (lower.includes('not start') || lower.includes('pending') || lower.includes('todo') || lower.includes('to do')) return 'Not Started';
    if (lower.includes('block') || lower.includes('stuck') || lower.includes('wait')) return 'Blocked';
    // Try exact match
    const exact = STATUS_VALUES.find(s => s.toLowerCase() === lower);
    if (exact) return exact;
    return rawValue;
  }
  
  if (columnKey === 'priority') {
    if (lower.includes('critical') || lower.includes('urgent')) return 'Critical';
    if (lower.includes('high')) return 'High';
    if (lower.includes('medium') || lower.includes('normal')) return 'Medium';
    if (lower.includes('low')) return 'Low';
    return rawValue;
  }
  
  return rawValue;
}

function parseDateExpression(expr: string): string {
  const lower = expr.toLowerCase().trim();
  const now = new Date();
  
  if (lower.includes('today')) return now.toISOString().split('T')[0];
  if (lower.includes('tomorrow')) return new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  if (lower.includes('next week')) return new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
  if (lower.includes('next month')) return new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
  
  // Try to parse as date
  const parsed = new Date(expr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  // "in X days"
  const daysMatch = lower.match(/in\s+(\d+)\s+days?/);
  if (daysMatch) {
    return new Date(now.getTime() + parseInt(daysMatch[1]) * 86400000).toISOString().split('T')[0];
  }
  
  return expr;
}

/**
 * Execute an AI intent and return a response
 */
export function executeIntent(
  intent: AIIntent,
  tasks: Task[],
  actions: {
    updateCell: (rowIndex: number, colKey: string, value: string) => void;
    addRow: () => void;
    deleteRow: (rowIndex: number) => void;
    batchUpdate: (updates: { rowIndex: number; colKey: string; value: string }[]) => void;
  }
): string {
  switch (intent.type) {
    case 'help':
      return `🤖 **Here's what I can do with your spreadsheet:**

**📊 Query Data:**
• "Show me all blocked tasks"
• "What's the status of task #105?"
• "Who is assigned to the design tasks?"
• "Give me a summary"

**✏️ Update Cells:**
• "Mark task #105 as Done"
• "Change task #108 priority to High"
• "Assign task #103 to Lisa"

**➕ Create Tasks:**
• "Add a new task for Mike due tomorrow"
• "Create a high priority task in Backend"

**📋 Batch Operations:**
• "Mark all blocked tasks as In Progress"
• "Set all Low priority tasks to Done"

**📈 Analysis:**
• "How many tasks does Sarah have?"
• "What categories do we have?"
• "Sort by due date"

**📄 Reports:**
• "Generate a weekly report"
• "Export as PDF"

Just type naturally — I understand your columns: ID, Task, Assignee, Status, Priority, Due Date, Category, and Notes.`;

    case 'summary': {
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byAssignee: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      
      tasks.forEach(t => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
        byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      });
      
      let response = `📈 **Data Summary** (${tasks.length} total tasks)\n\n`;
      response += `**By Status:**\n`;
      Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        response += `• ${k}: ${v}\n`;
      });
      response += `\n**By Priority:**\n`;
      Object.entries(byPriority).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        response += `• ${k}: ${v}\n`;
      });
      response += `\n**By Assignee:**\n`;
      Object.entries(byAssignee).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        response += `• ${k}: ${v} tasks\n`;
      });
      response += `\n**By Category:**\n`;
      Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        response += `• ${k}: ${v}\n`;
      });
      return response;
    }

    case 'filter': {
      const filtered = tasks.filter(t => {
        const val = String(t[intent.columnKey as keyof Task]).toLowerCase();
        const filterVal = (intent.filterValue || '').toLowerCase();
        
        switch (intent.filterOperator) {
          case 'equals': return val === filterVal;
          case 'contains': return val.includes(filterVal);
          case 'starts_with': return val.startsWith(filterVal);
          case 'not_equals': return val !== filterVal;
          default: return val.includes(filterVal);
        }
      });
      
      if (filtered.length === 0) {
        return `No tasks found matching "${intent.filterValue}" in the ${intent.column} column.`;
      }
      
      let response = `🔍 Found **${filtered.length} task(s)** matching "${intent.filterValue}" in **${intent.column}**:\n\n`;
      filtered.slice(0, 8).forEach(t => {
        response += `• **#${t.id}** — ${t.title} (${t.status}, ${t.priority})\n`;
      });
      if (filtered.length > 8) {
        response += `\n...and ${filtered.length - 8} more`;
      }
      return response;
    }

    case 'update': {
      const taskIndex = tasks.findIndex(t => t.id === intent.taskId);
      if (taskIndex === -1) {
        return `❌ Task #${intent.taskId} not found. Check the ID column and try again.`;
      }
      
      const task = tasks[taskIndex];
      const oldValue = String(task[intent.columnKey as keyof Task]);
      
      actions.updateCell(taskIndex, intent.columnKey!, intent.value!);
      
      return `✅ Updated task **#${intent.taskId}** "${task.title}":\n• **${intent.column}**: ${oldValue} → **${intent.value}**\n\nThe grid has been updated in real-time.`;
    }

    case 'create': {
      actions.addRow();
      const newId = Math.max(...tasks.map(t => t.id)) + 1;
      
      // Apply the create data to the new row
      const newIndex = tasks.length;
      const updates: { rowIndex: number; colKey: string; value: string }[] = [];
      
      if (intent.createData) {
        Object.entries(intent.createData).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            updates.push({ rowIndex: newIndex, colKey: key, value: String(value) });
          }
        });
      }
      
      if (updates.length > 0) {
        actions.batchUpdate(updates);
      }
      
      let response = `✅ New task created as **#${newId}**`;
      if (intent.createData) {
        response += `:\n`;
        Object.entries(intent.createData).forEach(([key, value]) => {
          if (value) response += `• **${key}**: ${value}\n`;
        });
      }
      response += `\nYou can edit any cell by double-clicking on it in the grid.`;
      return response;
    }

    case 'batch_update': {
      if (!intent.batchUpdates || intent.batchUpdates.length === 0) {
        return `No matching tasks found for batch update.`;
      }
      
      const updates = intent.batchUpdates.map(u => {
        const rowIndex = tasks.findIndex(t => t.id === u.taskId);
        return { rowIndex, colKey: u.field, value: u.value };
      }).filter(u => u.rowIndex !== -1);
      
      actions.batchUpdate(updates);
      
      return `✅ Batch updated **${updates.length} task(s)**:\n${intent.batchUpdates.map(u => `• Task #${u.taskId}: ${u.field} → **${u.value}**`).join('\n')}`;
    }

    case 'query': {
      if (intent.taskId) {
        const task = tasks.find(t => t.id === intent.taskId);
        if (!task) return `❌ Task #${intent.taskId} not found.`;
        
        if (intent.columnKey) {
          const value = task[intent.columnKey as keyof Task];
          return `📋 Task **#${intent.taskId}** "${task.title}":\n• **${intent.column}**: ${value}`;
        }
        
        // Show all info
        return `📋 **Task #${task.id}**: ${task.title}\n• Assignee: ${task.assignee}\n• Status: ${task.status}\n• Priority: ${task.priority}\n• Due: ${task.dueDate}\n• Category: ${task.category}\n• Notes: ${task.notes || '(none)'}`;
      }
      
      // Column query
      if (intent.columnKey) {
        const values = tasks.map(t => String(t[intent.columnKey as keyof Task]));
        const unique = [...new Set(values)].filter(v => v);
        
        if (intent.columnKey === 'assignee') {
          const counts: Record<string, number> = {};
          tasks.forEach(t => { counts[t.assignee] = (counts[t.assignee] || 0) + 1; });
          let response = `👥 **Assignee Breakdown:**\n`;
          Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
            response += `• ${name}: ${count} tasks\n`;
          });
          return response;
        }
        
        return `📊 **${intent.column}** column has ${unique.length} unique values:\n${unique.map(v => `• ${v}`).join('\n')}`;
      }
      
      return `What would you like to know about the data?`;
    }

    case 'sort': {
      return `📊 Sorted by **${intent.column}** (${intent.sortDirection === 'asc' ? 'A → Z' : 'Z → A'}). The grid has been reordered.`;
    }

    case 'delete': {
      const taskIndex = tasks.findIndex(t => t.id === intent.taskId);
      if (taskIndex === -1) return `❌ Task #${intent.taskId} not found.`;
      
      const task = tasks[taskIndex];
      actions.deleteRow(taskIndex);
      return `🗑️ Deleted task **#${intent.taskId}** "${task.title}".`;
    }

    default:
      return `I'm not sure what you mean. Type "help" to see what I can do.`;
  }
}
