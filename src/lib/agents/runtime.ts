// Điều phối một lần chạy Agent: tạo bản ghi AIActionLog (ai_runs), chọn chế độ (Claude hoặc mô phỏng),
// ghi lại mọi lần gọi công cụ, kết quả và lỗi.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { get, run } from "../db";
import { DomainError } from "../domain";
import { settingBool } from "../services/core";
import { invokeTool, TOOLS, toolsFor, type AgentName, type ToolCallLog, type ToolContext } from "./tools";
import { mockOpportunityAgent, mockQualificationAgent } from "./mock";
import { OPPORTUNITY_SYSTEM, QUALIFICATION_SYSTEM } from "./prompts";

export const CLAUDE_MODEL = "claude-opus-5-5";

export function agentMode(): "claude" | "mock" {
  if (process.env.SMS_AI_MODE === "mock") return "mock";
  return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "claude" : "mock";
}

export type RunResult = { runId: number; status: "SUCCEEDED" | "FAILED"; summary: string };

export async function runAgent(
  agent: AgentName,
  entity: { type: "lead" | "opportunity"; id: number },
  trigger: string,
  triggeredBy: number | null,
): Promise<RunResult> {
  const enabledKey = agent === "QUALIFICATION" ? "agent_qualification_enabled" : "agent_opportunity_enabled";
  if (!settingBool(enabledKey)) throw new DomainError("Agent đang bị Admin tắt");
  if (agent === "QUALIFICATION") {
    const l = get<{ status: string }>("SELECT status FROM leads WHERE id = ?", entity.id);
    if (!l || (l.status !== "OPEN" && l.status !== "WORKING")) throw new DomainError("Chỉ chạy Qualification Agent cho Lead đang mở");
  } else {
    const o = get<{ stage: string }>("SELECT stage FROM opportunities WHERE id = ?", entity.id);
    if (!o || o.stage === "WON" || o.stage === "LOST") throw new DomainError("Chỉ chạy Opportunity Agent cho Opportunity đang mở");
  }

  const mode = agentMode();
  const { id: runId } = run(
    "INSERT INTO ai_runs (agent, trigger, entity_type, entity_id, model, triggered_by) VALUES (?,?,?,?,?,?)",
    agent, trigger, entity.type, entity.id, mode === "claude" ? CLAUDE_MODEL : "mock-rules-v1", triggeredBy,
  );
  const ctx: ToolContext = { agent, runId, entityType: entity.type, entityId: entity.id };
  const log: ToolCallLog[] = [];

  try {
    const { summary, stopReason } =
      mode === "claude"
        ? await runWithClaude(ctx, trigger, log)
        : agent === "QUALIFICATION"
          ? { summary: mockQualificationAgent(ctx, log), stopReason: "end_turn" }
          : { summary: mockOpportunityAgent(ctx, log), stopReason: "end_turn" };
    run(
      "UPDATE ai_runs SET status='SUCCEEDED', tool_calls_json=?, summary=?, stop_reason=?, finished_at=datetime('now') WHERE id=?",
      JSON.stringify(log), summary, stopReason, runId,
    );
    return { runId, status: "SUCCEEDED", summary };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    run(
      "UPDATE ai_runs SET status='FAILED', tool_calls_json=?, error=?, finished_at=datetime('now') WHERE id=?",
      JSON.stringify(log), message, runId,
    );
    console.error(`[agent ${agent} run ${runId}]`, e);
    return { runId, status: "FAILED", summary: message };
  }
}

async function runWithClaude(ctx: ToolContext, trigger: string, log: ToolCallLog[]) {
  const client = new Anthropic();
  // Chỉ đăng ký các công cụ Agent này được phép dùng — công cụ khác không tồn tại với model.
  const tools = toolsFor(ctx.agent).map((name) => {
    const def = TOOLS[name];
    return betaZodTool({
      name,
      description: def.description,
      inputSchema: def.input,
      run: async (input) => {
        try {
          return JSON.stringify(invokeTool(ctx, name, input, log));
        } catch (e) {
          return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
        }
      },
    });
  });

  const final = await client.beta.messages.toolRunner({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    max_iterations: 15,
    output_config: { effort: "medium" },
    // Khi model từ chối vì bộ lọc an toàn, API tự chạy lại trên model dự phòng.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: ctx.agent === "QUALIFICATION" ? QUALIFICATION_SYSTEM : OPPORTUNITY_SYSTEM,
    tools,
    messages: [
      {
        role: "user",
        content: `Sự kiện kích hoạt: ${trigger}. Bản ghi: ${ctx.entityType} #${ctx.entityId}. Hãy thực hiện quy trình và kết thúc bằng một đoạn tóm tắt ngắn bằng tiếng Việt.`,
      },
    ],
  });

  if (final.stop_reason === "refusal") throw new Error("Model từ chối xử lý yêu cầu");
  const text = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  return { summary: text || "(không có tóm tắt)", stopReason: final.stop_reason ?? "unknown" };
}
