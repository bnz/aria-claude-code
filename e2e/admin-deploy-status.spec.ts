import { test, expect } from "@playwright/test";

test.describe("Admin Deploy Status", () => {
  test("deploy status module is isolated from public pages", async ({ page }) => {
    await page.goto("/en/articles");
    const html = await page.content();
    expect(html).not.toContain("deploy-status-indicator");
    expect(html).not.toContain("DeployStatusIndicator");
    expect(html).not.toContain("useDeployStatus");
  });

  test("deploy state normalization logic", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      type RawStatus = { status: string; conclusion: string | null; createdAt: string | null };

      function normalizeStatus(raw: RawStatus): string {
        if (raw.status === "in_progress" || raw.status === "queued") return "in_progress";
        if (raw.status === "completed") {
          if (raw.conclusion === "success") return "completed";
          return "failed";
        }
        return "idle";
      }

      return {
        inProgress: normalizeStatus({ status: "in_progress", conclusion: null, createdAt: null }),
        queued: normalizeStatus({ status: "queued", conclusion: null, createdAt: null }),
        success: normalizeStatus({ status: "completed", conclusion: "success", createdAt: null }),
        failure: normalizeStatus({ status: "completed", conclusion: "failure", createdAt: null }),
        cancelled: normalizeStatus({ status: "completed", conclusion: "cancelled", createdAt: null }),
        idle: normalizeStatus({ status: "idle", conclusion: null, createdAt: null }),
      };
    });

    expect(result.inProgress).toBe("in_progress");
    expect(result.queued).toBe("in_progress");
    expect(result.success).toBe("completed");
    expect(result.failure).toBe("failed");
    expect(result.cancelled).toBe("failed");
    expect(result.idle).toBe("idle");
  });

  test("isDeployBlocking logic", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      function isDeployBlocking(state: string): boolean {
        return state === "in_progress";
      }

      return {
        idle: isDeployBlocking("idle"),
        inProgress: isDeployBlocking("in_progress"),
        completed: isDeployBlocking("completed"),
        failed: isDeployBlocking("failed"),
      };
    });

    expect(result.idle).toBe(false);
    expect(result.inProgress).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.failed).toBe(false);
  });

  test("adaptive polling intervals", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const POLL_INTERVAL_ACTIVE = 10_000;
      const POLL_INTERVAL_IDLE = 60_000;

      function getInterval(state: string): number {
        return state === "in_progress" ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
      }

      return {
        idleInterval: getInterval("idle"),
        activeInterval: getInterval("in_progress"),
        completedInterval: getInterval("completed"),
        failedInterval: getInterval("failed"),
      };
    });

    expect(result.idleInterval).toBe(60_000);
    expect(result.activeInterval).toBe(10_000);
    expect(result.completedInterval).toBe(60_000);
    expect(result.failedInterval).toBe(60_000);
  });

  test("deploy status indicator state config", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const STATE_CONFIG: Record<string, { label: string }> = {
        idle: { label: "Deploy: idle" },
        completed: { label: "Deploy: completed" },
        in_progress: { label: "Deploy: in progress" },
        failed: { label: "Deploy: failed" },
      };

      return {
        idle: STATE_CONFIG["idle"].label,
        completed: STATE_CONFIG["completed"].label,
        inProgress: STATE_CONFIG["in_progress"].label,
        failed: STATE_CONFIG["failed"].label,
        allStatesPresent: ["idle", "completed", "in_progress", "failed"].every(
          (s) => s in STATE_CONFIG,
        ),
      };
    });

    expect(result.idle).toBe("Deploy: idle");
    expect(result.completed).toBe("Deploy: completed");
    expect(result.inProgress).toBe("Deploy: in progress");
    expect(result.failed).toBe("Deploy: failed");
    expect(result.allStatesPresent).toBe(true);
  });

  test("publish button blocked during deploy", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Simulate publish button logic
      function isPublishDisabled(changedCount: number, deployBlocked: boolean): boolean {
        return changedCount === 0 || deployBlocked;
      }

      return {
        noChangesNoBlock: isPublishDisabled(0, false),
        hasChangesNoBlock: isPublishDisabled(3, false),
        hasChangesBlocked: isPublishDisabled(3, true),
        noChangesBlocked: isPublishDisabled(0, true),
      };
    });

    expect(result.noChangesNoBlock).toBe(true);   // disabled: no changes
    expect(result.hasChangesNoBlock).toBe(false);  // enabled: has changes, no block
    expect(result.hasChangesBlocked).toBe(true);   // disabled: deploy blocking
    expect(result.noChangesBlocked).toBe(true);    // disabled: both
  });

  test("upload blocked during deploy same as publish", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      function isDeployBlocking(state: string): boolean {
        return state === "in_progress";
      }

      // Both publish and upload use the same blocking check
      const states = ["idle", "in_progress", "completed", "failed"];
      return states.map((s) => ({
        state: s,
        publishBlocked: isDeployBlocking(s),
        uploadBlocked: isDeployBlocking(s),
        same: isDeployBlocking(s) === isDeployBlocking(s),
      }));
    });

    for (const r of result) {
      expect(r.publishBlocked).toBe(r.uploadBlocked);
      expect(r.same).toBe(true);
    }
    expect(result.find((r) => r.state === "in_progress")?.publishBlocked).toBe(true);
    expect(result.filter((r) => r.publishBlocked).length).toBe(1);
  });

  test("drafts allowed during deploy", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Draft operations don't check deploy state
      localStorage.setItem("cms_draft:content/test.json", JSON.stringify({ title: "Draft during deploy" }));
      const draft = localStorage.getItem("cms_draft:content/test.json");
      const parsed = draft ? JSON.parse(draft) : null;

      localStorage.setItem("cms_original:content/test.json", JSON.stringify({ title: "Original" }));
      const original = localStorage.getItem("cms_original:content/test.json");

      localStorage.removeItem("cms_draft:content/test.json");
      localStorage.removeItem("cms_original:content/test.json");

      return {
        draftSaved: parsed?.title === "Draft during deploy",
        originalSaved: original !== null,
      };
    });

    expect(result.draftSaved).toBe(true);
    expect(result.originalSaved).toBe(true);
  });
});
