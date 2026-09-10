import { runRecurringBillingAutomation } from "@/services/financial";

export const dynamic = "force-dynamic";

function cronSecret() {
  return process.env.BILLING_CRON_SECRET || process.env.CRON_SECRET || null;
}

function unauthorized() {
  return Response.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
}

async function handleBillingAutomation(request: Request) {
  const secret = cronSecret();
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const result = await runRecurringBillingAutomation({ trigger: "CRON" });

  return Response.json({
    ok: true,
    totalTasks: result.totalTasks,
    generatedTasks: result.generatedTasks,
    skippedTasks: result.skippedTasks,
    failedTasks: result.failedTasks,
    competence: result.competence,
    items: result.items.map((item) => ({
      billingRuleId: item.billingRuleId,
      status: item.status,
      generatedCharges: item.generatedCharges,
      existingCharges: item.existingCharges,
      skippedStudents: item.skippedStudents,
      errorMessage: item.errorMessage
    }))
  });
}

export async function GET(request: Request) {
  return handleBillingAutomation(request);
}

export async function POST(request: Request) {
  return handleBillingAutomation(request);
}
