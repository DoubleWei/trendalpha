import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Tone = "bull" | "bear" | "neutral";

/** 依分數決定語意色；deadzone 內視為中性 */
export function toneOf(value: number, deadzone = 0.05): Tone {
  if (value > deadzone) return "bull";
  if (value < -deadzone) return "bear";
  return "neutral";
}

export const toneText: Record<Tone, string> = {
  bull: "text-bull",
  bear: "text-bear",
  neutral: "text-neutral",
};

export const toneBg: Record<Tone, string> = {
  bull: "bg-bull",
  bear: "bg-bear",
  neutral: "bg-neutral",
};

export function signed(value: number, digits = 0) {
  const s = value.toFixed(digits);
  return value > 0 ? `+${s}` : s;
}

export function timeAgo(iso: string) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec} 秒前`;
  if (sec < 3600) return `${Math.floor(sec / 60)} 分鐘前`;
  return `${Math.floor(sec / 3600)} 小時前`;
}
