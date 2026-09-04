import type { AsaasWebhookPayload } from "@/lib/asaas-client";
import { getAsaasWebhookToken } from "@/lib/asaas-client";
import { processAsaasWebhook } from "@/services/financial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredToken = getAsaasWebhookToken();
  if (!configuredToken) {
    return Response.json({ ok: false, error: "Webhook Asaas nao configurado." }, { status: 503 });
  }

  const receivedToken = request.headers.get("asaas-access-token");
  if (!receivedToken || receivedToken !== configuredToken) {
    return Response.json({ ok: false, error: "Token invalido." }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await request.json()) as AsaasWebhookPayload;
  } catch {
    return Response.json({ ok: false, error: "Payload invalido." }, { status: 400 });
  }

  const result = await processAsaasWebhook(payload);
  return Response.json({ ok: true, status: result.status });
}
