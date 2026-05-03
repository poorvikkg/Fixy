import React, { useState } from "react";
import BuildMode from "./components/BuildMode";
import ImproveMode from "./components/ImproveMode";
import "./index.css";

export default function App() {
  const [mode, setMode] = useState(null); // null = landing, "build" | "improve"

  if (!mode) {
    return (
      <div className="landing">
        <header className="landing-header">
          <div className="landing-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Fixy
          </div>
        </header>

        <div className="hero-section">
          <h1 className="hero-title">Architecting systems at scale.</h1>
          <p className="hero-subtitle">
            The production-grade engine for Staff Engineers and Founders. Generate, audit, and scale high-availability architectures in seconds.
          </p>
        </div>

        <div className="feature-grid">
          {/* BUILD FROM SCRATCH */}
          <div className="feature-card" onClick={() => setMode("build")}>
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              </div>
              <h2>Design Architecture</h2>
            </div>
            <p className="feature-card-desc">
              Define product requirements and operational constraints. Fixy synthesizes FAANG-grade HLDs, component LLDs, and infrastructure primitives.
            </p>
            <div className="feature-card-footer">
              <span>Initialize Workspace</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>

          {/* IMPROVE EXISTING */}
          <div className="feature-card" onClick={() => setMode("improve")}>
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h2>Audit & Scale</h2>
            </div>
            <p className="feature-card-desc">
              Input your existing stack and bottlenecks. Fixy performs a critical diagnostic audit, surfacing SPOFs and generating a target state blueprint.
            </p>
            <div className="feature-card-footer">
              <span>Run Diagnostic</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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