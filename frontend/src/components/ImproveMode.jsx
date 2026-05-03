import React, { useState } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram";

const SEV_COLOR = { critical:"#ef4444", high:"#f59e0b", medium:"#3b82f6", info:"#10b981" };

export default function ImproveMode({ onBack }) {
  const [activeTab, setActiveTab] = useState("issues");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    description: "",
    painPoints: "",
    techStack: "",
    currentScale: "medium",
    features: []
  });

  const set = (k,v) => setForm(p => ({...p,[k]:v}));


  const handleAnalyze = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/improve", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if(data.status==="success") {
        setResult(data);
      }
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const issues = result?.analysis?.issues || [];
  const improvements = result?.analysis?.improvements || [];
  const critCount = issues.filter(i=>i.severity==="critical").length;
  const highCount = issues.filter(i=>i.severity==="high").length;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-head">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="sidebar-logo">FIXY</span>
          <span className="sidebar-mode-badge improve-badge">Improve</span>
        </div>
        <div className="sidebar-body">
          <div className="section-label" style={{marginTop:"0.5rem"}}>Describe Your System</div>

          <div className="form-group">
            <label className="form-label">Current Architecture Description <span style={{color:"#ef4444"}}>*</span></label>
            <textarea className="input-g" rows={5}
              placeholder="e.g. We have a Node.js monolith on a single EC2 instance. MySQL as our database. No caching. All services are in the same codebase. Users hit the server directly..."
              value={form.description} onChange={e=>set("description",e.target.value)}/>
          </div>

          <div className="form-group">
            <label className="form-label">Pain Points & Bottlenecks</label>
            <textarea className="input-g" rows={3}
              placeholder="e.g. API latency is 2-3 seconds. DB gets slow under 500 concurrent users. We had 2 outages last month..."
              value={form.painPoints} onChange={e=>set("painPoints",e.target.value)}/>
          </div>

          <div className="form-group">
            <label className="form-label">Current Tech Stack</label>
            <textarea className="input-g" rows={2}
              placeholder="e.g. Node.js, MySQL, React, AWS EC2, no Redis, no queue..."
              value={form.techStack} onChange={e=>set("techStack",e.target.value)}/>
          </div>

          <div className="form-group">
            <label className="form-label">Current Scale</label>
            <select className="input-g" value={form.currentScale} onChange={e=>set("currentScale",e.target.value)}>
              <option value="startup">Startup (&lt;1,000 DAU)</option>
              <option value="small">Small (1K–50K DAU)</option>
              <option value="medium">Medium (50K–1M DAU)</option>
              <option value="large">Large (1M+ DAU)</option>
            </select>
          </div>

          {result && (
            <div style={{marginTop:"1rem",padding:"1rem",background:"rgba(239,68,68,0.07)",borderRadius:10,border:"1px solid rgba(239,68,68,0.2)"}}>
              <div style={{fontWeight:700,fontSize:"0.9rem",color:"#111",marginBottom:"0.5rem"}}>Audit Summary</div>
              <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                <div style={{fontSize:"0.82rem"}}><span style={{color:"#ef4444",fontWeight:700}}>{critCount}</span> Critical</div>
                <div style={{fontSize:"0.82rem"}}><span style={{color:"#f59e0b",fontWeight:700}}>{highCount}</span> High</div>
                <div style={{fontSize:"0.82rem"}}><span style={{color:"#3b82f6",fontWeight:700}}>{issues.length-critCount-highCount}</span> Medium</div>
              </div>
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <button className="btn-purple" onClick={handleAnalyze} disabled={loading||form.description.length<20}>
            {loading ? "Analyzing..." : "🔍 Analyze & Improve"}
          </button>
          {form.description.length < 20 && form.description.length > 0 && (
            <p style={{fontSize:"0.78rem",color:"#ef4444",marginTop:"0.5rem",textAlign:"center"}}>Please provide more detail about your architecture.</p>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        {result && (
          <div className="main-toolbar">
            <div className="toolbar-title">Architecture Audit — {issues.length} Issues Found</div>
            <button className={`toolbar-tab ${activeTab==="issues"?"active":""}`} onClick={()=>setActiveTab("issues")}>Issues ({issues.length})</button>
            <button className={`toolbar-tab ${activeTab==="improvements"?"active":""}`} onClick={()=>setActiveTab("improvements")}>Improvements</button>
            <button className={`toolbar-tab ${activeTab==="diagram"?"active":""}`} onClick={()=>setActiveTab("diagram")}>Improved HLD</button>
          </div>
        )}

        <div className="canvas-area">
          {/* EMPTY STATE */}
          {!result && (
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <div className="empty-title">Describe Your Existing Architecture</div>
              <div className="empty-desc">
                Tell Fixy about your current system — tech stack, architecture, and pain points.
                It will audit your system like a Staff Engineer and generate concrete improvements.
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",justifyContent:"center",maxWidth:400,marginTop:"1rem"}}>
                {["SPOF Detection","Bottleneck Analysis","Cache Strategy","DB Scaling","Resiliency Gaps","Observability Plan"].map(t=>(
                  <span key={t} style={{background:"#f3f4f6",borderRadius:20,padding:"4px 12px",fontSize:"0.8rem",color:"#6b7280"}}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* ISSUES TAB */}
          {result && activeTab==="issues" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"#fff"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Architecture Issues Found</h2>
              {issues.length===0 && <p style={{color:"#6b7280"}}>No major issues found. Your architecture looks solid!</p>}
              {issues.map((issue,i) => (
                <div key={i} style={{
                  border:"1px solid #e5e7eb", borderRadius:12, padding:"1.25rem",
                  marginBottom:"1rem", borderLeft:`4px solid ${SEV_COLOR[issue.severity]||"#6b7280"}`
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                    <span style={{background:SEV_COLOR[issue.severity]+"20",color:SEV_COLOR[issue.severity],padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700,textTransform:"uppercase"}}>
                      {issue.severity}
                    </span>
                    <span style={{background:"#f3f4f6",color:"#6b7280",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:600}}>
                      {issue.area}
                    </span>
                  </div>
                  <div style={{fontWeight:700,color:"#111",fontSize:"0.95rem",marginBottom:"0.5rem"}}>{issue.title}</div>
                  <div style={{fontSize:"0.88rem",color:"#6b7280",lineHeight:1.6,marginBottom:"0.75rem"}}>{issue.description}</div>
                  <div style={{fontSize:"0.85rem",color:"#1d4ed8",background:"#eff6ff",padding:"0.6rem 0.8rem",borderRadius:6}}>
                    💡 <strong>Fix:</strong> {issue.fix}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IMPROVEMENTS TAB */}
          {result && activeTab==="improvements" && (
            <div style={{height:"100%",overflowY:"auto",padding:"2rem",background:"#fff"}}>
              <h2 style={{marginBottom:"1.5rem",fontSize:"1.2rem",fontWeight:700}}>Improvement Roadmap</h2>
              {improvements.map((imp,i) => (
                <div key={i} style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#f9fafb",padding:"0.9rem 1.25rem",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <span style={{background:"#dcfce7",color:"#16a34a",padding:"2px 8px",borderRadius:4,fontSize:"0.72rem",fontWeight:700}}>{imp.area}</span>
                    <span style={{fontWeight:700,fontSize:"0.95rem"}}>{imp.title}</span>
                  </div>
                  <div style={{padding:"1rem 1.25rem"}}>
                    <ol style={{paddingLeft:"1.2rem",display:"flex",flexDirection:"column",gap:8}}>
                      {imp.steps.map((step,j) => (
                        <li key={j} style={{fontSize:"0.88rem",color:"#374151",lineHeight:1.6}}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IMPROVED HLD DIAGRAM TAB */}
          {result && activeTab==="diagram" && (
            <div style={{height:"100%",position:"relative"}}>
              <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:10,background:"rgba(22,27,34,0.95)",color:"#8b949e",padding:"6px 16px",borderRadius:20,border:"1px solid #30363d",fontSize:"0.82rem",fontWeight:500}}>
                Recommended Target Architecture
              </div>
              <ArchitectureDiagram
                architectureData={result.improvedGraph}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
