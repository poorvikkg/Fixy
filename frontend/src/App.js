import React, { useState } from "react";
import BuildMode from "./components/BuildMode";
import ImproveMode from "./components/ImproveMode";
import "./index.css";

export default function App() {
  const [mode, setMode] = useState(null); // null = landing, "build" | "improve"

  if (!mode) {
    return (
      <div className="landing">
        <div className="brand">
          <div className="brand-eyebrow">
            <div className="brand-eyebrow-dot" />
            AI-Powered System Design
          </div>
          <div className="brand-logo">FIXY</div>
          <p className="brand-tagline">
            Production-grade architecture engine for engineers and businesses.
            Design systems the way Staff Engineers at FAANG do.
          </p>
        </div>

        <div className="mode-cards">
          {/* BUILD FROM SCRATCH */}
          <div className="mode-card build" onClick={() => setMode("build")}>
            <div className="mode-icon-wrapper">🏗️</div>
            <div>
              <div className="mode-subtitle">Mode 01</div>
              <div className="mode-title">Build from Scratch</div>
            </div>
            <p className="mode-desc">
              Starting a new product? Describe your requirements and Fixy
              generates a complete, production-ready HLD + LLD — the way
              a Staff Engineer at Google or Meta would design it.
            </p>
            <div className="mode-pills">
              {["HLD Diagram","LLD Components","Data Models","Scaling","API Design","Queue Design"].map(p => (
                <span className="pill" key={p}>{p}</span>
              ))}
            </div>
            <div className="mode-cta">
              Start Building
              <div className="mode-cta-arrow">→</div>
            </div>
          </div>

          {/* IMPROVE EXISTING */}
          <div className="mode-card improve" onClick={() => setMode("improve")}>
            <div className="mode-icon-wrapper">🔧</div>
            <div>
              <div className="mode-subtitle">Mode 02</div>
              <div className="mode-title">Improve Existing</div>
            </div>
            <p className="mode-desc">
              Already running a system but facing bottlenecks? Describe your
              current architecture and get a full audit with concrete,
              actionable improvement recommendations.
            </p>
            <div className="mode-pills">
              {["SPOF Detection","Bottleneck Audit","Scale Gaps","DB Review","Resiliency","Cost Savings"].map(p => (
                <span className="pill" key={p}>{p}</span>
              ))}
            </div>
            <div className="mode-cta">
              Start Improving
              <div className="mode-cta-arrow">→</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "build") {
    return <BuildMode onBack={() => setMode(null)} />;
  }

  return <ImproveMode onBack={() => setMode(null)} />;
}