# Plan Panni Pannuvom - AI-Powered Academic Project Management

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Features

### 🤖 AI-Powered Project Ideation
- Generate innovative academic project ideas based on your profile
- Get comprehensive project documentation (Abstract, PRD, Design Docs)
- Receive personalized tech guidance and learning resources

### 📋 Advanced Task Management
- **CRUD Operations**: Create, read, update, and delete tasks and subtasks
- **Drag-and-Drop Reordering**: Intuitive task reordering with visual feedback
- **Deadline Tracking**: Smart deadline monitoring with automated reminders
- **Progress Visualization**: Real-time progress tracking with interactive dashboards
- **Priority Scoring**: AI-powered task prioritization based on urgency, dependencies, and complexity

### 🔔 Smart Notifications
- Overdue task alerts
- Upcoming deadline reminders (3 days, 1 day, due today)
- Critical path task notifications
- Browser notifications for important alerts

### 📊 Visual Dashboards
- Project progress overview with pie charts and progress bars
- Task status distribution
- Milestone tracking with completion percentages
- Interactive charts powered by Recharts

### 👥 Collaboration Features
- Team space for project collaboration
- Viva preparation with AI-generated questions
- Documentation editor with rich formatting

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Lucide React icons
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **AI**: Google Gemini API
- **State Management**: React hooks

## Project Structure

```
src/
├── components/
│   ├── TaskManager.tsx      # Main task management interface
│   ├── ProjectDashboard.tsx # Project overview with progress charts
│   ├── IdeationWizard.tsx   # AI-powered project creation
│   └── ...
├── services/
│   ├── taskBreakdownService.ts # Task prioritization & scheduling
│   ├── notificationService.ts   # Alert management
│   └── geminiService.ts         # AI integration
└── types.ts                     # TypeScript type definitions
```

View your app in AI Studio: https://ai.studio/apps/drive/18E_ukMIE4p0H1ffCx-zqsqirfGtlGVkq
