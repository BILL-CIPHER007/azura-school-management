export type AsaasBillingType = "PIX" | "BOLETO";

export type AsaasCustomer = {
  id: string;
  name?: string;
  cpfCnpj?: string;
};

export type AsaasPayment = {
  id: string;
  status?: string;
  billingType?: AsaasBillingType | string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  value?: number;
  dueDate?: string;
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  eventId?: string;
  payment?: {
    id?: string;
    status?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    confirmedDate?: string;
    value?: number;
  };
  [key: string]: unknown;
};

export class AsaasClientError extends Error {
  constructor(
    public code: "config" | "environment" | "request" | "timeout",
    message: string
  ) {
    super(message);
    this.name = "AsaasClientError";
  }
}

const ASAAS_SANDBOX_BASE_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_PRODUCTION_BASE_URL = "https://api.asaas.com/v3";

function getSandboxConfig() {
  const environment = process.env.ASAAS_ENVIRONMENT;

  if (environment !== "sandbox") {
    if (!environment) {
      throw new AsaasClientError("config", "Configure ASAAS_ENVIRONMENT=sandbox para usar o Asaas Sandbox.");
    }
    throw new AsaasClientError("environment", "A integracao Asaas deste bloco esta liberada apenas em Sandbox.");
  }

  const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
  if (!apiKey) {
    throw new AsaasClientError("config", "Configure ASAAS_SANDBOX_API_KEY para gerar cobrancas no Sandbox.");
  }

  return {
    baseUrl: ASAAS_SANDBOX_BASE_URL,
    apiKey
  };
}

async function parseAsaasResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function summarizeAsaasError(payload: unknown) {
  if (payload && typeof payload === "object" && "errors" in payload) {
    const errors = (payload as { errors?: Array<{ description?: string; message?: string }> }).errors;
    const message = errors?.map((error) => error.description ?? error.message).filter(Boolean).join(" ");
    if (message) return message.slice(0, 240);
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string }).message;
    if (message) return message.slice(0, 240);
  }

  return "Nao foi possivel concluir a comunicacao com o Asaas Sandbox.";
}

export function isAsaasSandboxConfigured() {
  return process.env.ASAAS_ENVIRONMENT === "sandbox" && Boolean(process.env.ASAAS_SANDBOX_API_KEY);
}

export function getAsaasWebhookToken() {
  return process.env.ASAAS_WEBHOOK_TOKEN;
}

export async function asaasRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, apiKey } = getSandboxConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        access_token: apiKey,
        ...init.headers
      },
      cache: "no-store"
    });

    const payload = await parseAsaasResponse(response);

    if (!response.ok) {
      throw new AsaasClientError("request", summarizeAsaasError(payload));
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AsaasClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AsaasClientError("timeout", "Tempo esgotado ao comunicar com o Asaas Sandbox.");
    }
    throw new AsaasClientError("request", "Falha de comunicacao com o Asaas Sandbox.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function findAsaasCustomerByExternalReference(externalReference: string) {
  const params = new URLSearchParams({ externalReference, limit: "10", offset: "0" });
  const result = await asaasRequest<{ data?: AsaasCustomer[] }>(`/customers?${params.toString()}`, {
    method: "GET"
  });

  return result.data?.[0] ?? null;
}

export async function createAsaasCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
  externalReference: string;
}) {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj,
      email: input.email || undefined,
      mobilePhone: input.mobilePhone || undefined,
      externalReference: input.externalReference,
      notificationDisabled: true
    })
  });
}

export async function findAsaasPaymentByExternalReference(externalReference: string) {
  const params = new URLSearchParams({ externalReference, limit: "10", offset: "0" });
  const result = await asaasRequest<{ data?: AsaasPayment[] }>(`/payments?${params.toString()}`, {
    method: "GET"
  });

  return result.data?.[0] ?? null;
}

export async function createAsaasPayment(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string | null;
  externalReference: string;
}) {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description || undefined,
      externalReference: input.externalReference
    })
  });
}

export async function getAsaasPixQrCode(paymentId: string) {
  return asaasRequest<AsaasPixQrCode>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
    method: "GET"
  });
}

export const asaasOfficialUrls = {
  sandbox: ASAAS_SANDBOX_BASE_URL,
  production: ASAAS_PRODUCTION_BASE_URL
};
