# Faz 1: Çekirdek Motor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ödemesiz ama çalışan prototip: kullanıcı derdini anlatır, AI doğru belge tipini belirler, eksik bilgileri toplar, belge üretir ve bulanık önizleme gösterir.

**Architecture:** Next.js (App Router, TypeScript) monolit. AI motoru 4 adımlı prompt zinciri (sınıflandır → bilgi topla → üret → öz-kontrol). Saf LLM üretimi (Yaklaşım A), promptlar versiyonlu `src/lib/ai/prompts/` altında. Postgres + Prisma. Tüm geliştirme/test Docker'da.

**Tech Stack:** Next.js 15, TypeScript, Prisma + Postgres, Anthropic SDK (`@anthropic-ai/sdk`), Vitest, Zod (AI JSON doğrulama), Docker Compose.

## Global Constraints

- Tüm geliştirme ve testler Docker üzerinden: `docker compose -f docker-compose.dev.yml ...`
- Model dağılımı: sınıflandırma + öz-kontrol → `claude-haiku-4-5-20251001`; belge üretimi → `claude-opus-4-8`
- Tam belge metni, ödeme kontrolü olmadan API'den dönmez (Faz 1'de ödeme yok; kilit altyapısı `Document.durum` ile kurulur, önizleme her zaman blur'lu döner)
- Promptlar koda gömülmez; `src/lib/ai/prompts/*.ts` dosyalarında tutulur
- AI'dan dönen JSON her zaman Zod ile doğrulanır; doğrulama başarısızsa hata fırlatılır
- API anahtarları sadece `.env` (repoda asla); `.env.example` güncel tutulur
- Dil: tüm kullanıcıya görünen metinler ve üretilen belgeler Türkçe

---

### Task 1: Docker + Next.js + Postgres dev iskeleti

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `Dockerfile`, `docker-compose.dev.yml`, `.env.example`, `.dockerignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/app/api/health/route.ts`
- Test: `src/app/api/health/route.test.ts`

**Interfaces:**
- Produces: `GET /api/health` → `{ status: "ok" }` (200). Dev ortamının ayakta olduğunu doğrulayan smoke test ucu.

- [ ] **Step 1: package.json oluştur**

```json
{
  "name": "ai-hukuki-asistan",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "@prisma/client": "^6.2.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "prisma": "^6.2.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json, next.config.ts, .dockerignore oluştur**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
```

`.dockerignore`:
```
node_modules
.next
.env
.git
```

- [ ] **Step 3: Dockerfile (multi-stage, dev hedefi) oluştur**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 4: docker-compose.dev.yml + .env.example oluştur**

`docker-compose.dev.yml`:
```yaml
services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    env_file:
      - .env
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: hukuki
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.env.example`:
```
DATABASE_URL="postgresql://app:app@db:5432/hukuki"
ANTHROPIC_API_KEY="sk-ant-..."
```

- [ ] **Step 5: layout, page, health route ve testi yaz (failing test)**

`src/app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main>AI Hukuki Asistan</main>;
}
```

`src/app/api/health/route.ts`:
```typescript
import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ status: "ok" });
}
```

`src/app/api/health/route.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = GET();
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 6: Bağımlılıkları kur ve testi çalıştır**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm install`
Sonra: `docker compose -f docker-compose.dev.yml run --rm app npm test`
Expected: `health` testi PASS.

- [ ] **Step 7: Dev sunucuyu doğrula**

Run: `docker compose -f docker-compose.dev.yml up -d`
Tarayıcıda `http://localhost:3000` → "AI Hukuki Asistan" görünür. `http://localhost:3000/api/health` → `{"status":"ok"}`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(faz1): docker + next.js + postgres dev iskeleti"
```

---

### Task 2: Prisma şeması + migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Produces: `prisma` (PrismaClient singleton, `src/lib/db.ts` default export). Modeller: `User`, `Case`, `Message`, `Document`. `Document.durum` enum: `taslak | odendi`. `Message.rol` enum: `user | assistant`.

- [ ] **Step 1: schema.prisma yaz**

```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum DocumentDurum {
  taslak
  odendi
}
enum MesajRol {
  user
  assistant
}

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  ad        String?
  createdAt DateTime   @default(now())
  cases     Case[]
}

