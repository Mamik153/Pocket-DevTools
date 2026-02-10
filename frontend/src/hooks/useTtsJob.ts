import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TtsJobResponse } from "@/types/tts";

const POLL_INTERVAL_MS = 2000;

export function useTtsJob(apiBaseUrl: string) {
  const [activeJob, setActiveJob] = useState<TtsJobResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(
    async (id: string) => {
      const response = await fetch(`${apiBaseUrl}/api/tts/jobs/${id}`);
      if (!response.ok) {
        throw new Error("Unable to fetch TTS job status.");
      }
      const data = (await response.json()) as TtsJobResponse;
      setActiveJob(data);
      if (data.status === "done" || data.status === "error") {
        clearPolling();
      }
    },
    [apiBaseUrl, clearPolling]
  );

  const createJob = useCallback(
    async (markdown: string) => {
      setRequestError(null);
      setIsSubmitting(true);
      clearPolling();

      try {
        const response = await fetch(`${apiBaseUrl}/api/tts/jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ markdown })
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || "Unable to create TTS job.");
        }

        const data = (await response.json()) as TtsJobResponse;
        setActiveJob(data);

        pollRef.current = window.setInterval(() => {
          void fetchJob(data.id);
        }, POLL_INTERVAL_MS);
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Unexpected request error.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [apiBaseUrl, clearPolling, fetchJob]
  );

  useEffect(() => clearPolling, [clearPolling]);

  const audioUrl = useMemo(() => {
    if (activeJob?.status !== "done" || !activeJob.audio_url) {
      return null;
    }
    return `${apiBaseUrl}${activeJob.audio_url}`;
  }, [activeJob, apiBaseUrl]);

  return {
    activeJob,
    audioUrl,
    isSubmitting,
    requestError,
    createJob,
    clearJob: () => setActiveJob(null)
  };
}
