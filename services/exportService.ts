import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Project, Task } from '../types';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTextBlock(text: string | undefined): string {
  return (text || '').toString().trim();
}

export function exportProjectDocumentationPDF(
  project: Project,
  section: 'abstract' | 'prd' | 'dd' | 'all' = 'all'
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const marginY = 56;
  const lineHeight = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;

  const addPageIfNeeded = (cursorY: number) => {
    if (cursorY >= pageHeight - marginY) {
      doc.addPage();
      return marginY;
    }
    return cursorY;
  };

  const addSection = (title: string, body: string, cursorY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, marginX, cursorY);
    cursorY += lineHeight + 8;

    const bodyLines = body.split('\n');
    for (const rawLine of bodyLines) {
      const trimmed = rawLine.trim();

      if (trimmed === '') {
        cursorY += 6;
        continue;
      }

      // Section labels (BACKGROUND:, PROBLEM STATEMENT:, etc.) or numbered headings
      if (/^[A-Z][A-Z &/]+:/.test(trimmed) || /^\d+\.(\d+)?\s+/.test(trimmed)) {
        cursorY = addPageIfNeeded(cursorY + 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        for (const wl of wrapped) {
          cursorY = addPageIfNeeded(cursorY);
          doc.text(wl, marginX, cursorY);
          cursorY += lineHeight;
        }
        continue;
      }

      // Bullet / FR / Step lines
      const isBullet = trimmed.startsWith('- ');
      const indent = isBullet ? marginX + 14 : marginX;
      const availableWidth = isBullet ? maxWidth - 14 : maxWidth;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const text = isBullet ? trimmed.slice(2) : trimmed;
      const wrapped = doc.splitTextToSize(text, availableWidth);

      if (isBullet) {
        cursorY = addPageIfNeeded(cursorY);
        doc.text('•', marginX + 4, cursorY);
      }

      for (const wl of wrapped) {
        cursorY = addPageIfNeeded(cursorY);
        doc.text(wl, indent, cursorY);
        cursorY += lineHeight;
      }
    }

    return cursorY + 10;
  };

  let y = marginY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(project.title, marginX, y);
  y += 28;

  const sections = [
    { key: 'abstract', title: 'Academic Abstract', body: formatTextBlock(project.abstract) },
    { key: 'prd', title: 'Product Requirements Document', body: formatTextBlock(project.prd) },
    { key: 'dd', title: 'System Design Document', body: formatTextBlock(project.designDoc) },
  ] as const;

  sections
    .filter(s => section === 'all' || s.key === section)
    .forEach((s, idx) => {
      if (idx > 0) {
        y = addPageIfNeeded(y + 6);
      }
      y = addSection(s.title, s.body, y);
    });

  doc.save(`${project.title.replace(/\s+/g, '_')}_documentation.pdf`);
}

function taskToRow(task: Task): Record<string, string | number> {
  return {
    Title: task.title,
    Status: task.status,
    Assignee: task.assignedTo,
    Priority: task.priority,
    Deadline: task.deadline || 'No Deadline',
    EstimatedHours: task.estimatedHours,
    ActualHours: task.actualHours ?? '',
    Tags: task.tags.join(', '),
    MilestoneId: task.milestoneId || '',
  };
}

export function exportTasksToCsv(project: Project): void {
  const rows = (project.tasks || []).map(taskToRow);
  if (rows.length === 0) {
    downloadBlob(new Blob(['No tasks available.'], { type: 'text/plain' }), 'tasks-empty.txt');
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => {
    const str = value?.toString() ?? '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [headers.join(',')]
    .concat(rows.map(row => headers.map(h => escapeCell(row[h] ?? '')).join(',')))
    .join('\n');

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${project.title.replace(/\s+/g, '_')}_tasks.csv`);
}

export function exportTasksToXlsx(project: Project): void {
  const rows = (project.tasks || []).map(taskToRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  XLSX.writeFile(workbook, `${project.title.replace(/\s+/g, '_')}_tasks.xlsx`);
}

export function buildProjectSummary(project: Project): string {
  const taskCount = project.tasks?.length || 0;
  const doneCount = project.tasks?.filter(t => t.status === 'done').length || 0;
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return [
    `Project: ${project.title}`,
    `Status: ${project.status}`,
    `Progress: ${progress}% (${doneCount}/${taskCount} tasks complete)`,
    '',
    'Problem Statement:',
    project.problemStatement || 'N/A',
    '',
    'Solution Idea:',
    project.solutionIdea || 'N/A',
    '',
    'Key Tech Stack:',
    project.techStack?.map(t => `- ${t.name} (${t.role})`).join('\n') || 'N/A',
    '',
    'Upcoming Milestones:',
    project.roadmap?.slice(0, 3).map(m => `- ${m.title} (${m.duration})`).join('\n') || 'N/A',
  ].join('\n');
}

export function shareProjectSummary(project: Project): Promise<void> {
  const summary = buildProjectSummary(project);
  if (navigator.share) {
    return navigator.share({
      title: `Project Summary - ${project.title}`,
      text: summary,
    });
  }
  return navigator.clipboard.writeText(summary);
}

export function downloadProjectSummaryReport(project: Project): void {
  const summary = buildProjectSummary(project);
  const filename = `${project.title.replace(/\s+/g, '_')}_summary.txt`;
  downloadBlob(new Blob([summary], { type: 'text/plain' }), filename);
}
