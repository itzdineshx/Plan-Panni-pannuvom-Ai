# 🚀 Plan Panni Pannuvom

### AI-Powered Academic Project Ideation & Management Platform

> *From idea to execution — plan panni pannuvom.*

---

## 📌 Overview

**Plan Panni Pannuvom** is an **AI-powered academic project management platform** designed to help students seamlessly move from **project ideation** to **execution, documentation, and viva preparation**.

The system acts as an **AI project mentor**, combining **structured workflows**, **task management**, and **Gemini-powered intelligence** to reduce confusion, improve project clarity, and enhance academic outcomes.

This project is built as a **prototype-ready system** suitable for:

* Final-year academic projects
* Hackathons
* EdTech research & innovation

---

## 🎯 Problem Statement

Students often face:

* Difficulty in finding **relevant and feasible project ideas**
* Lack of **technical guidance** during implementation
* Poor **documentation structure**
* Stress during **reviews and viva**
* Inefficient team coordination and task tracking

**Plan Panni Pannuvom** solves this by offering **end-to-end AI-assisted project planning and execution support** in a single platform.

---

## ✨ Key Features

### 🤖 AI-Powered Project Ideation

* Generate **innovative academic project ideas** based on user profile
* Problem statements inspired by:

  * Academic research trends
  * Real-world challenges
* AI-generated:

  * **Abstract**
  * **PRD (Product Requirements Document)**
  * **System Design Document**
* Personalized **technical guidance** aligned with the selected project

---

### 📋 Advanced Task Management

* Full **CRUD operations** for tasks and subtasks
* **Drag-and-drop reordering** with smooth visual feedback
* **Deadline tracking** with intelligent reminders
* **Progress visualization** across tasks and milestones
* **AI-assisted priority scoring** based on:

  * Urgency
  * Dependencies
  * Complexity

---

### 🔔 Smart Notification System

* Overdue task alerts
* Upcoming deadline reminders:

  * 3 days before
  * 1 day before
  * Due today
* Critical path task notifications
* Browser-based notifications for important events

---

### 📊 Visual Dashboards

* Project progress overview
* Task completion statistics
* Milestone-wise progress tracking
* Interactive charts and progress bars
* Real-time updates using React state

---

### 👥 Collaboration & Preparation

* Team workspace for collaborative project execution
* AI-assisted **viva preparation**
* Structured **documentation editor**
* Clear task ownership and scheduling

---

## 🧠 AI Architecture

This project uses a **single-LLM, controlled AI architecture**:

* **Gemini AI** is used only for:

  * Idea generation
  * Technical guidance
  * Document drafting
  * Viva assistance
* All workflows, validations, and formats are enforced by **application logic**

### AI Flow

```
User Input
   ↓
Profile & Context Processing
   ↓
Rule-Based Validation
   ↓
Gemini AI (Generation Only)
   ↓
Structured Output Formatter
   ↓
User Review & Confirmation
```

This ensures:

* Academic reliability
* Structured outputs
* Human-in-the-loop control

---

## 🛠 Tech Stack

### Frontend

* **React 19**
* **TypeScript**
* **Vite**

### UI & Visualization

* **Tailwind CSS**
* **Lucide React Icons**
* **Recharts**

### Interaction & UX

* **@dnd-kit** (drag & drop)
* Animated dashboards and task flows

### AI Integration

* **Google Gemini API**

### State Management

* React Hooks

---

## 📂 Project Structure

```
src/
├── components/
│   ├── TaskManager.tsx        # Task CRUD & drag-and-drop
│   ├── ProjectDashboard.tsx   # Progress visualization & charts
│   ├── IdeationWizard.tsx     # AI-powered project ideation flow
│   └── ...
├── services/
│   ├── taskBreakdownService.ts # Task prioritization & scheduling
│   ├── notificationService.ts  # Alerts & reminders
│   └── geminiService.ts        # Gemini AI integration
├── types.ts                    # Shared TypeScript definitions
└── main.tsx
```

---

## ▶️ Run Locally

### Prerequisites

* **Node.js** (v18+ recommended)

---

### 1️⃣ Install Dependencies

```bash
npm install
```

---

### 2️⃣ Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

---

### 3️⃣ Start Development Server

```bash
npm run dev
```

The app will be available at:

```
http://localhost:5173
```

---

## 📈 Current Project Status

✅ Completed:

* AI ideation flow
* Task management system
* Dashboard visualization
* Gemini AI integration
* Structured document generation
* Notification logic

🚧 In Progress / Future Scope:

* Plagiarism & novelty detection
* Mentor recommendation system
* Multi-language support
* Open-source LLM integration
* Cloud deployment

---

## 🔮 Future Enhancements

* Retrieval-Augmented Generation (RAG) with IEEE papers
* Advanced team analytics
* Version control for documents
* Mobile-friendly UI
* Integration with academic evaluation systems

---

## 🧪 Academic & Ethical Considerations

* AI suggestions are **assistive**, not authoritative
* Human validation is mandatory
* No direct plagiarism generation
* Focus on learning and originality

---

## 🏆 Ideal Use Cases

* Final-year project planning
* Hackathon project management
* Academic mentoring platforms
* EdTech research prototypes

---

## 👨‍🎓 Project Philosophy

> **Plan Panni Pannuvom** believes that
> *good planning + guided execution = confident students.*

---
