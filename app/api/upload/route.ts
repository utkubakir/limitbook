import { NextRequest } from "next/server";
import { parseCSVStream } from "@/lib/csvParser";
import { sessionManager } from "@/lib/sessionManager";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return new Response(
      JSON.stringify({ error: "No file provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create a TransformStream to send progress updates via Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper to send SSE message
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Parse CSV with progress tracking
        const fileStream = file.stream();
        const { snapshots, bidDepth, askDepth, history, error } = await parseCSVStream(
          fileStream,
          (progress) => {
            sendEvent("progress", progress);
          }
        );

        if (error || snapshots.length === 0) {
          sendEvent("error", { error: error || "No snapshots parsed from CSV" });
          controller.close();
          return;
        }

        // Create session
        const sessionId = sessionManager.createSession(snapshots, bidDepth, askDepth, history);
        const totalTicks = snapshots.length;

        sendEvent("complete", {
          sessionId,
          totalTicks,
          message: `Successfully parsed ${totalTicks.toLocaleString()} snapshots`,
        });

        controller.close();
      } catch (err) {
        console.error("Upload error:", err);
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };
        sendEvent("error", { error: "Failed to process file" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
