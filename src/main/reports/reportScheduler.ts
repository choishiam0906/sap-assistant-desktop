import { randomUUID } from "node:crypto";
import cron, { type ScheduledTask as CronJob } from "node-cron";
import type { BrowserWindow } from "electron";

import type { LocalDatabase } from "../storage/sqlite.js";
import { nowIso } from "../storage/repositories/utils.js";
import type { ReportGenerator } from "./reportGenerator.js";
import type { ReportRepository } from "./reportRepository.js";
import { logger } from "../logger.js";
import type { ProviderType } from "../contracts.js";

// ─── Types ───

export interface ReportScheduleInput {
  templateId: string;
  name: string;
  cronExpression: string;
  paramsJson?: string;
}

export interface ReportSchedule {
  id: string;
  templateId: string;
  name: string;
  cronExpression: string;
  paramsJson: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface ScheduleRow {
  id: string;
  template_id: string;
  name: string;
  cron_expression: string;
  params_json: string | null;
  is_active: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

function toSchedule(row: ScheduleRow): ReportSchedule {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    cronExpression: row.cron_expression,
    paramsJson: row.params_json,
    isActive: row.is_active === 1,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
  };
}

// ─── Scheduler ───

export class ReportScheduler {
  private readonly jobs = new Map<string, CronJob>();

  constructor(
    private readonly db: LocalDatabase,
    private readonly reportGenerator: ReportGenerator,
    private readonly reportRepo: ReportRepository,
    private readonly getMainWindow: () => BrowserWindow | null,
  ) {}

  /** 앱 시작 시: DB에서 활성 스케줄 로드 → cron 등록 */
  startAll(): void {
    const schedules = this.listSchedules().filter((s) => s.isActive);
    for (const schedule of schedules) {
      this.schedule(schedule);
    }
    logger.info({ count: schedules.length }, "리포트 스케줄 자동 실행 초기화");
  }

  /** 개별 스케줄 등록 */
  private schedule(schedule: ReportSchedule): void {
    // 기존 job이 있으면 제거
    this.unschedule(schedule.id);

    if (!cron.validate(schedule.cronExpression)) {
      logger.warn({ scheduleId: schedule.id, cron: schedule.cronExpression }, "잘못된 cron 표현식");
      return;
    }

    const job = cron.schedule(schedule.cronExpression, () => {
      void this.executeAndNotify(schedule);
    });

    this.jobs.set(schedule.id, job);
  }

  /** 개별 스케줄 해제 */
  private unschedule(scheduleId: string): void {
    const existing = this.jobs.get(scheduleId);
    if (existing) {
      existing.stop();
      this.jobs.delete(scheduleId);
    }
  }

  /** 스케줄 생성 */
  createSchedule(input: ReportScheduleInput): ReportSchedule {
    const id = randomUUID();
    const now = nowIso();

    this.db
      .prepare(
        `INSERT INTO report_schedules (id, template_id, name, cron_expression, params_json, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
      .run(id, input.templateId, input.name, input.cronExpression, input.paramsJson ?? null, now);

    const schedule = this.getSchedule(id);
    if (schedule && schedule.isActive) {
      this.schedule(schedule);
    }

    return schedule!;
  }

  /** 스케줄 조회 */
  getSchedule(id: string): ReportSchedule | null {
    const row = this.db
      .prepare(
        `SELECT id, template_id, name, cron_expression, params_json, is_active, last_run_at, next_run_at, created_at
         FROM report_schedules WHERE id = ?`,
      )
      .get(id) as ScheduleRow | undefined;
    return row ? toSchedule(row) : null;
  }

  /** 스케줄 업데이트 */
  updateSchedule(id: string, input: Partial<ReportScheduleInput>): ReportSchedule | null {
    const existing = this.getSchedule(id);
    if (!existing) return null;

    this.db
      .prepare(
        `UPDATE report_schedules
         SET name = ?, cron_expression = ?, params_json = ?
         WHERE id = ?`,
      )
      .run(
        input.name ?? existing.name,
        input.cronExpression ?? existing.cronExpression,
        input.paramsJson ?? existing.paramsJson,
        id,
      );

    const updated = this.getSchedule(id);
    if (updated && updated.isActive) {
      this.schedule(updated);
    }

    return updated;
  }

  /** 스케줄 삭제 */
  deleteSchedule(id: string): boolean {
    this.unschedule(id);
    const result = this.db.prepare("DELETE FROM report_schedules WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /** 모든 스케줄 조회 */
  listSchedules(): ReportSchedule[] {
    const rows = this.db
      .prepare(
        `SELECT id, template_id, name, cron_expression, params_json, is_active, last_run_at, next_run_at, created_at
         FROM report_schedules
         ORDER BY created_at DESC`,
      )
      .all() as ScheduleRow[];
    return rows.map(toSchedule);
  }

  /** 스케줄 활성/비활성 토글 */
  toggleSchedule(id: string, isActive: boolean): ReportSchedule | null {
    this.db.prepare("UPDATE report_schedules SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);

    const updated = this.getSchedule(id);
    if (updated) {
      if (isActive) {
        this.schedule(updated);
      } else {
        this.unschedule(id);
      }
    }

    return updated;
  }

  /** 수동 즉시 실행 */
  async executeNow(scheduleId: string): Promise<void> {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error(`스케줄 ${scheduleId}를 찾을 수 없어요.`);
    }
    await this.executeAndNotify(schedule);
  }

  /** 실행 결과를 IPC로 Renderer에 전송 + DB 업데이트 */
  private async executeAndNotify(schedule: ReportSchedule): Promise<void> {
    const startedAt = nowIso();
    let status: "success" | "failed" = "success";
    let errorMessage: string | undefined;

    try {
      const template = this.reportRepo.getTemplate(schedule.templateId);
      if (!template) {
        throw new Error("템플릿을 찾을 수 없어요");
      }

      // 파라미터 파싱
      let params: { provider: ProviderType; model: string; query?: string } = {
        provider: "openai",
        model: "gpt-4o",
      };

      if (schedule.paramsJson) {
        try {
          params = JSON.parse(schedule.paramsJson);
        } catch {
          logger.warn({ scheduleId: schedule.id }, "스케줄 파라미터 파싱 실패");
        }
      }

      // 리포트 생성
      await this.reportGenerator.generate(template, params, undefined, undefined);

      // 실행 타임스탬프 업데이트
      this.db
        .prepare("UPDATE report_schedules SET last_run_at = ? WHERE id = ?")
        .run(startedAt, schedule.id);
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ scheduleId: schedule.id, error: errorMessage }, "리포트 스케줄 실행 실패");
    }

    // Renderer에 알림
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("reports:schedule:executed", {
        scheduleId: schedule.id,
        status,
        executedAt: startedAt,
        errorMessage,
      });
    }
  }

  /** 앱 종료 시 모든 cron job 정리 */
  stopAll(): void {
    for (const [, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    logger.info("리포트 스케줄 자동 실행 종료");
  }
}
