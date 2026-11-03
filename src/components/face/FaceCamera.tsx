"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import type { Human } from "@vladmandic/human";

const MAX_TRIES = 3;
const LIVENESS_MIN = 0.5;

type Props = {
  actionLabel: string;
  // Short instruction shown beside the button
  hint?: string;
  // Side column next to the camera (positioning guide); the button then sits under it
  aside?: React.ReactNode;
  onCapture: (embedding: number[]) => void;
  // Called after 3 rejected captures
  onGiveUp?: () => void;
  // Called if the camera or the face models cannot be started
  onUnavailable?: (reason: string) => void;
};

type Live = { ready: boolean; message: string; embedding?: number[]; liveOk: boolean };

let humanPromise: Promise<Human> | null = null;

// Models are served from /public/models so everything works offline.
function loadHuman(): Promise<Human> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const { Human } = await import("@vladmandic/human");
      const human = new Human({
        modelBasePath: "/models/",
        backend: "webgl",
        filter: { enabled: true, equalization: false },
        face: {
          enabled: true,
          detector: { rotation: false, maxDetected: 1, minConfidence: 0.5 },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: true },
          antispoof: { enabled: true },
          liveness: { enabled: true },
          emotion: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });
      await human.load();
      // load() only logs a model that fails to download, so check that every requested model arrived
      const failed = human.models.stats().modelStats.filter((m) => !m.loaded);
      if (failed.length > 0) throw new Error(`Face models not loaded: ${failed.map((m) => m.name).join(", ")}`);
      await human.warmup();
      return human;
    })().catch((e) => {
      humanPromise = null; // allow a retry
      throw e;
    });
  }
  return humanPromise;
}

export default function FaceCamera({ actionLabel, hint, aside, onCapture, onGiveUp, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveRef = useRef<Live>({ ready: false, message: "Starting camera...", liveOk: false });
  const [status, setStatus] = useState<"loading" | "running" | "stopped">("loading");
  const [live, setLive] = useState<Live>(liveRef.current);
  const [tries, setTries] = useState(0);
  const [rejection, setRejection] = useState("");

  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      } catch {
        if (!stopped) onUnavailableRef.current?.("The camera is blocked or unavailable. Allow camera access in the browser.");
        return;
      }
      let human: Human;
      try {
        human = await loadHuman();
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        if (!stopped) onUnavailableRef.current?.("The face recognition models could not be loaded.");
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("running");

      while (!stopped) {
        try {
          const result = await human.detect(video);
          const face = result.face[0];
          let next: Live;
          if (!face) {
            next = { ready: false, liveOk: false, message: "No face found. Please reposition and face the camera." };
          } else {
            const ratio = face.box[2] / (video.videoWidth || 640);
            const yaw = Math.abs(face.rotation?.angle?.yaw ?? 0);
            const liveOk = (face.real ?? 0) >= LIVENESS_MIN && (face.live ?? 0) >= LIVENESS_MIN;
            if (ratio < 0.25) next = { ready: false, liveOk, message: "Move closer to the camera." };
            else if (ratio > 0.8) next = { ready: false, liveOk, message: "Move back a little." };
            else if (yaw > 0.35) next = { ready: false, liveOk, message: "Face the camera straight on." };
            else next = { ready: true, liveOk, message: "Face detected. Hold still.", embedding: face.embedding };
          }
          liveRef.current = next;
          setLive(next);
        } catch {
          // A single failed frame is not fatal; try the next one.
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    run();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    const cur = liveRef.current;
    let problem = "";
    if (!cur.ready || !cur.embedding?.length) problem = cur.message;
    else if (!cur.liveOk) problem = "Liveness check failed. Please look at the camera directly. Photos and screens are not accepted.";

    if (problem) {
      const n = tries + 1;
      setTries(n);
      setRejection(problem);
      if (n >= MAX_TRIES) {
        setStatus("stopped");
        onGiveUp?.();
      }
      return;
    }
    setRejection("");
    onCapture(cur.embedding!);
  }, [tries, onCapture, onGiveUp]);

  const button = (
    <button type="button" className="btn btn-primary" disabled={status !== "running"} onClick={capture}>
      <Camera className="size-5" aria-hidden />
      {actionLabel}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className={aside ? "grid gap-6 xl:grid-cols-[1fr_21rem]" : ""}>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 border-[#cdd6e6] bg-[#0b1836]">
          <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 aspect-[3/4] h-4/5 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-dashed border-white/80"
          />
          <span className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
            {status === "running" ? "Camera ready" : "Camera off"}
          </span>
          {status === "loading" ? (
            <p className="absolute inset-0 flex items-center justify-center bg-[#0b1836]/70 p-4 text-center text-white">
              Starting camera and loading face models...
            </p>
          ) : (
            <p
              aria-live="polite"
              className={`absolute bottom-4 left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-lg px-4 py-2 text-center text-sm font-bold text-white ${
                live.ready ? "bg-[#1755b3]" : "bg-[#b45309]"
              }`}
            >
              {live.message}
              {live.ready && !live.liveOk && " (liveness not yet confirmed)"}
            </p>
          )}
        </div>
        {aside && (
          <div className="space-y-4">
            {aside}
            <div className="grid">{button}</div>
          </div>
        )}
      </div>

      {rejection && (
        <p role="alert" className="alert alert-error text-center">
          {rejection} (Attempt {tries} of {MAX_TRIES})
        </p>
      )}

      {!aside && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="card-sub">{hint}</p>
          {button}
        </div>
      )}
    </div>
  );
}
