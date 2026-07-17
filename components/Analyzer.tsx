"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import {
  Upload,
  Loader2,
  Sparkles,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { AnalyzeResponse } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ResultsView from "./ResultsView";

type Status = "idle" | "extracting" | "analyzing" | "done" | "error";

const VERIFY_STAGES = [
  "Redacting personal information",
  "Extracting offer details",
  "Checking company and domain",
  "Analyzing fraud risk",
] as const;

export default function Analyzer() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [verifyStage, setVerifyStage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [openPopup, setOpenPopup] = useState<"privacy" | "disclaimer" | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) {
        setOpenPopup(null);
      }
    };

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !openPopup) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-mobile-popover]")) {
        setOpenPopup(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isMobile, openPopup]);

  const clearStageTimer = useCallback(() => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const scrollToResult = useCallback(() => {
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStatus("extracting");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) {
        throw new Error(upData.error ?? "Upload failed");
      }

      const extracted = typeof upData.text === "string" ? upData.text : "";
      setText(extracted.trim());
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file");
      setStatus("error");
    }
  }, []);

  const handleVerify = async () => {
    if (text.trim().length < 10) {
      setError("Please paste or upload an offer with at least 10 characters.");
      return;
    }

    setError(null);
    setStatus("analyzing");
    setVerifyStage(0);
    clearStageTimer();
    stageTimerRef.current = setInterval(() => {
      setVerifyStage((prev) => Math.min(prev + 1, VERIFY_STAGES.length - 1));
    }, 1200);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");

      setVerifyStage(VERIFY_STAGES.length - 1);
      setResult(data as AnalyzeResponse);
      setStatus("done");
      scrollToResult();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
      setStatus("error");
    } finally {
      clearStageTimer();
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    void event;
  };
  const busy = status === "analyzing" || status === "extracting";

  return (
    <DndContext onDragEnd={onDragEnd}>
      <main id="main" className="relative min-h-dvh">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" aria-hidden />

        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10 flex flex-wrap items-start justify-end gap-2 max-w-[calc(100vw-1.5rem)]">
          <div className="group relative" data-mobile-popover>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-2.5 sm:px-3"
              aria-label="Privacy policy"
              aria-expanded={isMobile ? openPopup === "privacy" : undefined}
              onClick={() => {
                if (isMobile) {
                  setOpenPopup((current) => (current === "privacy" ? null : "privacy"));
                }
              }}
            >
              <ShieldCheck className="size-4" aria-hidden />
              <span className="hidden sm:inline">Privacy Policy</span>
            </Button>
            <div
              className={cn(
                "pointer-events-none absolute right-0 top-11 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-3 text-left text-xs text-muted-foreground opacity-0 shadow-lg transition-all duration-200",
                "group-hover:pointer-events-auto group-hover:opacity-100",
                isMobile && openPopup === "privacy" && "pointer-events-auto opacity-100"
              )}
            >
              <h4 className="mb-1 text-sm font-semibold text-foreground">Our Privacy Commitment</h4>
              <p>
                Redaction runs locally before external API calls. Documents are parsed in-memory and never written to disk. We do not log offer text, resumes, or personal contact details.
              </p>
            </div>
          </div>
          <div className="group relative" data-mobile-popover>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-2.5 sm:px-3"
              aria-label="Disclaimer"
              aria-expanded={isMobile ? openPopup === "disclaimer" : undefined}
              onClick={() => {
                if (isMobile) {
                  setOpenPopup((current) => (current === "disclaimer" ? null : "disclaimer"));
                }
              }}
            >
              <AlertTriangle className="size-4" aria-hidden />
              <span className="hidden sm:inline">Disclaimer</span>
            </Button>
            <div
              className={cn(
                "pointer-events-none absolute right-0 top-11 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-3 text-left text-xs text-muted-foreground opacity-0 shadow-lg transition-all duration-200",
                "group-hover:pointer-events-auto group-hover:opacity-100",
                isMobile && openPopup === "disclaimer" && "pointer-events-auto opacity-100"
              )}
            >
              <h4 className="mb-1 text-sm font-semibold text-foreground">Security Disclaimer</h4>
              <p>
                Verifly helps with risk signals, but final decisions are yours. Always verify through official company channels before sharing money or sensitive documents.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-stretch justify-center px-4 py-16 gap-4">
          <DropZone onFile={handleFile} fileName={fileName} status={status} />

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or paste offer text here..."
            aria-label="Offer text"
            className="min-h-32 text-sm resize-y"
          />

          {error && (
            <Alert variant="destructive" role="alert">
              <XCircle className="size-4" aria-hidden />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleVerify}
            disabled={busy}
            className="w-full rounded-full"
          >
            {status === "analyzing" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Verifying...
              </>
            ) : status === "extracting" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Reading file...
              </>
            ) : (
              <>
                <Sparkles aria-hidden /> Start verification
              </>
            )}
          </Button>

          {text && !busy && (
            <ClearBurstButton
              onClear={() => {
                setText("");
                setFileName(null);
                setResult(null);
                setError(null);
                setStatus("idle");
              }}
            />
          )}
        </div>

        <section
          ref={resultRef}
          aria-labelledby="result-heading"
          aria-live="polite"
          className="relative mx-auto max-w-3xl px-4 pb-16 scroll-mt-6"
        >
          <h2 id="result-heading" className="sr-only">
            Verification result
          </h2>
          {result ? (
            <ResultsView result={result} />
          ) : status === "analyzing" ? (
            <AnalysisProgressPanel stage={verifyStage} />
          ) : null}
        </section>

      </main>
    </DndContext>
  );
}

