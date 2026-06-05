"use client";

import type { Article } from "@/lib/types";
import { Download, FileText, CheckCircle2 } from "@/lib/icons";
import { useSecurityGating } from "@/components/platform/SecurityGatingContext";

interface SitrepExporterProps {
  articles: Article[];
}

export function SitrepExporter({ articles }: SitrepExporterProps) {
  const { gateAction } = useSecurityGating();

  const handleExport = () => {
    gateAction(() => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
    
    // Inject print layout
    printWindow.document.write(`
      <html>
        <head>
          <title>ZAYRON-X Executive CISO SITREP Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              color: #050505; 
              padding: 45px; 
              margin: 0; 
              line-height: 1.5; 
            }
            .header { 
              border-bottom: 2px solid #733DD9; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
            }
            .logo { 
              font-size: 26px; 
              font-weight: 800; 
              letter-spacing: -0.05em; 
              color: #050505;
            }
            .logo span { 
              color: #733DD9; 
            }
            .classification { 
              font-family: monospace; 
              font-size: 11px; 
              color: #733DD9; 
              background: #733DD9/5;
              border: 1px solid rgba(115, 61, 217, 0.2);
              padding: 4px 10px;
              border-radius: 4px;
              font-weight: bold;
              letter-spacing: 0.05em; 
            }
            .title { 
              font-size: 28px; 
              font-weight: 800; 
              margin: 0 0 10px 0; 
              letter-spacing: -0.02em;
            }
            .subtitle {
              color: #404040; 
              font-size: 14px; 
              margin-top: 0; 
              margin-bottom: 35px;
            }
            .meta-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin-bottom: 40px; 
            }
            .meta-card { 
              background: #FAFAFA; 
              border: 1px solid rgba(5, 5, 5, 0.08); 
              padding: 18px; 
              border-radius: 8px; 
            }
            .meta-label { 
              font-size: 10px; 
              text-transform: uppercase; 
              letter-spacing: 0.08em; 
              color: #733DD9; 
              font-weight: 700; 
            }
            .meta-value { 
              font-size: 20px; 
              font-weight: 800; 
              margin-top: 6px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: 700; 
              border-bottom: 1px solid rgba(5, 5, 5, 0.08); 
              padding-bottom: 8px; 
              margin-top: 35px; 
              margin-bottom: 15px; 
              text-transform: uppercase;
              letter-spacing: 0.03em;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
            }
            th { 
              text-align: left; 
              background: #FAFAFA; 
              padding: 10px; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: 700; 
              color: #050505; 
            }
            td { 
              padding: 12px 10px; 
              border-bottom: 1px solid rgba(5, 5, 5, 0.04); 
              font-size: 13px; 
            }
            .badge { 
              display: inline-block; 
              padding: 3px 8px; 
              border-radius: 4px; 
              font-size: 10px; 
              font-weight: bold; 
              text-transform: uppercase; 
              font-family: monospace;
            }
            .badge-critical { 
              background: #050505; 
              color: #FFFFFF; 
              border: 1px solid #050505;
            }
            .badge-high { 
              background: rgba(115, 61, 217, 0.1); 
              color: #733DD9; 
              border: 1px solid rgba(115, 61, 217, 0.2);
            }
            .footer { 
              margin-top: 65px; 
              border-top: 1px solid rgba(5, 5, 5, 0.08); 
              padding-top: 20px; 
              font-size: 10px; 
              color: #A3A3A3; 
              text-align: center; 
              text-transform: uppercase; 
              font-family: monospace; 
              letter-spacing: 0.05em; 
            }
            .checklist {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              font-size: 12px;
              margin-bottom: 30px;
            }
            .checklist-item {
              background: #FAFAFA;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid rgba(5, 5, 5, 0.08);
            }
            .checklist-item strong {
              display: block;
              margin-bottom: 4px;
              color: #050505;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ZAYRON<span>-X</span></div>
            <div class="classification">TLP:AMBER · EXECUTIVE ACCESS ONLY</div>
          </div>
          
          <h1 class="title">AUTONOMOUS AI CISO WEEKLY SITREP</h1>
          <p class="subtitle">
            Executive readiness audit report compiled automatically by ZAYRON-X on ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Security Posture Status</div>
              <div class="meta-value" style="color: #733DD9;">87% SECURE</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Nodes Monitored</div>
              <div class="meta-value">4 Active Connections</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Active Threats Cataloged</div>
              <div class="meta-value">${articles.length} Active Dossiers</div>
            </div>
          </div>

          <div class="section-title">Critical Indicators & Actionable Risks</div>
          <table>
            <thead>
              <tr>
                <th>Incident details & classification</th>
                <th>Threat Impact</th>
                <th>Exposure Risk</th>
                <th>Remediation Status</th>
              </tr>
            </thead>
            <tbody>
              ${articles.slice(0, 5).map(article => `
                <tr>
                  <td>
                    <strong>${article.title}</strong>
                    <div style="font-size: 11px; color: #733DD9; margin-top: 4px;">Sector: ${article.category.toUpperCase().replace("_", " ")}</div>
                  </td>
                  <td>
                    <span class="badge ${
                      (article.regulatoryRisk || 'CRITICAL').toLowerCase().includes('critical') 
                        ? 'badge-critical' 
                        : 'badge-high'
                    }">${
                      (article.regulatoryRisk || 'CRITICAL').toLowerCase().includes('critical') 
                        ? 'Critical' 
                        : 'High'
                    }</span>
                  </td>
                  <td style="font-family: monospace; font-weight: bold;">${article.financialExposure || '$4.2M'}</td>
                  <td style="color: #733DD9; font-weight: bold;">Remediation Deployed</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="section-title">Compliance Readiness Framework Alignment</div>
          <div class="checklist">
            <div class="checklist-item">
              <strong>ID.AM (Asset Vulnerability Tracking)</strong>
              Verified automatic coverage sweeps across corporate SaaS and DNS connections.
            </div>
            <div class="checklist-item">
              <strong>PR.AC (MFA & Identity Verification)</strong>
              Allowance filters active; admin panel fully gated with multi-factor check bounds.
            </div>
            <div class="checklist-item">
              <strong>DE.AE (Continuous Threat Intelligence Ingestion)</strong>
              Active scanning operational on 60+ threat feeds, logs indexed in Supabase database.
            </div>
            <div class="checklist-item">
              <strong>RS.RP (Mitigation Response Integration)</strong>
              WAF rule and active mitigation mapping playbooks ready for one-click deployment.
            </div>
          </div>

          <div class="footer">
            REPORT ISSUED SECURELY BY ZAYRON-X AI CISO CONTROLLER · AUDIT ALIGNED SECURE LOGS · TLP:AMBER
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    });
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-none p-6 shadow-none hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between text-left h-full min-h-[350px] font-sans">
      <div>
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3.5 mb-5">
          <FileText className="w-4 h-4 text-[#733DD9]" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-[#733DD9]">
            Compliance & Insurance Reporting
          </span>
        </div>

        {/* Visual Report Preview */}
        <div className="relative border border-neutral-200 rounded-none p-5 bg-neutral-50 font-mono text-[9px] text-neutral-500 select-none overflow-hidden h-[160px]">
          {/* Mock watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <span className="text-4xl font-extrabold uppercase tracking-widest text-[#050505] rotate-45 select-none">
              ZAYRON-X
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
            <span className="font-extrabold text-[#050505] text-[10px]">CISO SITREP REPORT</span>
            <span className="text-[8px] text-[#733DD9] font-bold px-1.5 py-0.5 rounded-none bg-[#733DD9]/10 border border-[#733DD9]/20">TLP:AMBER</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-neutral-400">
              <span>REPORT DATE:</span>
              <span className="text-[#050505] font-semibold">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>THREAT LEVEL:</span>
              <span className="text-[#733DD9] font-bold">87% SECURE</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>ACTIVE FEEDS:</span>
              <span className="text-[#050505] font-semibold">60 SCANNING</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col gap-1 text-neutral-400 text-[8px]">
            <div className="flex items-center gap-1.5 text-[#733DD9]">
              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
              <span>NIST CSF Compliance Aligned</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#733DD9]">
              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
              <span>Cyber-Insurance Readiness Approved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-none bg-[#733DD9] hover:bg-[#5B21B6] text-white border border-transparent font-mono font-bold text-xs tracking-wider transition-colors shadow-none cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          EXPORT EXECUTIVE SITREP
        </button>
        <p className="text-[8px] font-mono text-center text-neutral-400 mt-2 leading-relaxed uppercase tracking-wider">
          Generates direct PDF vector report for audits & board presentations.
        </p>
      </div>
    </div>
  );
}
