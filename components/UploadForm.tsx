"use client";

import { useState } from "react";

interface UploadFormProps {
  onUploadComplete: (sessionId: string, totalTicks: number) => void;
}

export function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState({
    percentComplete: 0,
    linesProcessed: 0,
    bytesProcessed: 0,
    totalBytes: 0,
  });
  const [stage, setStage] = useState<"uploading" | "parsing" | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please drop a CSV file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadProgress(0);
    setParseProgress({
      percentComplete: 0,
      linesProcessed: 0,
      bytesProcessed: 0,
      totalBytes: 0,
    });
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use XMLHttpRequest to track upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let uploadComplete = false;

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        // Upload completed, server will start processing
        xhr.upload.addEventListener("load", () => {
          uploadComplete = true;
          setUploadProgress(100);
          setStage("parsing");
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);

        // Process the SSE response stream as it arrives
        let buffer = "";
        let lastIndex = 0;

        xhr.addEventListener("progress", () => {
          // Switch to parsing stage when we start receiving response
          if (uploadComplete && lastIndex === 0) {
            setStage("parsing");
          }

          const responseText = xhr.responseText.substring(lastIndex);
          lastIndex = xhr.responseText.length;
          buffer += responseText;

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const eventMatch = line.match(/^event: (.+)$/m);
            const dataMatch = line.match(/^data: (.+)$/m);

            if (eventMatch && dataMatch) {
              const event = eventMatch[1];
              const data = JSON.parse(dataMatch[1]);

              if (event === "progress") {
                setParseProgress(data);
              } else if (event === "complete") {
                onUploadComplete(data.sessionId, data.totalTicks);
                setLoading(false);
                setStage(null);
                resolve();
              } else if (event === "error") {
                reject(new Error(data.error));
              }
            }
          }
        });

        // Handle request completion (only fires if no error)
        xhr.addEventListener("loadend", () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`Server error: ${xhr.status}`));
          }
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
      setStage(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold text-gray-900">
            Order Book Visualizer
          </h1>
          <p className="text-gray-600">
            Upload CSV file containing order book snapshots
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragOver
              ? "border-[#5FAAF7] bg-[#5FAAF7]/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="file-upload"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            {!file ? (
              <>
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-700">
                    Drop CSV file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Format: ts_recv, ts_event, bid_px_*, ask_px_*, bid_sz_*, ask_sz_*
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-[#5FAAF7]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-700">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading && (
          <div className="p-4 bg-[#5FAAF7]/10 border border-[#5FAAF7]/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#5FAAF7] border-t-transparent" />
                <p className="text-sm text-[#5FAAF7] font-medium">
                  {stage === "uploading" && "Uploading file..."}
                  {stage === "parsing" && "Processing CSV file..."}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#5FAAF7]">
                {stage === "uploading" && `${uploadProgress}%`}
                {stage === "parsing" && `${parseProgress.percentComplete}%`}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#5FAAF7]/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#5FAAF7] h-full transition-all duration-300 ease-out"
                style={{
                  width: `${
                    stage === "uploading"
                      ? uploadProgress
                      : parseProgress.percentComplete
                  }%`,
                }}
              />
            </div>

            {/* Upload progress details */}
            {stage === "uploading" && file && (
              <div className="flex justify-between text-xs text-[#5FAAF7]/80">
                <span>Uploading to server</span>
                <span>
                  {((file.size * uploadProgress) / 100 / 1024 / 1024).toFixed(
                    1
                  )}{" "}
                  MB / {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            )}

            {/* Parse progress details */}
            {stage === "parsing" && parseProgress.linesProcessed > 0 && (
              <div className="flex justify-between text-xs text-[#5FAAF7]/80">
                <span>
                  {parseProgress.linesProcessed.toLocaleString()} lines
                  processed
                </span>
                <span>
                  {(parseProgress.bytesProcessed / 1024 / 1024).toFixed(1)} MB /{" "}
                  {(parseProgress.totalBytes / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full py-3 px-6 bg-[#5FAAF7] hover:bg-[#4A9AE6] disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {loading
            ? stage === "uploading"
              ? "Uploading..."
              : "Processing..."
            : "Upload and Visualize"}
        </button>
      </div>
    </div>
  );
}
