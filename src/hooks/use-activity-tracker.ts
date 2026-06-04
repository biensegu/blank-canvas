import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { logActivity } from "@/lib/activity.functions";
import { useAuth } from "./use-auth";

export function useActivityTracker(type: string, courseId?: string | null) {
  const { user } = useAuth();
  const log = useServerFn(logActivity);
  const start = useRef(Date.now());
  useEffect(() => {
    if (!user) return;
    start.current = Date.now();
    log({ data: { type, courseId: courseId ?? null } }).catch(() => {});
    return () => {
      const dur = Date.now() - start.current;
      log({ data: { type: `${type}_leave`, courseId: courseId ?? null, durationMs: dur } }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, courseId, user?.id]);
}