function DropZone({
  onFile,
  fileName,
  status,
}: {
  onFile: (f: File) => void;
  fileName: string | null;
  status: Status;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const { setNodeRef, isOver: dndOver } = useDroppable({ id: "offer-drop" });
  const active = isOver || dndOver;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      aria-label="Drag and drop a file or click to upload"
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/60 backdrop-blur-sm",
        "aspect-[4/5] w-full cursor-pointer transition-colors",
        "hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:bg-primary/5",
        active && "border-primary bg-primary/10"
      )}
    >
      {status === "extracting" ? (
        <>
          <Loader2 className="size-10 text-primary animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">Reading file...</p>
        </>
      ) : (
        <>
          <div
            className={cn(
              "grid place-items-center size-16 rounded-full bg-secondary transition-colors",
              "group-hover:bg-primary/10 group-hover:text-primary",
              active && "bg-primary/15 text-primary"
            )}
            aria-hidden
          >
            <Upload className="size-7" />
          </div>
          <div className="text-center px-6">
            <p className="text-base font-semibold">{fileName ?? "Drop file or click to upload"}</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF · DOCX · TXT</p>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
        className="sr-only"
        aria-label="Upload offer file"
      />
    </div>
  );
}

function AnalysisProgressPanel({ stage }: { stage: number }) {
  const progress = Math.round(((stage + 1) / VERIFY_STAGES.length) * 100);

  return (
    <Card className="card-reveal border-primary/25 bg-card/95">
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
            <p className="font-display text-lg text-foreground">Verification in progress</p>
          </div>
          <span className="text-sm font-mono text-muted-foreground">{progress}%</span>
        </div>

        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${progress} percent complete`}>
            <div
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">{VERIFY_STAGES[stage]}</p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {VERIFY_STAGES.map((label, idx) => {
            const done = idx < stage;
            const active = idx === stage;
            return (
              <li
                key={label}
                className={cn(
                  "rounded-lg border p-3 text-sm transition-colors",
                  done && "border-safe/40 bg-safe/10 text-foreground",
                  active && "border-primary/40 bg-primary/10 text-foreground",
                  !done && !active && "border-border bg-secondary/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  {done ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-safe/20 text-safe">✓</span>
                  ) : active ? (
                    <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-border text-xs">{idx + 1}</span>
                  )}
                  <span>{label}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-3 sm:grid-cols-3 [perspective:1200px]">
          {["h-10", "h-10", "h-10"].map((h, i) => (
            <div key={i} className="row-tilt origin-center" style={{ animationDelay: `${i * 120}ms` }}>
              <Skeleton className={cn(h, "w-full")} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClearBurstButton({ onClear }: { onClear: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  type BurstParticle = {
    id: number;
    dx: number;
    dy: number;
    size: number;
    delay: number;
    duration: number;
  };

  const [burst, setBurst] = useState<{
    x: number;
    y: number;
    particles: BurstParticle[];
  } | null>(null);

  const handleClick = () => {
    const btn = btnRef.current;
    if (!btn) {
      onClear();
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      onClear();
      return;
    }

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const particles = Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const dist = 80 + Math.random() * 140;

      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 80,
        duration: 520 + Math.random() * 260,
      };
    });

    setBurst({ x, y, particles });
    window.setTimeout(() => {
      setBurst(null);
      onClear();
    }, 700);
  };

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="w-fit mx-auto"
      >
        Clear
      </Button>

      {burst && (
        <div
          className="pointer-events-none fixed inset-0 z-50"
          aria-hidden
          style={{
            ["--wipe-x" as string]: `${burst.x}px`,
            ["--wipe-y" as string]: `${burst.y}px`,
          }}
        >
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
            style={{
              animation: "radial-wipe 700ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards",
            }}
          />
          {burst.particles.map((particle) => {
            return (
              <span
                key={particle.id}
                className="absolute rounded-full bg-primary"
                style={{
                  left: burst.x,
                  top: burst.y,
                  width: particle.size,
                  height: particle.size,
                  boxShadow:
                    "0 0 8px color-mix(in oklab, var(--color-primary) 70%, transparent)",
                  ["--dx" as string]: `${particle.dx}px`,
                  ["--dy" as string]: `${particle.dy}px`,
                  animation: `dust-drift ${particle.duration}ms ease-out ${particle.delay}ms forwards`,
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
