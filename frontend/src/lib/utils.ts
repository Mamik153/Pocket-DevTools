import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * One level up a path. "/image-converter/to-ico" -> "/image-converter";
 * "/base64" -> "/". Used for the "back" link on every tool page, so a
 * sub-route returns to its parent tool instead of jumping to the home page.
 */
export const parentPath = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, "");
  const cut = trimmed.lastIndexOf("/");
  return cut > 0 ? trimmed.slice(0, cut) : "/";
};
