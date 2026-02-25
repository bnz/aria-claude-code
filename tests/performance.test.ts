import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Admin bundle isolation", () => {
  const publicPageDir = path.join(process.cwd(), "src", "app", "[lang]");

  function getPublicTsxFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getPublicTsxFiles(fullPath));
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("public pages do not import from admin modules", () => {
    const publicFiles = getPublicTsxFiles(publicPageDir);
    expect(publicFiles.length).toBeGreaterThan(0);

    for (const file of publicFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toMatch(/from\s+["'].*\/admin/);
      expect(content).not.toMatch(/from\s+["']@\/components\/admin/);
      expect(content).not.toMatch(/from\s+["']@\/lib\/admin/);
    }
  });

  it("public components do not import from admin modules", () => {
    const componentsDir = path.join(process.cwd(), "src", "components");
    const componentFiles: string[] = [];
    for (const entry of fs.readdirSync(componentsDir, {
      withFileTypes: true,
    })) {
      if (
        entry.isFile() &&
        (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) &&
        !entry.name.startsWith("admin")
      ) {
        componentFiles.push(path.join(componentsDir, entry.name));
      }
    }

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toMatch(/from\s+["'].*\/admin/);
    }
  });
});

describe("Image optimization", () => {
  it("no direct <img> tags in components (use next/image)", () => {
    const componentsDir = path.join(process.cwd(), "src", "components");
    for (const entry of fs.readdirSync(componentsDir, {
      withFileTypes: true,
    })) {
      if (entry.isFile() && entry.name.endsWith(".tsx")) {
        const content = fs.readFileSync(
          path.join(componentsDir, entry.name),
          "utf-8",
        );
        expect(content).not.toMatch(/<img\s/);
      }
    }
  });

  it("OptimizedImage component exists and exports correctly", async () => {
    const mod = await import("@/components/optimized-image");
    expect(mod.OptimizedImage).toBeDefined();
  });
});
