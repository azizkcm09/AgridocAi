'use client';

export default function AuthBrandingPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-3/5 flex-col justify-center items-center overflow-hidden">

      <img
        src="/auth-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-slate-900/60" />

      <div className="relative z-10 max-w-lg px-10">

        <div className="flex items-center gap-3 mb-6">
          <img src="/logo.png" alt="" className="w-11 h-11" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AgriDoc</h1>
            <p className="text-sm text-white/50">Document Intelligence Platform</p>
          </div>
        </div>

        <p className="text-white font-semibold text-base leading-relaxed mb-8">
          Streamline your agrifood supply chain with intelligent document extraction, compliance tracking, and automated reporting.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/10">
              <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Automated OCR Extraction</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/10">
              <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Supply Chain Compliance</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/10">
              <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Analytics & Reporting</p>
          </div>
        </div>
      </div>
    </div>
  );
}