model Case {
  id        String     @id @default(cuid())
  userId    String?
  user      User?      @relation(fields: [userId], references: [id])
  baslik    String
  kategori  String?
  durum     String     @default("acik")
  createdAt DateTime   @default(now())
  messages  Message[]
  documents Document[]
}

model Message {
  id        String   @id @default(cuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id])
  rol       MesajRol
  icerik    String
  createdAt DateTime @default(now())
}

model Document {
  id        String        @id @default(cuid())
  caseId    String
  case      Case          @relation(fields: [caseId], references: [id])
  tip       String
  merci     String?
  icerik    String
  durum     DocumentDurum @default(taslak)
  createdAt DateTime      @default(now())
}
```

- [ ] **Step 2: db.ts singleton yaz**

```typescript
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

- [ ] **Step 3: migration çalıştır**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name init`
Expected: `prisma/migrations/` altında migration oluşur, DB'ye uygulanır.

- [ ] **Step 4: db testi yaz ve çalıştır**

`src/lib/db.test.ts`:
```typescript
import { describe, it, expect, afterAll } from "vitest";
import prisma from "./db";

describe("db", () => {
  afterAll(async () => { await prisma.$disconnect(); });
  it("creates and reads a Case", async () => {
    const c = await prisma.case.create({ data: { baslik: "test vaka" } });
    const found = await prisma.case.findUnique({ where: { id: c.id } });
    expect(found?.baslik).toBe("test vaka");
    await prisma.case.delete({ where: { id: c.id } });
  });
});
```

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(faz1): prisma şeması + migration (User/Case/Message/Document)"
```

---

### Task 3: Claude API istemci sarmalayıcısı

**Files:**
- Create: `src/lib/ai/client.ts`
- Test: `src/lib/ai/client.test.ts`

**Interfaces:**
- Produces:
  - `callClaude(opts: { model: string; system: string; user: string; maxTokens?: number }): Promise<string>` — düz metin döner.
  - `MODELS = { fast: "claude-haiku-4-5-20251001", quality: "claude-opus-4-8" }`

- [ ] **Step 1: client.ts yaz**

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  quality: "claude-opus-4-8",
} as const;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await anthropic.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return text;
}
```

- [ ] **Step 2: Test yaz (SDK mock'lu)**

`src/lib/ai/client.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";

const create = vi.fn().mockResolvedValue({
  content: [{ type: "text", text: "merhaba" }],
});
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; },
}));

import { callClaude, MODELS } from "./client";

