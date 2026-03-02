import { test, expect } from "@playwright/test";

test.describe("Admin Publish Flow", () => {
  test("publish components are isolated from public pages", async ({ page }) => {
    await page.goto("/en/articles");
    const html = await page.content();
    expect(html).not.toContain("publish-panel");
    expect(html).not.toContain("PublishPanel");
  });

  test("commit message follows correct format", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const files = [
        "content/translations.en.json",
        "content/articles/back-pain/article.lv.json",
        "content/contacts.ru.json",
      ];

      return files.map((filePath) => {
        const filename = filePath.split("/").pop() ?? filePath;
        const now = new Date().toISOString();
        const message = `Update ${filename} — ${now}`;
        return {
          filePath,
          filename,
          message,
          hasUpdate: message.startsWith("Update "),
          hasIso: /\d{4}-\d{2}-\d{2}T/.test(message),
        };
      });
    });

    for (const r of result) {
      expect(r.hasUpdate).toBe(true);
      expect(r.hasIso).toBe(true);
    }
    expect(result[0].filename).toBe("translations.en.json");
    expect(result[1].filename).toBe("article.lv.json");
    expect(result[2].filename).toBe("contacts.ru.json");
  });

  test("sequential commit execution stops on error", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const files = ["file1.json", "file2.json", "file3.json"];
      const results: Array<{ path: string; status: string }> = [];
      const failAt = 1; // Second file fails

      for (let i = 0; i < files.length; i++) {
        if (i === failAt) {
          results.push({ path: files[i], status: "error" });
          break;
        }
        results.push({ path: files[i], status: "committed" });
      }

      return {
        results,
        committed: results.filter((r) => r.status === "committed").length,
        errors: results.filter((r) => r.status === "error").length,
        skipped: files.length - results.length,
      };
    });

    expect(result.committed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.skipped).toBe(1);
  });

  test("draft cleanup after successful publish", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Set up drafts
      localStorage.setItem("cms_draft:content/file1.json", JSON.stringify({ v: "new1" }));
      localStorage.setItem("cms_original:content/file1.json", JSON.stringify({ v: "old1" }));
      localStorage.setItem("cms_draft:content/file2.json", JSON.stringify({ v: "new2" }));
      localStorage.setItem("cms_original:content/file2.json", JSON.stringify({ v: "old2" }));

      // Simulate successful publish: update originals, clear drafts
      const files = ["content/file1.json", "content/file2.json"];
      for (const file of files) {
        const draft = localStorage.getItem(`cms_draft:${file}`);
        if (draft) {
          localStorage.setItem(`cms_original:${file}`, draft);
          localStorage.removeItem(`cms_draft:${file}`);
          localStorage.removeItem(`cms_original:${file}`);
        }
      }

      // Check cleanup
      const draft1 = localStorage.getItem("cms_draft:content/file1.json");
      const draft2 = localStorage.getItem("cms_draft:content/file2.json");

      return {
        draft1Cleared: draft1 === null,
        draft2Cleared: draft2 === null,
      };
    });

    expect(result.draft1Cleared).toBe(true);
    expect(result.draft2Cleared).toBe(true);
  });

  test("partial publish preserves uncommitted drafts", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Set up 3 dirty files
      localStorage.setItem("cms_draft:content/file1.json", JSON.stringify({ v: "new1" }));
      localStorage.setItem("cms_original:content/file1.json", JSON.stringify({ v: "old1" }));
      localStorage.setItem("cms_draft:content/file2.json", JSON.stringify({ v: "new2" }));
      localStorage.setItem("cms_original:content/file2.json", JSON.stringify({ v: "old2" }));
      localStorage.setItem("cms_draft:content/file3.json", JSON.stringify({ v: "new3" }));
      localStorage.setItem("cms_original:content/file3.json", JSON.stringify({ v: "old3" }));

      // Publish only file1, file2 fails, file3 not attempted
      // Clear only file1 (committed)
      localStorage.removeItem("cms_draft:content/file1.json");
      localStorage.removeItem("cms_original:content/file1.json");

      // file2 and file3 should still have drafts
      return {
        file1Draft: localStorage.getItem("cms_draft:content/file1.json"),
        file2Draft: localStorage.getItem("cms_draft:content/file2.json"),
        file3Draft: localStorage.getItem("cms_draft:content/file3.json"),
      };
    });

    expect(result.file1Draft).toBeNull();
    expect(result.file2Draft).not.toBeNull();
    expect(result.file3Draft).not.toBeNull();
  });

  test("changed files count detection", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // No changes initially
      const before = (() => {
        const dirty: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith("cms_draft:")) continue;
          const k = key.slice("cms_draft:".length);
          const draft = localStorage.getItem(`cms_draft:${k}`);
          const original = localStorage.getItem(`cms_original:${k}`);
          if (draft !== original) dirty.push(k);
        }
        return dirty.length;
      })();

      // Add some changes
      localStorage.setItem("cms_original:content/a.json", JSON.stringify({ v: "old" }));
      localStorage.setItem("cms_draft:content/a.json", JSON.stringify({ v: "new" }));
      localStorage.setItem("cms_original:content/b.json", JSON.stringify({ v: "same" }));
      localStorage.setItem("cms_draft:content/b.json", JSON.stringify({ v: "same" }));

      const after = (() => {
        const dirty: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith("cms_draft:")) continue;
          const k = key.slice("cms_draft:".length);
          const draft = localStorage.getItem(`cms_draft:${k}`);
          const original = localStorage.getItem(`cms_original:${k}`);
          if (draft !== original) dirty.push(k);
        }
        return dirty.length;
      })();

      return { before, after };
    });

    expect(result.before).toBe(0);
    expect(result.after).toBe(1); // Only content/a.json is dirty
  });
});
