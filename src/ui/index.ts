import type { Page } from "@playwright/test";
import { newUi } from "./new";
import type { Ui } from "./types";

export type * from "./types";

/** The page objects for the UI this run drives. Phase 3 adds the Classic UI behind the same interfaces. */
export function createUi(page: Page, variant: "new" | "classic"): Ui {
    if (variant === "classic") throw new Error("The Classic UI arrives in phase 3; run with DRAFTDEX_UI=new");
    return newUi(page);
}