describe("callClaude", () => {
  it("returns concatenated text from content blocks", async () => {
    const out = await callClaude({ model: MODELS.fast, system: "s", user: "u" });
    expect(out).toBe("merhaba");
    expect(create).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Çalıştır**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- client`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz1): claude api istemci sarmalayıcısı (haiku+opus)"
```

---

### Task 4: AI Adım 1 — Sınıflandırıcı (classifier)

**Files:**
- Create: `src/lib/ai/prompts/classifier.ts`
- Create: `src/lib/ai/classifier.ts`
- Test: `src/lib/ai/classifier.test.ts`

**Interfaces:**
- Consumes: `callClaude`, `MODELS` (Task 3)
- Produces:
  - `ClassificationSchema` (Zod) ve `Classification` tipi: `{ kategori: string; belgeTipi: string; merci: string; eksikBilgiler: string[] }`
  - `classify(anlatim: string): Promise<Classification>` — Haiku ile sınıflandırır, JSON'u Zod ile doğrular.

- [ ] **Step 1: Prompt dosyası yaz**

`src/lib/ai/prompts/classifier.ts`:
```typescript
export const CLASSIFIER_SYSTEM = `Sen bir Türk hukuk asistanısın. Kullanıcının anlattığı sorunu analiz et ve SADECE geçerli JSON döndür (markdown yok, açıklama yok).

Şu kategorilerden birini seç: "tuketici", "savcilik", "kamu", "kira_komsu_is".

JSON formatı:
{
  "kategori": "<kategori>",
  "belgeTipi": "<örn. Tüketici Hakem Heyeti başvurusu>",
  "merci": "<belgenin gönderileceği makam>",
  "eksikBilgiler": ["<belge için gereken ama kullanıcının vermediği bilgi>", ...]
}

Kurallar:
- Emin olmadığın kanun maddesi yazma.
- eksikBilgiler, belgeyi yazmak için MUTLAKA gereken somut alanlardır (ad-soyad, tarih, tutar, karşı taraf vb.).`;

export function classifierUser(anlatim: string): string {
  return `Kullanıcının anlatımı:\n"""${anlatim}"""`;
}
```

- [ ] **Step 2: classifier.ts + Zod şeması (failing test önce)**

`src/lib/ai/classifier.ts`:
```typescript
import { z } from "zod";
import { callClaude, MODELS } from "./client";
import { CLASSIFIER_SYSTEM, classifierUser } from "./prompts/classifier";

export const ClassificationSchema = z.object({
  kategori: z.enum(["tuketici", "savcilik", "kamu", "kira_komsu_is"]),
  belgeTipi: z.string().min(1),
  merci: z.string().min(1),
  eksikBilgiler: z.array(z.string()),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export async function classify(anlatim: string): Promise<Classification> {
  const raw = await callClaude({
    model: MODELS.fast,
    system: CLASSIFIER_SYSTEM,
    user: classifierUser(anlatim),
  });
  const json = JSON.parse(extractJson(raw));
  return ClassificationSchema.parse(json);
}

export function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI yanıtında JSON bulunamadı");
  return text.slice(start, end + 1);
}
```

- [ ] **Step 3: Test yaz (callClaude mock'lu)**

`src/lib/ai/classifier.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue(
    'İşte sonuç: {"kategori":"tuketici","belgeTipi":"THH başvurusu","merci":"İlçe THH","eksikBilgiler":["satın alma tarihi"]}'
  ),
}));

import { classify, extractJson } from "./classifier";

describe("classify", () => {
  it("parses and validates classification JSON", async () => {
    const c = await classify("Telefonum bozuk çıktı, iade alamadım");
    expect(c.kategori).toBe("tuketici");
    expect(c.eksikBilgiler).toContain("satın alma tarihi");
  });
  it("extractJson pulls JSON out of surrounding text", () => {
    expect(extractJson('a {"x":1} b')).toBe('{"x":1}');
  });
});
```

- [ ] **Step 4: Çalıştır**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- classifier`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(faz1): AI sınıflandırıcı (kategori + merci + eksik bilgi)"
```

---

### Task 5: AI Adım 2 — Bilgi toplama (slot-filling, chat)

**Files:**
- Create: `src/lib/ai/prompts/collector.ts`
- Create: `src/lib/ai/collector.ts`
- Test: `src/lib/ai/collector.test.ts`

**Interfaces:**
- Consumes: `callClaude`, `MODELS`, `Classification` (Task 3-4)
- Produces:
  - `nextQuestion(history: {rol:string;icerik:string}[], eksikBilgiler: string[]): Promise<{ soru: string | null; tamamlandi: boolean }>` — eksikler bitince `tamamlandi: true, soru: null`.

- [ ] **Step 1: Prompt yaz**

`src/lib/ai/prompts/collector.ts`:
```typescript
export const COLLECTOR_SYSTEM = `Sen bir Türk hukuk asistanısın. Belgeyi hazırlamak için eksik bilgileri kullanıcıdan TEK TEK, kibar ve sade dille topluyorsun.

SADECE geçerli JSON döndür:
{ "soru": "<sorulacak tek soru ya da null>", "tamamlandi": <true/false> }

Kurallar:
- Bir seferde yalnızca bir soru sor.
- Konuşma geçmişine bakarak hangi eksik bilginin hâlâ alınmadığını belirle.
- Tüm eksik bilgiler toplandıysa "tamamlandi": true ve "soru": null döndür.`;

export function collectorUser(
  history: { rol: string; icerik: string }[],
  eksikBilgiler: string[]
): string {
  const h = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");
  return `Gereken bilgiler: ${eksikBilgiler.join(", ")}\n\nKonuşma:\n${h}`;
}
```

- [ ] **Step 2: collector.ts yaz**

```typescript
import { z } from "zod";
import { callClaude, MODELS } from "./client";
import { extractJson } from "./classifier";
import { COLLECTOR_SYSTEM, collectorUser } from "./prompts/collector";

const NextQuestionSchema = z.object({
  soru: z.string().nullable(),
  tamamlandi: z.boolean(),
});

export async function nextQuestion(
  history: { rol: string; icerik: string }[],
  eksikBilgiler: string[]
): Promise<{ soru: string | null; tamamlandi: boolean }> {
  const raw = await callClaude({
    model: MODELS.fast,
    system: COLLECTOR_SYSTEM,
    user: collectorUser(history, eksikBilgiler),
  });
  return NextQuestionSchema.parse(JSON.parse(extractJson(raw)));
}
```

- [ ] **Step 3: Test yaz**

`src/lib/ai/collector.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue('{"soru":"Ürünü ne zaman aldınız?","tamamlandi":false}'),
}));
import { nextQuestion } from "./collector";

describe("nextQuestion", () => {
  it("returns the next single question", async () => {
    const r = await nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["tarih"]);
    expect(r.tamamlandi).toBe(false);
    expect(r.soru).toMatch(/ne zaman/i);
  });
});
```

- [ ] **Step 4: Çalıştır + Commit**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- collector`
```bash
git add -A
git commit -m "feat(faz1): AI bilgi toplama (slot-filling, tek tek soru)"
```

---

### Task 6: AI Adım 3+4 — Belge üretimi + öz-kontrol

**Files:**
- Create: `src/lib/ai/prompts/generator.ts`
- Create: `src/lib/ai/generator.ts`
- Test: `src/lib/ai/generator.test.ts`

**Interfaces:**
- Consumes: `callClaude`, `MODELS`, `Classification`
- Produces:
  - `generateDocument(input: { classification: Classification; toplananBilgi: string; ton?: "resmi"|"sert"|"uzlasmaci" }): Promise<string>` — Opus ile üretir, sonra Haiku ile öz-kontrolden geçirir, temiz belge metni döner.

- [ ] **Step 1: Prompt yaz**

`src/lib/ai/prompts/generator.ts`:
```typescript
import type { Classification } from "../classifier";

export const GENERATOR_SYSTEM = `Sen deneyimli bir Türk hukuk yazımı asistanısın. Resmi Türkçe dilekçe/belge üretiyorsun.

Format: başlık (gönderilecek makam), taraf bilgileri, KONU, AÇIKLAMALAR (numaralı), HUKUKİ DAYANAK (genel), TALEP/SONUÇ, tarih ve imza satırı.

Kurallar:
- Emin olmadığın kanun maddesi NUMARASI yazma; genel ifade kullan ("ilgili tüketici mevzuatı uyarınca").
- Eksik bırakılması gereken yer varsa [ ] yerine kullanıcının verdiği bilgileri kullan.
- Uydurma isim/tarih ekleme; sadece verilen bilgileri kullan.`;

export function generatorUser(c: Classification, toplananBilgi: string, ton: string): string {
  return `Belge tipi: ${c.belgeTipi}\nMerci: ${c.merci}\nTon: ${ton}\n\nToplanan bilgiler:\n${toplananBilgi}`;
}

export const SELFCHECK_SYSTEM = `Aşağıdaki hukuki belgeyi kontrol et ve DÜZELTİLMİŞ HALİNİ döndür (sadece belge metni, açıklama yok).
Kontrol: doldurulmamış [DOLDURUN] benzeri yerler, çelişkili ifadeler, uydurulmuş kanun maddesi numarası, eksik talep bölümü. Varsa düzelt.`;
```

- [ ] **Step 2: generator.ts yaz**

```typescript
import { callClaude, MODELS } from "./client";
import type { Classification } from "./classifier";
import { GENERATOR_SYSTEM, generatorUser, SELFCHECK_SYSTEM } from "./prompts/generator";

export async function generateDocument(input: {
  classification: Classification;
  toplananBilgi: string;
  ton?: "resmi" | "sert" | "uzlasmaci";
}): Promise<string> {
  const ton = input.ton ?? "resmi";
  const draft = await callClaude({
    model: MODELS.quality,
    system: GENERATOR_SYSTEM,
    user: generatorUser(input.classification, input.toplananBilgi, ton),
    maxTokens: 4096,
  });
  const checked = await callClaude({
    model: MODELS.fast,
    system: SELFCHECK_SYSTEM,
    user: draft,
    maxTokens: 4096,
  });
  return checked.trim();
}
```

- [ ] **Step 3: Test yaz (iki çağrıyı sırayla mock'la)**

`src/lib/ai/generator.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
const callClaude = vi.fn()
  .mockResolvedValueOnce("TASLAK BELGE [DOLDURUN]")
  .mockResolvedValueOnce("TEMİZ BELGE METNİ");
vi.mock("./client", () => ({ MODELS: { fast: "f", quality: "q" }, callClaude }));
import { generateDocument } from "./generator";

describe("generateDocument", () => {
  it("generates draft then runs self-check, returns cleaned text", async () => {
    const doc = await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Ad: Ali, Tarih: 01.01.2026",
    });
    expect(doc).toBe("TEMİZ BELGE METNİ");
    expect(callClaude).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 4: Çalıştır + Commit**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- generator`
```bash
git add -A
git commit -m "feat(faz1): belge üretimi (opus) + öz-kontrol (haiku)"
```

---

### Task 7: `/api/chat` rotası

**Files:**
- Create: `src/lib/preview.ts`
- Create: `src/app/api/chat/route.ts`
- Test: `src/lib/preview.test.ts`, `src/app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: `classify`, `nextQuestion`, `prisma`
- Produces:
  - `POST /api/chat` body: `{ caseId?: string; mesaj: string }` → `{ caseId: string; cevap: string; tamamlandi: boolean }`. İlk mesajda yeni Case oluşturur, sınıflandırır, ilk soruyu sorar. Sonraki mesajlarda bir sonraki soruyu üretir.
  - `maskPreview(text: string): string` — ilk paragrafı bırakır, gerisini `█` ile maskeler (önizleme için, Task 8'de de kullanılır).

- [ ] **Step 1: preview.ts + testi yaz**

`src/lib/preview.ts`:
```typescript
export function maskPreview(text: string): string {
  const paras = text.split("\n\n");
  if (paras.length <= 1) return text.slice(0, 200);
  const masked = paras.slice(1).map((p) =>
    p.replace(/\S/g, "█")
  );
  return [paras[0], ...masked].join("\n\n");
}
```

`src/lib/preview.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { maskPreview } from "./preview";
describe("maskPreview", () => {
  it("keeps first paragraph, masks the rest", () => {
    const out = maskPreview("İlk paragraf net.\n\nGizli içerik burada.");
    expect(out).toContain("İlk paragraf net.");
    expect(out).toContain("█");
    expect(out).not.toContain("Gizli içerik");
  });
});
```

- [ ] **Step 2: chat route yaz**

`src/app/api/chat/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { nextQuestion } from "@/lib/ai/collector";

export async function POST(req: NextRequest) {
  const { caseId, mesaj } = await req.json();

  if (!caseId) {
    const classification = await classify(mesaj);
    const c = await prisma.case.create({
      data: { baslik: mesaj.slice(0, 60), kategori: classification.kategori },
    });
    await prisma.message.create({ data: { caseId: c.id, rol: "user", icerik: mesaj } });
    const q = await nextQuestion([{ rol: "user", icerik: mesaj }], classification.eksikBilgiler);
    const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
    await prisma.message.create({ data: { caseId: c.id, rol: "assistant", icerik: cevap } });
    return NextResponse.json({ caseId: c.id, cevap, tamamlandi: q.tamamlandi });
  }

  await prisma.message.create({ data: { caseId, rol: "user", icerik: mesaj } });
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const firstUser = history.find((m) => m.rol === "user")?.icerik ?? mesaj;
  const classification = await classify(firstUser);
  const q = await nextQuestion(
    history.map((m) => ({ rol: m.rol, icerik: m.icerik })),
    classification.eksikBilgiler
  );
  const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
  await prisma.message.create({ data: { caseId, rol: "assistant", icerik: cevap } });
  return NextResponse.json({ caseId, cevap, tamamlandi: q.tamamlandi });
}
```

- [ ] **Step 3: route testi yaz (db + ai mock'lu)**

`src/app/api/chat/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const messageCreate = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/db", () => ({
  default: { case: { create }, message: { create: messageCreate, findMany } },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih"] }),
}));
vi.mock("@/lib/ai/collector", () => ({
  nextQuestion: vi.fn().mockResolvedValue({ soru: "Ne zaman aldınız?", tamamlandi: false }),
}));

import { POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => { create.mockResolvedValue({ id: "c1" }); messageCreate.mockResolvedValue({}); });
  it("creates a case and asks first question on first message", async () => {
    const req = new Request("http://t/api/chat", { method: "POST", body: JSON.stringify({ mesaj: "telefon bozuk" }) });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.caseId).toBe("c1");
    expect(body.cevap).toMatch(/ne zaman/i);
    expect(body.tamamlandi).toBe(false);
  });
});
```

- [ ] **Step 4: Çalıştır + Commit**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- chat preview`
```bash
git add -A
git commit -m "feat(faz1): /api/chat rotası + önizleme maskeleme"
```

---

### Task 8: `/api/generate` rotası (sunucu-taraflı kilit)

**Files:**
- Create: `src/app/api/generate/route.ts`
- Test: `src/app/api/generate/route.test.ts`

**Interfaces:**
- Consumes: `classify`, `generateDocument`, `maskPreview`, `prisma`
- Produces:
  - `POST /api/generate` body: `{ caseId: string; ton?: string }` → `{ documentId: string; onizleme: string }`. Tam metni DB'ye `Document` (durum=`taslak`) olarak kaydeder ama **yanıtta sadece `maskPreview` döner**. Tam metin asla bu rotadan dönmez.

- [ ] **Step 1: generate route yaz**

`src/app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { generateDocument } from "@/lib/ai/generator";
import { maskPreview } from "@/lib/preview";

export async function POST(req: NextRequest) {
  const { caseId, ton } = await req.json();
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  if (history.length === 0) {
    return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  }
  const toplananBilgi = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");
  const firstUser = history.find((m) => m.rol === "user")?.icerik ?? "";
  const classification = await classify(firstUser);

  const icerik = await generateDocument({ classification, toplananBilgi, ton });
  const doc = await prisma.document.create({
    data: { caseId, tip: classification.belgeTipi, merci: classification.merci, icerik, durum: "taslak" },
  });
  return NextResponse.json({ documentId: doc.id, onizleme: maskPreview(icerik) });
}
```

- [ ] **Step 2: Test yaz — tam metnin yanıtta DÖNMEDİĞİNİ doğrula**

`src/app/api/generate/route.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
const docCreate = vi.fn().mockResolvedValue({ id: "d1" });
vi.mock("@/lib/db", () => ({
  default: {
    message: { findMany: vi.fn().mockResolvedValue([{ rol: "user", icerik: "telefon bozuk" }]) },
    document: { create: docCreate },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] }),
}));
vi.mock("@/lib/ai/generator", () => ({
  generateDocument: vi.fn().mockResolvedValue("GİZLİ BAŞLIK\n\nGizli tam belge metni burada."),
}));
import { POST } from "./route";

describe("POST /api/generate", () => {
  it("saves full doc but returns only masked preview", async () => {
    const req = new Request("http://t/api/generate", { method: "POST", body: JSON.stringify({ caseId: "c1" }) });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.documentId).toBe("d1");
    expect(body.onizleme).not.toContain("Gizli tam belge metni");
    expect(docCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Çalıştır + Commit**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- generate`
```bash
git add -A
git commit -m "feat(faz1): /api/generate + sunucu-taraflı önizleme kilidi"
```

---

### Task 9: Chat modu frontend

**Files:**
- Create: `src/app/chat/page.tsx`
- Create: `src/components/ChatBox.tsx`

**Interfaces:**
- Consumes: `POST /api/chat`, `POST /api/generate`
- Produces: `/chat` sayfası — mesaj kutusu, AI cevapları, `tamamlandi` olunca "Belgeyi Oluştur" butonu → `/api/generate` çağrısı → önizleme gösterimi.

- [ ] **Step 1: ChatBox bileşeni yaz**

`src/components/ChatBox.tsx`:
```tsx
"use client";
import { useState } from "react";

type Msg = { rol: "user" | "assistant"; icerik: string };

export default function ChatBox() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [tamam, setTamam] = useState(false);
  const [onizleme, setOnizleme] = useState<string | null>(null);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setMsgs((m) => [...m, { rol: "user", icerik: userMsg }]);
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId, mesaj: userMsg }),
    });
    const data = await res.json();
    setCaseId(data.caseId);
    setMsgs((m) => [...m, { rol: "assistant", icerik: data.cevap }]);
    setTamam(data.tamamlandi);
  }

  async function generate() {
    const res = await fetch("/api/generate", { method: "POST", body: JSON.stringify({ caseId }) });
    const data = await res.json();
    setOnizleme(data.onizleme);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div>
        {msgs.map((m, i) => (
          <p key={i}><strong>{m.rol === "user" ? "Siz" : "Asistan"}:</strong> {m.icerik}</p>
        ))}
      </div>
      {!onizleme && (
        <>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Derdinizi anlatın..." />
          <button onClick={send}>Gönder</button>
          {tamam && <button onClick={generate}>Belgeyi Oluştur</button>}
        </>
      )}
      {onizleme && (
        <div>
          <h3>Önizleme</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{onizleme}</pre>
          <button disabled>Tam Belgeyi İndir (yakında — ödeme Faz 2)</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: chat page yaz**

`src/app/chat/page.tsx`:
```tsx
import ChatBox from "@/components/ChatBox";
export default function ChatPage() {
  return (
    <main>
      <h1>Derdinizi Anlatın</h1>
      <ChatBox />
    </main>
  );
}
```

- [ ] **Step 3: Manuel doğrulama**

Run: `docker compose -f docker-compose.dev.yml up -d`
`http://localhost:3000/chat` → derdini yaz → AI soru sorar → "Belgeyi Oluştur" → önizleme (ilk paragraf net, gerisi █) görünür.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz1): chat modu frontend + önizleme gösterimi"
```

---

### Task 10: Akıllı form modu frontend

**Files:**
- Create: `src/app/api/form-fields/route.ts`
- Create: `src/app/form/page.tsx`
- Create: `src/components/SmartForm.tsx`
- Test: `src/app/api/form-fields/route.test.ts`

**Interfaces:**
- Consumes: `classify`, `prisma`
- Produces:
  - `POST /api/form-fields` body: `{ aciklama: string }` → `{ caseId: string; belgeTipi: string; alanlar: string[] }` (= `eksikBilgiler`, form alanlarına çevrilir).
  - `/form` sayfası — kısa açıklama → AI alanları getirir → kullanıcı doldurur → `/api/generate` (alan verileri tek mesaj olarak case'e yazılır).

- [ ] **Step 1: form-fields route + testi yaz**

`src/app/api/form-fields/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";

export async function POST(req: NextRequest) {
  const { aciklama } = await req.json();
  const c = await classify(aciklama);
  const created = await prisma.case.create({
    data: { baslik: aciklama.slice(0, 60), kategori: c.kategori },
  });
  await prisma.message.create({ data: { caseId: created.id, rol: "user", icerik: aciklama } });
  return NextResponse.json({ caseId: created.id, belgeTipi: c.belgeTipi, alanlar: c.eksikBilgiler });
}
```

`src/app/api/form-fields/route.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({
  default: {
    case: { create: vi.fn().mockResolvedValue({ id: "c1" }) },
    message: { create: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih", "tutar"] }),
}));
import { POST } from "./route";
describe("POST /api/form-fields", () => {
  it("returns dynamic form fields from classification", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    const body = await (await POST(req as any)).json();
    expect(body.alanlar).toEqual(["tarih", "tutar"]);
    expect(body.caseId).toBe("c1");
  });
});
```

- [ ] **Step 2: SmartForm bileşeni yaz**

`src/components/SmartForm.tsx`:
```tsx
"use client";
import { useState } from "react";

export default function SmartForm() {
  const [aciklama, setAciklama] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [alanlar, setAlanlar] = useState<string[]>([]);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<string | null>(null);

  async function getFields() {
    const res = await fetch("/api/form-fields", { method: "POST", body: JSON.stringify({ aciklama }) });
    const data = await res.json();
    setCaseId(data.caseId);
    setAlanlar(data.alanlar);
  }

  async function submit() {
    const ozet = alanlar.map((a) => `${a}: ${degerler[a] ?? ""}`).join("\n");
    await fetch("/api/chat", { method: "POST", body: JSON.stringify({ caseId, mesaj: ozet }) });
    const res = await fetch("/api/generate", { method: "POST", body: JSON.stringify({ caseId }) });
    setOnizleme((await res.json()).onizleme);
  }

  if (onizleme) return <pre style={{ whiteSpace: "pre-wrap" }}>{onizleme}</pre>;
  if (alanlar.length === 0)
    return (
      <div>
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Kısaca sorununuz..." />
        <button onClick={getFields}>Devam</button>
      </div>
    );
  return (
    <div>
      {alanlar.map((a) => (
        <div key={a}>
          <label>{a}</label>
          <input onChange={(e) => setDegerler((d) => ({ ...d, [a]: e.target.value }))} />
        </div>
      ))}
      <button onClick={submit}>Belgeyi Oluştur</button>
    </div>
  );
}
```

- [ ] **Step 3: form page yaz**

`src/app/form/page.tsx`:
```tsx
import SmartForm from "@/components/SmartForm";
export default function FormPage() {
  return (<main><h1>Adım Adım Form</h1><SmartForm /></main>);
}
```

- [ ] **Step 4: Çalıştır + Commit**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- form-fields`
Manuel: `http://localhost:3000/form` → açıklama → alanlar → doldur → önizleme.
```bash
git add -A
git commit -m "feat(faz1): akıllı form modu (dinamik alanlar + üretim)"
```

---

### Task 11: Landing + mod seçimi + Faz 1 kapanışı

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: Ana sayfada iki mod butonu (`/chat`, `/form`) + ürün açıklaması.

- [ ] **Step 1: page.tsx güncelle**

```tsx
import Link from "next/link";
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <h1>AI Hukuki Belge Asistanı</h1>
      <p>Derdinizi anlatın, size uygun hukuki belgeyi hazırlayalım.</p>
      <p><em>Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır.</em></p>
      <Link href="/chat"><button>💬 Serbest Anlat</button></Link>
      <Link href="/form"><button>📋 Adım Adım Form</button></Link>
    </main>
  );
}
```

- [ ] **Step 2: Tüm test takımını çalıştır**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test`
Expected: TÜM testler PASS.

- [ ] **Step 3: Uçtan uca manuel doğrulama**

`http://localhost:3000` → mod seç → her iki modda belge üretimine kadar akış çalışır.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz1): landing + mod seçimi — Faz 1 tamamlandı"
```

---

## Self-Review Notları (yazım sonrası kontrol)

- **Spec kapsamı:** İki giriş modu (Task 9-10) ✓, niyet anlama + merci (Task 4) ✓, eksik bilgi toplama (Task 5, 10) ✓, belge üretimi + öz-kontrol (Task 6) ✓, bulanık önizleme + sunucu kilidi (Task 7-8) ✓, prompt versiyonlama (Task 4-6) ✓, Docker dev (Task 1) ✓, veri modeli (Task 2) ✓, model dağılımı Haiku/Opus (Task 3+) ✓.
- **Faz 1 dışı (bilinçli):** Auth, ödeme, PDF indirme → Faz 2. KVKK metni, rate limit, eval → Faz 3. Bunlar burada YOK; "İndir" butonu Faz 1'de devre dışı.
- **Tip tutarlılığı:** `Classification` (Task 4) tüm sonraki task'larda aynı imza. `maskPreview` (Task 7) Task 8'de kullanılıyor. `callClaude`/`MODELS` (Task 3) her AI task'ında tutarlı.
