import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Content directory structure", () => {
  const requiredDirs = [
    "content",
    "content/articles",
    "content/conditions",
    "public/media",
  ];

  for (const dir of requiredDirs) {
    it(`/${dir} directory exists`, () => {
      const fullPath = path.join(ROOT, dir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).isDirectory()).toBe(true);
    });
  }
});

describe("Source directory structure", () => {
  const requiredDirs = [
    "src/schemas",
    "src/lib",
    "src/lib/admin",
    "src/components",
    "src/components/admin",
  ];

  for (const dir of requiredDirs) {
    it(`/${dir} directory exists`, () => {
      const fullPath = path.join(ROOT, dir);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).isDirectory()).toBe(true);
    });
  }
});
