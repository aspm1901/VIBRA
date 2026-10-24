/**
 * Prueba de extremo a extremo con imágenes ajenas al catálogo.
 * npx tsx scripts/eval-external-search.ts manifest.json http://localhost:3010 resultado.json
 * Manifest: [{ id, path, expectedFamily, source, title? }]. Las rutas son relativas al manifest.
 * Solo consulta /api/search. No registra ni modifica prendas.
 */
import fs from "node:fs";
import path from "node:path";
import { extractGarmentFamily } from "../lib/ranking";
import type { SearchResultItem } from "../types";
import { getFamilyRelation } from "../lib/search-scoring";

type Case = { id: string; path: string; expectedFamily: Parameters<typeof getFamilyRelation>[0]; source: string; title?: string };

async function main() {
  const [manifestFile, baseUrl = "http://localhost:3010", outputFile = "external-search-results.json"] = process.argv.slice(2);
  if (!manifestFile) throw new Error("Indica un manifest de imágenes externas.");
  const cases: Case[] = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const results: Record<string, unknown>[] = [];
  for (const item of cases) {
    const bytes = fs.readFileSync(path.resolve(path.dirname(manifestFile), item.path));
    const started = Date.now();
    try {
      const mime = path.extname(item.path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
      const response = await fetch(`${baseUrl}/api/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: `data:${mime};base64,${bytes.toString("base64")}`, filters: { searchMode: "prenda" } }),
        signal: AbortSignal.timeout(90000),
      });
      const body = await response.json();
      const detectedFamily = extractGarmentFamily(body.detectedInfo?.garmentTitle, body.detectedInfo?.category, body.detectedInfo?.garmentFamily);
      const top: SearchResultItem[] = (body.qualifiedResults || []).slice(0, 3);
      const row = {
        id: item.id, title: item.title, source: item.source, expectedFamily: item.expectedFamily,
        status: response.status, elapsedMs: Date.now() - started, error: body.error,
        analysisSource: body.analysisSource,
        detectedInfo: body.detectedInfo,
        detectedFamily: response.ok ? detectedFamily : null,
        recognitionCorrect: response.ok && detectedFamily === item.expectedFamily,
        resultCount: body.qualifiedResults?.length || 0,
        top3: top.map(r => ({ store: r.store.name, garment: r.bestGarment.name, score: r.resonanceScore,
          familyCorrect: getFamilyRelation(item.expectedFamily, r.bestGarment) === "same" })),
      };
      results.push(row);
      console.log(`${item.id}: HTTP ${response.status}, familia ${row.detectedFamily}, ${row.resultCount} tiendas (${row.elapsedMs} ms)`);
    } catch (error) {
      results.push({ id: item.id, source: item.source, expectedFamily: item.expectedFamily, error: String(error), recognitionCorrect: false });
      console.log(`${item.id}: fallo de conexión`);
    }
    // Se conserva evidencia incluso si una consulta posterior falla.
    fs.writeFileSync(outputFile, JSON.stringify({ cases: results }, null, 2));
  }
  const completed = results.filter(r => r.status === 200);
  const correct = completed.filter(r => r.recognitionCorrect).length;
  const slots = completed.flatMap(r => r.top3 as { familyCorrect: boolean }[]);
  const summary = {
    total: cases.length, completed: completed.length, failures: cases.length - completed.length,
    recognized: correct, recognitionRateAmongCompleted: completed.length ? correct / completed.length : null,
    top3FamilyMatches: slots.filter(r => r.familyCorrect).length, top3Slots: slots.length,
  };
  fs.writeFileSync(outputFile, JSON.stringify({ summary, cases: results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failures > 0) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
