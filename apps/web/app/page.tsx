import DocumentUpload from "@/components/DocumentUpload";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-6">
      <main className="flex w-full flex-col items-center gap-12">
        
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            AgriDoc AI
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            S3 Ingestion Architecture Demo
          </p>
        </div>

        {/* Upload Component */}
        <DocumentUpload />

      </main>
    </div>
  );
}