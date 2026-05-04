import React, { useState, useRef, useEffect } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidChart = ({ chart }) => {
  const [svgContent, setSvgContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }) => {
          setSvgContent(svg);
          setError("");
        }).catch(e => {
          setError(e.message);
        });
    }
  }, [chart]);

  if (error) return <div style={{ color:"red", fontSize:"0.8rem", background:"#111827", padding:"1rem", borderRadius:"8px" }}>{error}</div>;

  return (
    <div 
      className="mermaid-container" 
      style={{ background:"#111827", padding:"1rem", borderRadius:"8px", border:"1px solid #374151", overflowX:"auto" }}
      dangerouslySetInnerHTML={{ __html: svgContent }} 
    />
  );
};

const SEV_COLOR = { critical:"#ef4444", high:"#f59e0b", medium:"#3b82f6", info:"#10b981" };

export default function ImproveMode({ onBack }) {
  const [section, setSection] = useState("hld"); // "hld" or "lld"
  const [activeTab, setActiveTab] = useState("issues");
  const [loading, setLoading] = useState(false);

  // HLD state
  const [hldFile, setHldFile] = useState(null);
  const [hldResult, setHldResult] = useState(null);
  const [hldForm, setHldForm] = useState({
    existingHLD: "",
    improvementsWanted: "",
    techStack: "",
    currentScale: "medium"
  });

  // LLD / Code Review state
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [codeResult, setCodeResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const setHld = (k,v) => setHldForm(p => ({...p,[k]:v}));
  const fileRef = useRef(null);

  // ── HLD File Upload ──
  const handleFileUpload = async () => {
    if (!hldFile) return;
    setLoading(true); setHldResult(null);
    const fd = new FormData();
    fd.append("hldFile", hldFile);
    fd.append("improvementsWanted", hldForm.improvementsWanted);
    fd.append("currentScale", hldForm.currentScale);
    fd.append("techStack", hldForm.techStack);
    fd.append("existingHLD", hldForm.existingHLD);
    try {
      const res = await fetch("http://localhost:5000/api/hld-analyze", { method:"POST", body: fd });
      const data = await res.json();
      if (data.status === "success") { setHldResult(data); setActiveTab("issues"); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // ── HLD Text-only Analysis ──
  const handleTextAnalyze = async () => {
    if (hldForm.existingHLD.length < 10) return;
    setLoading(true); setHldResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/improve", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(hldForm)
      });
      const data = await res.json();
      if (data.status === "success") { setHldResult(data); setActiveTab("issues"); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // ── Code Review ──
  const handleCodeReview = async () => {
    if (!repoUrl) return;
    setLoading(true); setCodeResult(null); setErrorMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/code-review", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ 
          repoUrl, 
          githubToken,
          jobId: `job_${Date.now()}` 
        })
      });
      const data = await res.json();
      if (data.status === "success") { 
        setCodeResult(data); setActiveTab("codeIssues"); 
      } else {
        setErrorMessage(data.message || "Failed to analyze repository.");
      }
    } catch(e) { 
      setErrorMessage(e.message || "Network error. Make sure the backend is running.");
      console.error(e); 
    }
    setLoading(false);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const issues = hldResult?.analysis?.issues || [];
  const improvements = hldResult?.analysis?.improvements || [];
  const review = codeResult?.review || {};

  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-head">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="sidebar-logo">FIXY</span>
          <span className="sidebar-mode-badge improve-badge">Audit</span>
        </div>
        <div className="sidebar-body" style={{background: "var(--bg-panel)"}}>

          {/* Section Toggle */}
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}>
            <button onClick={()=>setSection("hld")} style={{
              flex:1,padding:"0.6rem",borderRadius:8,border: section==="hld" ? "2px solid #8b5cf6" : "1px solid #e5e7eb",
              background: section==="hld" ? "rgba(139,92,246,0.08)" : "#fff",
              fontWeight:700,fontSize:"0.82rem",cursor:"pointer",color: section==="hld" ? "#8b5cf6" : "#6b7280"
            }}>HLD Audit</button>
            <button onClick={()=>setSection("lld")} style={{
              flex:1,padding:"0.6rem",borderRadius:8,border: section==="lld" ? "2px solid #10b981" : "1px solid #e5e7eb",
              background: section==="lld" ? "rgba(16,185,129,0.08)" : "#fff",
              fontWeight:700,fontSize:"0.82rem",cursor:"pointer",color: section==="lld" ? "#10b981" : "#6b7280"
            }}>LLD Review</button>
          </div>

          {/* ═══ HLD Section ═══ */}
          {section === "hld" && (<>
            <div className="section-label" style={{marginTop:"0.25rem"}}>Upload or Describe Your HLD</div>

            <div className="form-group">
              <label className="form-label">Upload HLD (PDF / Image)</label>
              <div onClick={()=>fileRef.current?.click()} style={{
                border:"2px dashed #d1d5db",borderRadius:10,padding:"1.2rem",textAlign:"center",cursor:"pointer",
                background: hldFile ? "rgba(139,92,246,0.05)" : "#fafafa",transition:"all 0.2s"
              }}>
                {hldFile ? (
                  <div style={{fontSize:"0.85rem",color:"#8b5cf6",fontWeight:600}}>
                    {hldFile.name} <span style={{color:"#9ca3af",fontWeight:400}}>({(hldFile.size/1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div style={{color:"#9ca3af",fontSize:"0.85rem"}}>
                    <div style={{marginBottom:"0.25rem"}}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto"}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    Click to upload PDF or Image
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden
                  onChange={e => setHldFile(e.target.files[0])} />
              </div>
            </div>

            <div style={{textAlign:"center",color:"#9ca3af",fontSize:"0.78rem",margin:"0.25rem 0"}}>— or describe it below —</div>

            <div className="form-group">
              <label className="form-label">Describe Existing HLD</label>
              <textarea className="input-g" rows={3}
                placeholder="e.g. Monolithic Node.js on EC2, MySQL, no caching..."
                value={hldForm.existingHLD} onChange={e=>setHld("existingHLD",e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">What to improve?</label>
              <textarea className="input-g" rows={2}
                placeholder="e.g. Scale to 1M DAU, reduce latency, add HA..."
                value={hldForm.improvementsWanted} onChange={e=>setHld("improvementsWanted",e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Current Tech Stack</label>
              <input className="input-g" placeholder="e.g. Node.js, MySQL, AWS EC2..."
                value={hldForm.techStack} onChange={e=>setHld("techStack",e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Target Scale</label>
              <select className="input-g" value={hldForm.currentScale} onChange={e=>setHld("currentScale",e.target.value)}>
                <option value="startup">Startup (&lt;1K DAU)</option>
                <option value="small">Small (1K–50K DAU)</option>
                <option value="medium">Medium (50K–1M DAU)</option>
                <option value="large">Large (1M+ DAU)</option>
              </select>
            </div>
          </>)}

          {/* ═══ LLD / Code Review Section ═══ */}
          {section === "lld" && (<>
            <div className="section-label" style={{marginTop:"0.25rem"}}>GitHub Code Review</div>
            <div style={{fontSize:"0.82rem",color:"#6b7280",marginBottom:"0.75rem",lineHeight:1.5}}>
              Paste your GitHub repo URL. Fixy will crawl the codebase, detect anti-patterns,
              and suggest design patterns, scalability fixes, and readability improvements.
            </div>

            <div className="form-group">
              <label className="form-label">GitHub Repository URL <span style={{color:"#ef4444"}}>*</span></label>
              <input className="input-g" placeholder="https://github.com/owner/repo"
                value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">GitHub Access Token <span style={{color:"#9ca3af"}}>(Optional, for rate limits)</span></label>
              <input type="password" className="input-g" placeholder="ghp_xxxxxxxxxxxx"
                value={githubToken} onChange={e=>setGithubToken(e.target.value)} />
              <div style={{fontSize:"0.72rem",color:"#6b7280",marginTop:"0.4rem"}}>
                Needed if the repo is very large or if you hit GitHub's unauthenticated API rate limits.
              </div>
            </div>

            {errorMessage && (
              <div style={{padding:"0.75rem",background:"rgba(239,68,68,0.1)",borderRadius:10,border:"1px solid rgba(239,68,68,0.2)",marginTop:"0.5rem", color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {errorMessage}
              </div>
            )}

            {codeResult && (
              <div style={{padding:"0.75rem",background: review.summary?.healthScore < 50 ? "rgba(239,68,68,0.07)" : review.summary?.healthScore < 80 ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.07)",borderRadius:10,border:`1px solid ${review.summary?.healthScore < 50 ? "rgba(239,68,68,0.2)" : review.summary?.healthScore < 80 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,marginTop:"0.5rem"}}>
                <div style={{fontWeight:700,fontSize:"0.85rem",color:"#111",marginBottom:"0.4rem", display: "flex", justifyContent: "space-between"}}>
                  <span>Scan Complete</span>
                  <span style={{color: review.summary?.healthScore < 50 ? "#ef4444" : review.summary?.healthScore < 80 ? "#f59e0b" : "#10b981"}}>
                    Health Score: {review.summary?.healthScore}/100
                  </span>
                </div>
                <div style={{fontSize:"0.82rem",color:"#374151"}}>
                  {codeResult.repo?.filesCrawled || 0} files scanned ·{" "}
                  <span style={{color:"#ef4444",fontWeight:700}}>{review.summary?.criticalCount || 0}</span> critical ·{" "}
                  <span style={{color:"#f59e0b",fontWeight:700}}>{review.summary?.highCount || 0}</span> high
                </div>
              </div>
            )}
          </>)}
        </div>

        {/* Footer Button */}
        <div className="sidebar-footer">
          {section === "hld" ? (
            <button className="btn-purple" disabled={loading || (!hldFile && hldForm.existingHLD.length < 10)}
              onClick={hldFile ? handleFileUpload : handleTextAnalyze}>
              {loading ? "Analyzing..." : hldFile ? "Analyze Uploaded HLD" : "Analyze & Build New HLD"}
            </button>
          ) : (
            <button className="btn-purple" disabled={loading || !repoUrl}
              onClick={handleCodeReview}>
              {loading ? "Crawling Repo..." : "Run Code Review"}
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="main">
        {/* Toolbar */}
        {(hldResult || codeResult) && (
          <div className="main-toolbar">
            {section === "hld" && hldResult && (<>
              <div className="toolbar-title">Architecture Audit & Target HLD</div>
              <button className={`toolbar-tab ${activeTab==="issues"?"active":""}`} onClick={()=>setActiveTab("issues")}>Audit ({issues.length})</button>
              <button className={`toolbar-tab ${activeTab==="improvements"?"active":""}`} onClick={()=>setActiveTab("improvements")}>Roadmap</button>
              <button className={`toolbar-tab ${activeTab==="diagram"?"active":""}`} onClick={()=>setActiveTab("diagram")}>Target HLD</button>
            </>)}
            {section === "lld" && codeResult && (<>
              <div className="toolbar-title">Code Review — {codeResult.repo?.owner}/{codeResult.repo?.repo}</div>
              <button className={`toolbar-tab ${activeTab==="security"?"active":""}`} onClick={()=>setActiveTab("security")}>Security ({review.security?.length||0})</button>
              <button className={`toolbar-tab ${activeTab==="codeIssues"?"active":""}`} onClick={()=>setActiveTab("codeIssues")}>Arch Issues ({review.issues?.length||0})</button>
              <button className={`toolbar-tab ${activeTab==="patterns"?"active":""}`} onClick={()=>setActiveTab("patterns")}>Design Patterns</button>
              <button className={`toolbar-tab ${activeTab==="scale"?"active":""}`} onClick={()=>setActiveTab("scale")}>Scalability</button>
              <button className={`toolbar-tab ${activeTab==="readable"?"active":""}`} onClick={()=>setActiveTab("readable")}>Readability</button>
              <button className={`toolbar-tab ${activeTab==="complexity"?"active":""}`} onClick={()=>setActiveTab("complexity")}>Complexity</button>
              <button className={`toolbar-tab ${activeTab==="archMap"?"active":""}`} onClick={()=>setActiveTab("archMap")}>Arch Map</button>
            </>)}
            <div style={{flex: 1}}></div>
            <button id="export-pdf-btn" onClick={handleDownloadPdf} style={{
              background: "transparent", border: "1px solid var(--border)", color: "var(--text)", 
              padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, 
              cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export PDF
            </button>
          </div>
        )}

        <div id="pdf-export-area" className="canvas-area">
          {/* Empty states */}
          {!hldResult && section==="hld" && (
            <div className="empty-state">
              <div className="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>
              <div className="empty-title">Upload or Describe Your Architecture</div>
              <div className="empty-desc">Upload a PDF/image of your current HLD, or describe it in text. Fixy will audit it and generate an improved target architecture.</div>
            </div>
          )}
          {!codeResult && section==="lld" && (
            <div className="empty-state">
              <div className="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
              <div className="empty-title">Paste a GitHub Repo URL</div>
              <div className="empty-desc">Fixy will crawl your entire codebase, detect anti-patterns, and suggest design patterns, scalability fixes, and readability improvements.</div>
            </div>
          )}

          {/* ═══ HLD TABS ═══ */}
          {hldResult && activeTab==="issues" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"#fff"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Architecture Issues Found</h2>
              {issues.length===0 && <p style={{color:"#6b7280"}}>No major issues detected!</p>}
              {issues.map((issue,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"1.25rem",marginBottom:"1rem",borderLeft:`4px solid ${SEV_COLOR[issue.severity]||"#6b7280"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                    <span style={{background:SEV_COLOR[issue.severity]+"20",color:SEV_COLOR[issue.severity],padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase"}}>{issue.severity}</span>
                    <span style={{background:"#f3f4f6",color:"#6b7280",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:600}}>{issue.area}</span>
                  </div>
                  <div style={{fontWeight:700,color:"#111",fontSize:"0.95rem",marginBottom:"0.5rem"}}>{issue.title}</div>
                  <div style={{fontSize:"0.88rem",color:"#6b7280",lineHeight:1.6,marginBottom:"0.75rem"}}>{issue.description}</div>
                  <div style={{fontSize:"0.85rem",color:"#1d4ed8",background:"#eff6ff",padding:"0.6rem 0.8rem",borderRadius:6}}><strong>Fix:</strong> {issue.fix}</div>
                </div>
              ))}
            </div>
          )}

          {hldResult && activeTab==="improvements" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"#fff"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Improvement Roadmap</h2>
              {improvements.map((imp,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#f9fafb",padding:"0.9rem 1.25rem",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <span style={{background:"#dcfce7",color:"#16a34a",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700}}>{imp.area}</span>
                    <span style={{fontWeight:700,fontSize:"0.95rem"}}>{imp.title}</span>
                  </div>
                  <div style={{padding:"1rem 1.25rem"}}>
                    <ol style={{paddingLeft:"1.2rem",display:"flex",flexDirection:"column",gap:8}}>
                      {imp.steps.map((step,j)=>(<li key={j} style={{fontSize:"0.88rem",color:"#374151",lineHeight:1.6}}>{step}</li>))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hldResult && activeTab==="diagram" && (
            <div style={{height:"100%",position:"relative"}}>
              <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:10,background:"rgba(22,27,34,0.95)",color:"#8b949e",padding:"6px 16px",borderRadius:20,border:"1px solid #30363d",fontSize:"0.82rem",fontWeight:500}}>Recommended Target Architecture</div>
              <ArchitectureDiagram architectureData={hldResult.improvedGraph} />
            </div>
          )}

          {/* ═══ CODE REVIEW TABS ═══ */}
          {codeResult && activeTab==="security" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"#fff"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Security Vulnerabilities</h2>
              {(review.security||[]).length === 0 && <p style={{color:"#6b7280"}}>No major security issues detected!</p>}
              {(review.security||[]).map((sec,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"1.25rem",marginBottom:"1rem",borderLeft:`4px solid ${SEV_COLOR[sec.severity]||"#6b7280"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                    <span style={{background:SEV_COLOR[sec.severity]+"20",color:SEV_COLOR[sec.severity],padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase"}}>{sec.severity}</span>
                    <span style={{background:"#f3f4f6",color:"#6b7280",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:600}}>{sec.area}</span>
                  </div>
                  <div style={{fontWeight:700,color:"#111",fontSize:"0.95rem",marginBottom:"0.5rem"}}>{sec.title}</div>
                  <div style={{fontSize:"0.88rem",color:"#6b7280",lineHeight:1.6,marginBottom:"0.5rem"}}>{sec.description}</div>
                  <div style={{fontSize:"0.85rem",color:"#1d4ed8",background:"#eff6ff",padding:"0.6rem 0.8rem",borderRadius:6}}><strong>Fix:</strong> {sec.fix}</div>
                </div>
              ))}
            </div>
          )}

          {codeResult && activeTab==="codeIssues" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"var(--bg)"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Architecture Issues — {review.summary?.totalFiles} files · {review.summary?.totalLines?.toLocaleString()} lines</h2>
              {(review.issues||[]).map((issue,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"1.25rem",marginBottom:"1rem",borderLeft:`4px solid ${SEV_COLOR[issue.severity]||"#6b7280"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                    <span style={{background:SEV_COLOR[issue.severity]+"20",color:SEV_COLOR[issue.severity],padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase"}}>{issue.severity}</span>
                    <span style={{background:"#f3f4f6",color:"#6b7280",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:600}}>{issue.area}</span>
                  </div>
                  <div style={{fontWeight:700,color:"#111",fontSize:"0.95rem",marginBottom:"0.5rem"}}>{issue.title}</div>
                  <div style={{fontSize:"0.88rem",color:"#6b7280",lineHeight:1.6,marginBottom:"0.5rem"}}>{issue.description}</div>
                  {issue.files && issue.files.length > 0 && (
                    <div style={{marginBottom:"0.5rem"}}>
                      {issue.files.map((f,fi)=>(<div key={fi} style={{fontSize:"0.78rem",color:"#9ca3af",fontFamily:"monospace"}}>• {f}</div>))}
                    </div>
                  )}
                  <div style={{fontSize:"0.85rem",color:"#1d4ed8",background:"#eff6ff",padding:"0.6rem 0.8rem",borderRadius:6}}><strong>Fix:</strong> {issue.fix}</div>
                </div>
              ))}
            </div>
          )}

          {codeResult && activeTab==="patterns" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"var(--bg)"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Recommended Design Patterns</h2>
              {(review.patterns||[]).map((p,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#f9fafb",padding:"0.9rem 1.25rem",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <span style={{background:"#dbeafe",color:"#2563eb",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700}}>{p.pattern.category}</span>
                    <span style={{fontWeight:700,fontSize:"0.95rem"}}>{p.pattern.name}</span>
                  </div>
                  <div style={{padding:"1rem 1.25rem"}}>
                    <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.75rem"}}>{p.pattern.description}</div>
                    <div style={{fontSize:"0.85rem",color:"#374151",fontWeight:600,marginBottom:"0.5rem"}}>Why for your codebase:</div>
                    <div style={{fontSize:"0.85rem",color:"#374151",lineHeight:1.6,marginBottom:"0.75rem"}}>{p.reason}</div>
                    {p.example && (
                      <pre style={{background:"#111827",color:"#e5e7eb",padding:"1rem",borderRadius:8,fontSize:"0.75rem",fontFamily:"'JetBrains Mono',monospace",overflowX:"auto",border:"1px solid #374151"}}><code>{p.example}</code></pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {codeResult && activeTab==="scale" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"var(--bg)"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Scalability Recommendations</h2>
              {(review.scalability||[]).map((s,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:"1.25rem",marginBottom:"1rem"}}>
                  <div style={{fontWeight:700,color:"#111",fontSize:"0.95rem",marginBottom:"0.5rem"}}>{s.area}</div>
                  <div style={{fontSize:"0.85rem",color:"#dc2626",marginBottom:"0.5rem"}}>Issue: {s.issue}</div>
                  <div style={{fontSize:"0.85rem",color:"#1d4ed8",background:"#eff6ff",padding:"0.6rem 0.8rem",borderRadius:6}}>Recommendation: {s.fix}</div>
                </div>
              ))}
            </div>
          )}

          {codeResult && activeTab==="readable" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"var(--bg)"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Readability Improvements</h2>
              {(review.readability||[]).map((r,i)=>(
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#f9fafb",padding:"0.9rem 1.25rem",borderBottom:"1px solid #e5e7eb",fontWeight:700,fontSize:"0.95rem"}}>{r.title}</div>
                  <div style={{padding:"1rem 1.25rem"}}>
                    <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.75rem"}}>{r.description}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                      <div>
                        <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",color:"#ef4444",marginBottom:"0.4rem"}}>Before</div>
                        <pre style={{background:"#fef2f2",color:"#991b1b",padding:"0.75rem",borderRadius:6,fontSize:"0.75rem",fontFamily:"monospace",whiteSpace:"pre-wrap"}}>{r.before}</pre>
                      </div>
                      <div>
                        <div style={{fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase",color:"#16a34a",marginBottom:"0.4rem"}}>After</div>
                        <pre style={{background:"#f0fdf4",color:"#166534",padding:"0.75rem",borderRadius:6,fontSize:"0.75rem",fontFamily:"monospace",whiteSpace:"pre-wrap"}}>{r.after}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {codeResult && activeTab==="complexity" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"var(--bg)"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>High Complexity Files (Needs Refactoring)</h2>
              <div style={{fontSize:"0.88rem",color:"var(--muted)",marginBottom:"1.5rem"}}>These files have the highest cyclomatic complexity (too many if/else branches, loops, and conditions). Consider refactoring them into smaller, more focused modules.</div>
              <div style={{border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden", background: "var(--bg-card)"}}>
                {(review.complexity||[]).map((f,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems: "center", padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)",fontSize:"0.85rem"}}>
                    <div>
                      <div style={{fontFamily:"'JetBrains Mono', monospace",color:"var(--text)", fontWeight: 600}}>{f.path}</div>
                      <div style={{color:"var(--muted)", fontSize: "0.75rem", marginTop: "0.3rem"}}>{f.lines} lines · {f.functions} functions · {f.imports} imports</div>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                      <span style={{color: f.complexityScore > 50 ? "#ef4444" : f.complexityScore > 20 ? "#f59e0b" : "#10b981", fontWeight: 700, fontSize: "1.1rem"}}>{f.complexityScore}</span>
                      <span style={{color:"#6b7280", fontSize: "0.75rem"}}>score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {codeResult && activeTab==="archMap" && (
            <div style={{height:"100%",position:"relative", background:"var(--bg)"}}>
              <div style={{position:"absolute",top:16,left:"50%",transform:"translateX(-50%)",zIndex:10,background:"var(--bg-card)",color:"var(--text)",padding:"8px 20px",borderRadius:24,border:"1px solid var(--border)",fontSize:"0.82rem",fontWeight:500,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
                Internal Module Dependency Map
              </div>
              {review.mermaidGraph ? (
                <div style={{width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center"}}>
                   <MermaidChart chart={review.mermaidGraph} />
                </div>
              ) : (
                <div style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",color:"#6b7280",flexDirection:"column"}}>
                  <div style={{marginBottom:"1rem"}}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  </div>
                  <div>No internal dependencies found to map.</div>
                  <div style={{fontSize:"0.8rem",marginTop:"0.5rem"}}>This typically happens if files don't import each other or use unrecognized import paths.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
