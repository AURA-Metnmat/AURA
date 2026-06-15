export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    try {
      const { getAppEnv } = await import("@/lib/env");
      getAppEnv();
      console.log("[AURA] Environment validated");
    } catch (error) {
      console.error("[AURA] Environment validation failed:", error);
      throw error;
    }
  }
}
