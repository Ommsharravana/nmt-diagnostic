"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="font-display text-2xl text-navy">
          Something went wrong
        </h2>
        <p className="text-navy/50 text-sm">
          The diagnostic tool encountered an error. Your answers have not been
          lost.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-navy text-white rounded-lg font-medium hover:bg-navy-light transition-colors text-sm tracking-wider"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
