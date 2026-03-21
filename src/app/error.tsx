"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold text-slate-900">
          Something went wrong
        </h2>
        <p className="text-slate-500">
          The diagnostic tool encountered an error. Your answers have not been
          lost.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
