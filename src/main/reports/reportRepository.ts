import { randomUUID } from "node:crypto";

import type { LocalDatabase } from "../storage/sqlite.js";
import { nowIso } from "../storage/repositories/utils.js";
import type { ReportTemplate, TemplateSectionDef } from "./reportGenerator.js";

// ─── Types ───

export interface ReportTemplateInput {
  title: string;
  description?: string;
  sections: TemplateSectionDef[];
  outputFormat: "pdf" | "excel" | "html";
}

export interface ReportRun {
  id: string;
  templateId: string;
  status: "pending" | "running" | "completed" | "failed";
  resultJson?: string;
  outputPath?: string;
  startedAt?: string;
  completedAt?: string;
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  sectionsJson: string;
  outputFormat: string;
  createdAt: string;
  updatedAt: string;
}

interface RunRow {
  id: string;
  templateId: string;
  status: string;
  resultJson: string | null;
  outputPath: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function toTemplate(row: TemplateRow): ReportTemplate {
  let sections: TemplateSectionDef[] = [];
  try { sections = JSON.parse(row.sectionsJson) as TemplateSectionDef[]; } catch { /* empty */ }
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    sections,
    outputFormat: row.outputFormat as ReportTemplate["outputFormat"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRun(row: RunRow): ReportRun {
  return {
    id: row.id,
    templateId: row.templateId,
    status: row.status as ReportRun["status"],
    resultJson: row.resultJson ?? undefined,
    outputPath: row.outputPath ?? undefined,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
  };
}

// ─── Repository ───

export class ReportRepository {
  constructor(private readonly db: LocalDatabase) {}

  // ─── Templates ───

  listTemplates(): ReportTemplate[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, description, sections_json AS sectionsJson,
                output_format AS outputFormat, created_at AS createdAt,
                updated_at AS updatedAt
         FROM report_templates
         ORDER BY updated_at DESC`,
      )
      .all() as TemplateRow[];
    return rows.map(toTemplate);
  }

  getTemplate(id: string): ReportTemplate | null {
    const row = this.db
      .prepare(
        `SELECT id, title, description, sections_json AS sectionsJson,
                output_format AS outputFormat, created_at AS createdAt,
                updated_at AS updatedAt
         FROM report_templates WHERE id = ?`,
      )
      .get(id) as TemplateRow | undefined;
    return row ? toTemplate(row) : null;
  }

  createTemplate(input: ReportTemplateInput): ReportTemplate {
    const id = randomUUID();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO report_templates (id, title, description, sections_json, output_format, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.title, input.description ?? null, JSON.stringify(input.sections), input.outputFormat, now, now);
    return this.getTemplate(id)!;
  }

  updateTemplate(id: string, input: Partial<ReportTemplateInput>): ReportTemplate | null {
    const existing = this.getTemplate(id);
    if (!existing) return null;

    const now = nowIso();
    this.db
      .prepare(
        `UPDATE report_templates
         SET title = ?, description = ?, sections_json = ?, output_format = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.title ?? existing.title,
        input.description ?? existing.description ?? null,
        input.sections ? JSON.stringify(input.sections) : JSON.stringify(existing.sections),
        input.outputFormat ?? existing.outputFormat,
        now,
        id,
      );
    return this.getTemplate(id);
  }

  deleteTemplate(id: string): boolean {
    const result = this.db.prepare("DELETE FROM report_templates WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ─── Runs ───

  createRun(templateId: string): ReportRun {
    const id = randomUUID();
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO report_runs (id, template_id, status, started_at)
         VALUES (?, ?, 'running', ?)`,
      )
      .run(id, templateId, now);
    return { id, templateId, status: "running", startedAt: now };
  }

  completeRun(runId: string, resultJson: string, outputPath?: string): void {
    const now = nowIso();
    this.db
      .prepare(
        `UPDATE report_runs SET status = 'completed', result_json = ?, output_path = ?, completed_at = ?
         WHERE id = ?`,
      )
      .run(resultJson, outputPath ?? null, now, runId);
  }

  failRun(runId: string, error: string): void {
    const now = nowIso();
    this.db
      .prepare(
        `UPDATE report_runs SET status = 'failed', result_json = ?, completed_at = ?
         WHERE id = ?`,
      )
      .run(JSON.stringify({ error }), now, runId);
  }

  listRuns(templateId?: string, limit = 20): ReportRun[] {
    const where = templateId ? "WHERE template_id = ?" : "";
    const params = templateId ? [templateId, limit] : [limit];
    const rows = this.db
      .prepare(
        `SELECT id, template_id AS templateId, status, result_json AS resultJson,
                output_path AS outputPath, started_at AS startedAt, completed_at AS completedAt
         FROM report_runs ${where}
         ORDER BY started_at DESC LIMIT ?`,
      )
      .all(...params) as RunRow[];
    return rows.map(toRun);
  }
}
