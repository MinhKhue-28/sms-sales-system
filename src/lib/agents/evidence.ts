import { get, run } from "../db";
import type { ToolContext } from "./tools";
import type { Ref } from "./schemas";

export class InvalidEvidenceError extends Error {}

/**
 * Kiểm tra tính hợp lệ của danh sách căn cứ (evidence/sources) ở phía SERVER (BUG-006, BUG-007).
 * Mỗi ref bắt buộc phải trỏ đến:
 * - Trường dữ liệu có thật và có giá trị của hồ sơ hiện tại (`lead.<cột>` hoặc `opportunity.<cột>`)
 * - Bản ghi tương tác thuộc hồ sơ hiện tại (`activity:<id>`)
 * - Hoặc nguồn thông tin web đã trích dẫn (`web:*`, `http://*`, `https://*`, `mock://*`)
 */
export function validateEvidence(
  ctx: ToolContext,
  refs: Ref[],
  options: { min?: number; required?: boolean } = {},
): Ref[] {
  const minRequired = options.min ?? (options.required ? 1 : 0);

  if (minRequired > 0 && (!refs || refs.length < minRequired)) {
    throw new InvalidEvidenceError(
      `Bắt buộc có ít nhất ${minRequired} căn cứ hợp lệ (hiện có: ${refs ? refs.length : 0})`,
    );
  }

  if (!refs || refs.length === 0) return [];

  // Đọc dữ liệu hồ sơ để đối chiếu
  const lead = ctx.entityType === "lead"
    ? get<Record<string, unknown>>("SELECT * FROM leads WHERE id = ?", ctx.entityId)
    : null;
  const opp = ctx.entityType === "opportunity"
    ? get<Record<string, unknown>>("SELECT * FROM opportunities WHERE id = ?", ctx.entityId)
    : null;

  for (const item of refs) {
    const ref = item.ref.trim();
    if (!ref) {
      throw new InvalidEvidenceError("Ref căn cứ không được để trống");
    }

    // 1. Trường Lead: lead.<field>
    if (ref.startsWith("lead.")) {
      if (ctx.entityType !== "lead" || !lead) {
        throw new InvalidEvidenceError(`Không thể dùng căn cứ ${ref} khi đang xử lý ${ctx.entityType}`);
      }
      const field = ref.slice(5);
      const val = lead[field];
      if (val === undefined || val === null || val === "") {
        throw new InvalidEvidenceError(`Trường ${field} của Lead #${ctx.entityId} không tồn tại hoặc không có dữ liệu`);
      }
      continue;
    }

    // 2. Trường Opportunity: opportunity.<field>
    if (ref.startsWith("opportunity.")) {
      if (ctx.entityType !== "opportunity" || !opp) {
        throw new InvalidEvidenceError(`Không thể dùng căn cứ ${ref} khi đang xử lý ${ctx.entityType}`);
      }
      const field = ref.slice(12);
      const val = opp[field];
      if (val === undefined || val === null || val === "") {
        throw new InvalidEvidenceError(`Trường ${field} của Opportunity #${ctx.entityId} không tồn tại hoặc không có dữ liệu`);
      }
      continue;
    }

    // 3. Bản ghi tương tác: activity:<id>
    if (ref.startsWith("activity:")) {
      const actIdStr = ref.slice(9);
      const actId = parseInt(actIdStr, 10);
      if (isNaN(actId)) {
        throw new InvalidEvidenceError(`Mã activity không hợp lệ: ${ref}`);
      }
      const act = get<{ id: number }>(
        "SELECT id FROM activities WHERE id = ? AND entity_type = ? AND entity_id = ?",
        actId, ctx.entityType, ctx.entityId,
      );
      if (!act) {
        throw new InvalidEvidenceError(
          `Hoạt động ${ref} không tồn tại hoặc không thuộc ${ctx.entityType} #${ctx.entityId}`,
        );
      }
      continue;
    }

    // 4. Nguồn Web / Mock / External URL / web_research
    if (
      ref.startsWith("http://") ||
      ref.startsWith("https://") ||
      ref.startsWith("mock://") ||
      ref.startsWith("web:") ||
      ref === "web_research" ||
      ref.includes("web_research")
    ) {
      continue;
    }

    // Nếu không khớp định dạng nào cho phép
    throw new InvalidEvidenceError(`Căn cứ không hợp lệ hoặc không xác thực được: ${ref}`);
  }

  return refs;
}

/**
 * Ghi nhận căn cứ vào bảng ai_evidence sau khi đề xuất hoặc bản nghiên cứu được tạo
 */
export function recordAiEvidence(params: {
  runId?: number | null;
  suggestionId?: number | null;
  researchId?: number | null;
  refs: Ref[];
}) {
  if (!params.refs || params.refs.length === 0) return;

  const validRunId = params.runId && get<{ id: number }>("SELECT id FROM ai_runs WHERE id = ?", params.runId)
    ? params.runId
    : null;

  for (const r of params.refs) {
    let sourceType = "OTHER";
    if (r.ref.startsWith("lead.") || r.ref.startsWith("opportunity.")) sourceType = "ENTITY_FIELD";
    else if (r.ref.startsWith("activity:")) sourceType = "ACTIVITY";
    else if (r.ref.startsWith("http") || r.ref.startsWith("mock://") || r.ref.includes("web")) sourceType = "WEB";

    run(
      `INSERT INTO ai_evidence (run_id, suggestion_id, research_id, source_type, ref, quote, verified)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      validRunId,
      params.suggestionId ?? null,
      params.researchId ?? null,
      sourceType,
      r.ref,
      r.quote || r.detail || null,
    );
  }
}
