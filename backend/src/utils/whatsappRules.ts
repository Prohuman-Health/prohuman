import { query } from "../config/db";
import { whatsappAuth } from "./whatsappAuth";

export type SessionInfo = {
  patient_phone: string | null;
  patient_name: string;
  doctor_name: string;
  session_type_name: string;
  branch_name: string;
  scheduled_at?: string | Date;
};

type RecipientDef =
  | { type: "patient" }
  | { type: "custom"; phone: string; label?: string };

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function resolveRecipients(defs: RecipientDef[], patientPhone: string | null): string[] {
  const phones: string[] = [];
  for (const def of defs) {
    if (def.type === "patient") {
      if (patientPhone) phones.push(String(patientPhone));
    } else if (def.type === "custom" && def.phone) {
      phones.push(String(def.phone));
    }
  }
  return [...new Set(phones)];
}

/**
 * Fire all enabled whatsapp_notification_rules for a given trigger.
 * Errors are caught per-rule and logged; never throws.
 */
export async function fireWhatsappRules(
  trigger: string,
  info: SessionInfo
): Promise<void> {
  try {
    const rulesResult = await query(
      `SELECT r.id, r.name, r.recipients, t.body AS template_body
       FROM whatsapp_notification_rules r
       JOIN whatsapp_templates t ON t.id = r.template_id
       WHERE r.trigger = $1
         AND r.is_enabled = TRUE
         AND t.is_active = TRUE`,
      [trigger]
    );

    if (!rulesResult.rows.length) return;

    const templateVars: Record<string, string> = {
      patient_name: info.patient_name ?? "",
      doctor_name: info.doctor_name ?? "",
      session_type: info.session_type_name ?? "",
      branch_name: info.branch_name ?? "",
    };

    if (info.scheduled_at) {
      const dateObj = new Date(info.scheduled_at);
      templateVars.date = dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      templateVars.time = dateObj.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    for (const rule of rulesResult.rows) {
      try {
        const recipientDefs: RecipientDef[] = Array.isArray(rule.recipients)
          ? rule.recipients
          : JSON.parse(rule.recipients ?? "[]");

        const phones = resolveRecipients(recipientDefs, info.patient_phone);
        if (!phones.length) {
          console.warn("[whatsapp-rules] No recipients resolved", { rule_id: rule.id, rule_name: rule.name });
          continue;
        }

        const message = applyTemplate(rule.template_body, templateVars);

        for (const phone of phones) {
          try {
            await whatsappAuth.sendTextMessage(phone, message);
            console.info("[whatsapp-rules] Message sent", { rule_id: rule.id, phone, trigger });
          } catch (sendErr) {
            console.error("[whatsapp-rules] Send failed", {
              rule_id: rule.id,
              phone,
              trigger,
              error: sendErr instanceof Error ? sendErr.message : "unknown",
            });
          }
        }
      } catch (ruleErr) {
        console.error("[whatsapp-rules] Rule processing failed", {
          rule_id: rule.id,
          trigger,
          error: ruleErr instanceof Error ? ruleErr.message : "unknown",
        });
      }
    }
  } catch (err) {
    console.error("[whatsapp-rules] Failed to load rules", {
      trigger,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
