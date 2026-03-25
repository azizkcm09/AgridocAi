'use client';

export default function AuthBrandingPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-3/5 flex-col justify-center items-center overflow-hidden">

      {/* Background image — covers the entire panel */}
      <img
        src="/auth-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay — makes text readable on top of the photo.
          Goes from transparent at top to dark green at bottom where the text sits. */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content — pinned to the bottom with padding */}
      <div className="relative z-10 max-w-lg px-10">

        {/* Logo icon */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18c-3 0-5-2.5-5-6 3 0 5 2.5 5 6z" fill="currentColor" opacity="0.3" />
              <path d="M12 18c3 0 5-2.5 5-6-3 0-5 2.5-5 6z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AgriDoc AI</h1>
            <p className="text-sm text-white/60">Intelligent document management</p>
          </div>
        </div>

        <p className="text-white/80 text-base leading-relaxed mb-8">
          Streamline your agrifood supply chain with AI-powered document extraction, compliance tracking, and smart reporting.
        </p>

        {/* Feature bullets */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/80">AI-Powered OCR Extraction</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm text-white/80">Supply Chain Compliance</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-sm text-white/80">Smart Document Templates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
