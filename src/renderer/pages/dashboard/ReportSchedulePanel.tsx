import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Toggle2, Calendar } from "lucide-react";
import { Button } from "../../components/ui/Button.js";
import "./reportSchedulePanel.css";

interface ReportTemplate {
  id: string;
  title: string;
  description?: string;
}

interface ReportSchedule {
  id: string;
  templateId: string;
  name: string;
  cronExpression: string;
  paramsJson: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  reportTemplatesList: () => Promise<ReportTemplate[]>;
  reportScheduleList: () => Promise<ReportSchedule[]>;
  reportScheduleCreate: (input: {
    templateId: string;
    name: string;
    cronExpression: string;
    paramsJson?: string;
  }) => Promise<ReportSchedule>;
  reportScheduleUpdate: (id: string, input: Partial<{ name: string; cronExpression: string }>) => Promise<ReportSchedule>;
  reportScheduleDelete: (id: string) => Promise<void>;
  reportScheduleToggle: (id: string, isActive: boolean) => Promise<ReportSchedule>;
};

export function ReportSchedulePanel() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    templateId: "",
    name: "",
    cronExpression: "0 */6 * * *",
  });

  const loadData = useCallback(async () => {
    try {
      const [tpl, sch] = await Promise.all([api.reportTemplatesList(), api.reportScheduleList()]);
      setTemplates(tpl);
      setSchedules(sch);
    } catch (err) {
      console.error("스케줄 데이터 로드 실패:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.templateId || !formData.name || !formData.cronExpression) return;

    setLoading(true);
    try {
      await api.reportScheduleCreate({
        templateId: formData.templateId,
        name: formData.name,
        cronExpression: formData.cronExpression,
      });
      setFormData({ templateId: "", name: "", cronExpression: "0 */6 * * *" });
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error("스케줄 생성 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (schedule: ReportSchedule) => {
    try {
      await api.reportScheduleToggle(schedule.id, !schedule.isActive);
      loadData();
    } catch (err) {
      console.error("스케줄 토글 실패:", err);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("스케줄을 삭제할까요?")) return;
    try {
      await api.reportScheduleDelete(scheduleId);
      loadData();
    } catch (err) {
      console.error("스케줄 삭제 실패:", err);
    }
  };

  const getTemplateTitle = (templateId: string) => {
    return templates.find((t) => t.id === templateId)?.title || "알 수 없음";
  };

  return (
    <div className="report-schedule-panel">
      <div className="report-schedule-header">
        <h3>리포트 스케줄</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          <Plus size={14} /> 새 스케줄
        </Button>
      </div>

      {showForm && (
        <form className="report-schedule-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>리포트 템플릿</label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              required
            >
              <option value="">선택해주세요</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>스케줄명</label>
            <input
              type="text"
              placeholder="예: 주간 운영 보고"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Cron 표현식</label>
            <input
              type="text"
              placeholder="예: 0 */6 * * * (6시간마다)"
              value={formData.cronExpression}
              onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
              required
            />
            <small className="form-help">Cron 형식: 분 시 일 월 요일</small>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "생성 중..." : "생성"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </form>
      )}

      <div className="report-schedule-list">
        {schedules.length === 0 ? (
          <p className="schedule-empty">등록된 스케줄이 없어요.</p>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`schedule-item ${schedule.isActive ? "active" : "inactive"}`}
            >
              <div className="schedule-info">
                <div className="schedule-title">{schedule.name}</div>
                <div className="schedule-template">{getTemplateTitle(schedule.templateId)}</div>
                <div className="schedule-cron">
                  <Calendar size={12} /> {schedule.cronExpression}
                </div>
                {schedule.lastRunAt && (
                  <div className="schedule-last-run">
                    마지막 실행: {new Date(schedule.lastRunAt).toLocaleString("ko-KR")}
                  </div>
                )}
              </div>

              <div className="schedule-actions">
                <button
                  className="schedule-btn schedule-toggle"
                  onClick={() => handleToggle(schedule)}
                  title={schedule.isActive ? "비활성화" : "활성화"}
                >
                  <Toggle2 size={16} />
                </button>
                <button
                  className="schedule-btn schedule-delete"
                  onClick={() => handleDelete(schedule.id)}
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
