"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPapers, Paper } from "@/lib/api";

// ─── State colour map ─────────────────────────────────────────────────────────

const STATE_COLOURS: Record<string, { bg: string; accent: string }> = {
  selangor:          { bg: "#b71c1c", accent: "#ef5350" },
  sbp:               { bg: "#1a237e", accent: "#3949ab" },
  mrsm:              { bg: "#1b5e20", accent: "#388e3c" },
  johor:             { bg: "#880e4f", accent: "#c2185b" },
  kelantan:          { bg: "#4e342e", accent: "#795548" },
  perak:             { bg: "#4a148c", accent: "#7b1fa2" },
  sabah:             { bg: "#006064", accent: "#00838f" },
  sarawak:           { bg: "#e65100", accent: "#f57c00" },
  pahang:            { bg: "#1565c0", accent: "#1976d2" },
  terengganu:        { bg: "#004d40", accent: "#00695c" },
  kedah:             { bg: "#c62828", accent: "#e53935" },
  "pulau pinang":    { bg: "#283593", accent: "#3f51b5" },
  penang:            { bg: "#283593", accent: "#3f51b5" },
  "negeri sembilan": { bg: "#558b2f", accent: "#7cb342" },
  melaka:            { bg: "#bf360c", accent: "#e64a19" },
  perlis:            { bg: "#37474f", accent: "#546e7a" },
  default:           { bg: "#4527a0", accent: "#5e35b1" },
};

function getStateColour(state: string | null) {
  if (!state) return STATE_COLOURS.default;
  const key = state.toLowerCase().trim();
  for (const [k, v] of Object.entries(STATE_COLOURS)) {
    if (key.includes(k)) return v;
  }
  return STATE_COLOURS.default;
}

function inferKertas(paper: Paper): string {
  const name = (paper.paper_name ?? "").toLowerCase();
  if (name.includes("2") || name.includes("kertas 2") || name.includes("paper 2")) return "Kertas 2";
  return "Kertas 1";
}

function getExamTime(kertas: string): string {
  return kertas === "Kertas 2" ? "2 Jam 30 Minit" : "1 Jam 15 Minit";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExaminationPage() {
  const router = useRouter();
  const [papers, setPapers]   = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [negeri, setNegeri]   = useState("");
  const [tahun, setTahun]     = useState("");

  useEffect(() => {
    getPapers()
      .then(res => setPapers(res.papers.filter(p =>
        ["matematik", "math"].includes((p.subject ?? "").trim().toLowerCase())
      )))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allNegeri = useMemo(() =>
    [...new Set(papers.map(p => p.state ?? "").filter(Boolean))].sort(), [papers]);
  const allTahun = useMemo(() =>
    [...new Set(papers.map(p => String(p.year)).filter(Boolean))].sort().reverse(), [papers]);

  const filtered = useMemo(() => papers.filter(p => {
    const matchNegeri = !negeri || p.state === negeri;
    const matchTahun  = !tahun  || String(p.year) === tahun;
    return matchNegeri && matchTahun;
  }), [papers, negeri, tahun]);

  return (
    <>
      {/* Fixed banner — same pattern as learning page */}
      <header className="material-current-head exb-banner">
        <p className="material-eyebrow">📋 SPM Trial</p>
        <h1 className="material-title">Peperiksaan</h1>
        <div className="exb-dropdowns exb-banner-filters">
          <select className="exb-select" value={negeri} onChange={e => setNegeri(e.target.value)}>
            <option value="">Semua Negeri</option>
            {allNegeri.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select className="exb-select" value={tahun} onChange={e => setTahun(e.target.value)}>
            <option value="">Semua Tahun</option>
            {allTahun.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <div className="exb-page exb-page--bannered page-enter">
        {loading && <p className="exb-loading">Memuatkan kertas peperiksaan…</p>}
        {!loading && filtered.length === 0 && <p className="exb-empty">Tiada kertas dijumpai.</p>}

      {/* Booklet grid */}
      <div className="exb-grid">
        {filtered.map(paper => {
          const colour = getStateColour(paper.state);
          const kertas = inferKertas(paper);
          const time   = getExamTime(kertas);

          return (
            <button
              key={paper.id}
              type="button"
              className="exb-booklet"
              onClick={() => router.push(`/exams?paperId=${paper.id}`)}
              aria-label={`${paper.state} ${paper.year} ${kertas}`}
            >
              {/* Coloured state header */}
              <div className="exb-booklet-header" style={{ background: colour.bg }}>
                <div className="exb-booklet-stripe" style={{ background: colour.accent }} />
                <p className="exb-booklet-state">{paper.state ?? "SPM Trial"}</p>
              </div>

              {/* Body */}
              <div className="exb-booklet-body">
                <p className="exb-booklet-trial">SIJIL PELAJARAN MALAYSIA</p>
                <p className="exb-booklet-trial-sub">(PEPERIKSAAN PERCUBAAN)</p>
                <div className="exb-booklet-divider" style={{ background: colour.bg }} />
                <p className="exb-booklet-subject">MATEMATIK</p>
                <p className="exb-booklet-kertas">{kertas}</p>
              </div>

              {/* Metadata */}
              <div className="exb-booklet-meta">
                <span className="exb-booklet-chip">{paper.year}</span>
                <span className="exb-booklet-chip">{time}</span>
              </div>

              {/* Footer */}
              <div className="exb-booklet-footer">
                SULIT — Untuk Kegunaan Aplikasi Sahaja
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </>
  );
}
