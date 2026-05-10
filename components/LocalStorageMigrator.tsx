"use client";

import React, { useEffect } from "react";
import { getStorageItem } from "@/lib/storage";

/**
 * Small component to trigger the storage migration logic on app startup.
 * The actual migration logic lives in @/lib/storage.ts
 */
export default function LocalStorageMigrator() {
  useEffect(() => {
    // Trigger migration by accessing any key
    getStorageItem("mm2dice_migration_check");
  }, []);

  return null;
}
