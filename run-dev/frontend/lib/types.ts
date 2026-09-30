import type { Models } from "appwrite";
import type { Tone } from "./schema";

export type Prefs = {
  /** Last board version this user acknowledged or viewed. Drives the "changed since" diff. */
  lastSeenVersion?: number;
};

export type User = Models.User<Prefs>;

export type Board = Models.Row & {
  title: string;
  body: string;
  tone: Tone;
  version: number;
  updatedById: string | null;
  updatedByName: string | null;
};
