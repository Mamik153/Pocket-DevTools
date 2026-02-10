export type TtsJobStatus = "queued" | "processing" | "done" | "error";

export interface TtsJobResponse {
  id: string;
  status: TtsJobStatus;
  error?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}
