"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/schemas";
import ResultsView from "./ResultsView";

type Sample = { id: string; label: string; category: string; text: string };
type Tab = "paste" | "upload";

const STAGES = [
  "Redacting personal information…",
  "Extracting offer details…",
  "Checking company & domain…",
  "Analyzing risk…",
];

export default function Analyzer() {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    paste: null,
    upload: null,
  });

  useEffect(() => {
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d) => setSamples(d.samples ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const id = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      2500
    );
    return () => clearInterval(id);
  }, [loading]);

  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: Tab = tab === "paste" ? "upload" : "paste";
      setTab(next);
      tabRefs.current[next]?.focus();
    }
  }

  async function analyze() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      let offerText = text;
      if (tab === "upload") {
        if (!file) throw new Error("Choose a PDF, DOCX or TXT file first.");
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error ?? "Upload failed");
        offerText = upData.text;
      }
      if (offerText.trim().length < 40) {
        throw new Error("Paste the full offer message (at least a few lines).");
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: offerText,
          senderEmail: senderEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data as AnalyzeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function loadSample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setTab("paste");
    setText(sample.text);
    setResult(null);
    setError(null);
    const emailMatch = sample.text.match(/From:\s*([^\s]+@[^\s]+)/i);
    setSenderEmail(emailMatch?.[1] ?? "");
  }

  const tabClasses = (active: boolean) =>
    `rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium ${
      active
        ? "border-zinc-400 bg-white text-zinc-950 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    }`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Fake Internship Offer Detector
        </h1>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Paste an internship or job offer you received and get an AI-assisted
          verdict — <strong>Safe</strong>, <strong>Suspicious</strong> or{" "}
          <strong>High Risk</strong> — with the exact red flags explained in
          plain language, before you share documents or money.
        </p>
      </header>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div role="tablist" aria-label="Offer input method" onKeyDown={onTabKeyDown}>
          <button
            role="tab"
            id="tab-paste"
            aria-selected={tab === "paste"}
            aria-controls="panel-paste"
            tabIndex={tab === "paste" ? 0 : -1}
            ref={(el) => {
              tabRefs.current.paste = el;
            }}
            onClick={() => setTab("paste")}
            className={tabClasses(tab === "paste")}
          >
            Paste offer text
          </button>
          <button
            role="tab"
            id="tab-upload"
            aria-selected={tab === "upload"}
            aria-controls="panel-upload"
            tabIndex={tab === "upload" ? 0 : -1}
            ref={(el) => {
              tabRefs.current.upload = el;
            }}
            onClick={() => setTab("upload")}
            className={tabClasses(tab === "upload")}
          >
            Upload file (PDF/DOCX)
          </button>
        </div>

        {samples.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Try a sample:</span>
            <select
              onChange={(e) => e.target.value && loadSample(e.target.value)}
              defaultValue=""
              className="max-w-56 rounded-lg border border-zinc-400 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="" disabled>
                Choose an example…
              </option>
              {(["fake", "outlier", "safe"] as const).map((cat) => (
                <optgroup
                  key={cat}
                  label={
                    cat === "fake" ? "Scams" : cat === "safe" ? "Legitimate" : "Tricky cases"
                  }
                >
                  {samples
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="rounded-xl rounded-tl-none border border-zinc-400 bg-white p-5 dark:border-zinc-600 dark:bg-zinc-900">
        {tab === "paste" ? (
          <div role="tabpanel" id="panel-paste" aria-labelledby="tab-paste">
            <label htmlFor="offer-text" className="mb-1.5 block text-sm font-medium">
              Offer message
            </label>
            <textarea
              id="offer-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              maxLength={15000}
              placeholder="Paste the full email / WhatsApp / LinkedIn message here, including the sender line if you have it…"
              className="w-full resize-y rounded-lg border border-zinc-400 bg-white p-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        ) : (
          <div role="tabpanel" id="panel-upload" aria-labelledby="tab-upload">
            <label
              htmlFor="offer-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm ${
                dragOver
                  ? "border-blue-700 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
                  : "border-zinc-400 dark:border-zinc-600"
              }`}
            >
              <span className="font-medium">
                {file ? file.name : "Drop your offer letter here or click to browse"}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                PDF, DOCX or TXT — max 5MB. The file is analyzed in memory and never
                stored.
              </span>
              <input
                id="offer-file"
                type="file"
                accept=".pdf,.docx,.txt"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-64 flex-1">
            <label htmlFor="sender-email" className="mb-1.5 block text-sm font-medium">
              Sender&apos;s email address{" "}
              <span className="font-normal text-zinc-600 dark:text-zinc-400">
                (optional, improves domain check)
              </span>
            </label>
            <input
              id="sender-email"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="hr@company.com"
              className="w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {loading ? "Analyzing…" : "Check this offer"}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="mt-6">
        {loading && (
          <div className="rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
            <p className="font-medium">{STAGES[stage]}</p>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm">
              {STAGES.map((s, i) => (
                <li
                  key={s}
                  className={
                    i < stage
                      ? "text-emerald-800 dark:text-emerald-300"
                      : i === stage
                        ? "font-medium motion-safe:animate-pulse"
                        : "text-zinc-500 dark:text-zinc-400"
                  }
                >
                  <span aria-hidden="true">{i < stage ? "✔" : i === stage ? "●" : "○"}</span>{" "}
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-600 bg-red-50 p-4 text-sm font-medium text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-200"
          >
            <span aria-hidden="true">✖</span> {error}
          </p>
        )}

        {result && !loading && <ResultsView result={result} />}
      </div>

      <footer className="mt-10 border-t border-zinc-300 pt-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          <strong>Disclaimer:</strong> This is a decision-support tool, not a legal
          or financial verdict. The final decision and responsibility rest with you.
          Always confirm offers with your college placement cell before paying
          anything or sharing identity documents. This tool never contacts anyone
          on your behalf — its output is advisory only.
        </p>
      </footer>
    </main>
  );
}
