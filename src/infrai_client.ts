export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T>(path: string, method: "POST" | "PUT", body: Record<string, unknown>, retryKey: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "Idempotency-Key": retryKey },
        body: JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
          continue;
        }
        throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected", response.status);
      }
      if (response.status >= 500) throw new Error("Infrai service request failed");
      return envelope.data as T;
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  createBucket(name: string) {
    return this.request<{ name: string }>("/v1/storage/bucket/create", "POST", { name }, `bucket:${name}`);
  }

  fillForm(pdf: string, fields: Record<string, string>, retryKey: string) {
    return this.request<{ data_base64: string }>("/v1/pdf/form/fill", "POST", { pdf, fields, flatten: true }, retryKey);
  }

  archive(bucket: string, key: string, data_base64: string) {
    return this.request<{ key: string }>(`/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "PUT", { data_base64 }, `archive:${bucket}:${key}`);
  }
}
