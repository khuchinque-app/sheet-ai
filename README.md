# DataFlow AI - Smart Data Management Platform

A subscription-based, multi-tenant SaaS platform that replaces Google Sheets with an AI-powered data grid. Features a native editable spreadsheet interface with a built-in AI assistant that can read, write, and analyze data via natural language commands.

## 🚀 Features

### Spreadsheet Interface
- **Google Sheets-like UI** with column letters (A, B, C...), row numbers, and formula bar
- **Full keyboard navigation** (Arrow keys, Enter, Tab, Delete, F2)
- **Cell selection** with blue outline and fill handle
- **Multi-cell selection** with Shift+Click
- **Right-click context menu** (Cut, Copy, Paste, Delete, Sort, Insert Row)
- **Sorting** by clicking column headers
- **Filtering** with filter bar and per-column filters
- **Cell formatting** (Bold, Italic, Underline, Currency, Percent, Alignment)
- **Undo/Redo** with full history tracking
- **Zoom controls** (50% - 200%)
- **Formula support** (SUM, AVERAGE, COUNT, MIN, MAX, CONCATENATE)
- **Cell notes** and **cell protection**
- **Multiple sheet tabs**

### AI Assistant
- **Column-aware AI** that deeply understands your spreadsheet structure
- **Natural language commands** for data manipulation:
  - "Show me all blocked tasks"
  - "Mark task #105 as Done"
  - "Give me a summary"
  - "Who has the most tasks?"
  - "Add a task for Mike due tomorrow"
  - "Sort by priority"
- **Real-time updates** - AI changes are instantly reflected in the grid
- **Batch operations** - Update multiple tasks at once
- **Usage tracking** with action limits

### Additional Features
- **Authentication** - Email/password login (no Google OAuth)
- **Notifications** system
- **Report generation** (PDF, Excel, Image)
- **Right sidebar** with quick stats, activity feed, and notifications
- **Dark theme** optimized for productivity

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks + Custom hooks
- **AI Engine**: Custom NLP parser with intent recognition

## 📁 Project Structure

```
src/
├── components/
│   ├── Auth.tsx          # Login/Signup with email/password
│   ├── ChatBox.tsx       # AI assistant chat interface
│   ├── DataGrid.tsx      # Spreadsheet grid component
│   ├── Header.tsx        # Top navigation bar
│   ├── RightSidebar.tsx  # Stats, activity, notifications
│   └── Sidebar.tsx       # Left navigation menu
├── workspace/
│   ├── aiEngine.ts       # AI command parser & executor
│   ├── formatters.ts     # Cell value formatting
│   ├── formulas.ts       # Spreadsheet formula engine
│   ├── types.ts          # TypeScript type definitions
│   ├── useClipboard.ts   # Copy/paste functionality
│   └── useGridState.ts   # Grid state management with undo/redo
├── types.ts              # Global type definitions
├── data.ts               # Initial data & constants
├── App.tsx               # Main application component
└── main.tsx              # Application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/khuchinque-app/sheet-ai.git
cd sheet-ai

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 💡 Usage

### Spreadsheet Operations
- **Select cells**: Click or Shift+Click for range selection
- **Edit cells**: Double-click or press Enter/F2
- **Navigate**: Arrow keys, Tab, Enter
- **Format**: Use toolbar buttons or Ctrl+B/I/U
- **Sort**: Click column headers
- **Filter**: Toggle filter bar or use column filter dropdowns
- **Undo/Redo**: Ctrl+Z / Ctrl+Y
- **Copy/Paste**: Ctrl+C / Ctrl+V

### AI Commands
Type natural language in the chat box:
- **Query**: "Show blocked tasks", "What's the status of #105?"
- **Update**: "Mark task #105 as Done", "Change priority to High"
- **Create**: "Add a task for Mike due tomorrow"
- **Analyze**: "Give me a summary", "Who has the most tasks?"
- **Sort**: "Sort by due date"

## 🔒 Authentication

The app uses native email/password authentication (no Google OAuth). For demo purposes, you can click "Sign In" without entering credentials.

## 📊 AI Action Limits

- **Free tier**: 50 AI actions per month
- Actions are tracked and displayed in the chat interface
- Upgrade to Pro for more actions

## 🎨 Customization

### Adding New Columns
Edit `src/components/DataGrid.tsx`:
```typescript
const COLUMN_DEFS = [
  { key: 'id', label: 'ID', width: 60, type: 'number' },
  { key: 'title', label: 'Task', width: 220, type: 'text' },
  // Add your columns here
];
```

### Extending AI Commands
Edit `src/workspace/aiEngine.ts` to add new intent patterns and handlers.

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Known Issues

- Formula engine supports basic operations (SUM, AVERAGE, COUNT, etc.)
- Real-time collaboration not yet implemented
- Mobile responsiveness needs improvement

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
