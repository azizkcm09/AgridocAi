'use client';

export default function AuthBrandingPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-3/5 flex-col justify-center items-center overflow-hidden bg-gradient-to-br from-emerald-700 via-green-800 to-emerald-900 dark:from-emerald-950 dark:via-gray-900 dark:to-gray-950">

      {/* Leaf pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 10c-8 0-15 8-15 20s7 20 15 20c8 0 15-8 15-20S38 10 30 10z' fill='%23fff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating leaf 1 */}
      <svg className="absolute top-[15%] left-[12%] w-10 h-10 text-emerald-400/20 animate-float" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66c.95-2.3 2.22-4.9 4.02-6.76 2.02-2.1 4.6-3.17 7.27-3.24V16l6-6.5L17 3v5z" />
      </svg>

      {/* Floating leaf 2 */}
      <svg className="absolute top-[60%] right-[10%] w-14 h-14 text-emerald-300/15 animate-float-slow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66c.95-2.3 2.22-4.9 4.02-6.76 2.02-2.1 4.6-3.17 7.27-3.24V16l6-6.5L17 3v5z" />
      </svg>

      {/* Floating leaf 3 */}
      <svg className="absolute bottom-[25%] left-[20%] w-8 h-8 text-green-300/15 animate-float-delayed rotate-45" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66c.95-2.3 2.22-4.9 4.02-6.76 2.02-2.1 4.6-3.17 7.27-3.24V16l6-6.5L17 3v5z" />
      </svg>

      {/* Floating leaf 4 */}
      <svg className="absolute top-[35%] right-[25%] w-6 h-6 text-emerald-200/10 animate-float -rotate-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66c.95-2.3 2.22-4.9 4.02-6.76 2.02-2.1 4.6-3.17 7.27-3.24V16l6-6.5L17 3v5z" />
      </svg>

      {/* Main content */}
      <div className="relative z-10 max-w-md px-8 text-center">

        {/* Logo icon: leaf + document */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-9 h-9 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18c-3 0-5-2.5-5-6 3 0 5 2.5 5 6z" fill="currentColor" opacity="0.3" />
              <path d="M12 18c3 0 5-2.5 5-6-3 0-5 2.5-5 6z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">AgriDoc AI</h1>
        <p className="text-emerald-200/80 text-lg leading-relaxed">
          Intelligent document management for the agrifood supply chain
        </p>

        {/* Feature bullets */}
        <div className="mt-10 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">AI-Powered OCR Extraction</p>
              <p className="text-xs text-emerald-200/60">Automatically extract data from invoices and certificates</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Supply Chain Compliance</p>
              <p className="text-xs text-emerald-200/60">Ensure regulatory adherence across your operations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Smart Document Templates</p>
              <p className="text-xs text-emerald-200/60">Generate and manage reports with one click</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative wheat SVG — bottom right */}
      <svg className="absolute bottom-0 right-0 w-64 h-80 text-emerald-400/10" viewBox="0 0 200 300" fill="currentColor">
        <path d="M160 300c0 0-10-40-10-80s10-60 10-60s10 20 10 60S160 300 160 300z" />
        <path d="M160 180c-20-20-50-25-50-25s10 30 30 50c-30-10-55-5-55-5s20 25 50 30c-25 0-45 15-45 15s30 10 55-5c-20 15-30 35-30 35s25-10 40-35c5 25 0 50 0 50s15-20 15-50c15 20 35 30 35 30s-10-25-25-40c25 5 45 0 45 0s-20-15-45-20c20-15 30-35 30-35s-25 10-40 30c0-25-10-45-10-45z" />
        <path d="M160 120c-15-15-35-20-35-20s8 22 22 37c-22-8-40-3-40-3s15 18 37 22c-18 0-33 12-33 12s22 8 40-3c-15 12-22 25-22 25s18-8 30-25c3 18 0 37 0 37s12-15 12-37c12 15 25 22 25 22s-8-18-18-30c18 3 33 0 33 0s-15-12-33-15c15-12 22-25 22-25s-18 8-30 22c0-18-8-33-8-33z" />
      </svg>
    </div>
  );
}
