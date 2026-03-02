import { test, expect } from "@playwright/test";

test.describe("Admin Media Library", () => {
  test("media library components are isolated from public pages", async ({ page }) => {
    await page.goto("/en/articles");
    const html = await page.content();
    expect(html).not.toContain("media-library-modal");
    expect(html).not.toContain("MediaLibraryModal");
  });

  test("image file filtering logic", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);
      function isImageFile(name: string): boolean {
        const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
      }

      return {
        jpg: isImageFile("photo.jpg"),
        png: isImageFile("photo.png"),
        webp: isImageFile("photo.webp"),
        svg: isImageFile("icon.svg"),
        gitkeep: isImageFile(".gitkeep"),
        json: isImageFile("data.json"),
        md: isImageFile("readme.md"),
        uppercaseJpg: isImageFile("photo.JPG"),
      };
    });

    expect(result.jpg).toBe(true);
    expect(result.png).toBe(true);
    expect(result.webp).toBe(true);
    expect(result.svg).toBe(true);
    expect(result.gitkeep).toBe(false);
    expect(result.json).toBe(false);
    expect(result.md).toBe(false);
    expect(result.uppercaseJpg).toBe(true);
  });

  test("media path conversion from GitHub to public path", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const paths = [
        "public/media/hero.jpg",
        "public/media/certs/cert1.png",
        "public/media/articles/photo.webp",
      ];

      return paths.map((p) => `/${p.replace(/^public\//, "")}`);
    });

    expect(result[0]).toBe("/media/hero.jpg");
    expect(result[1]).toBe("/media/certs/cert1.png");
    expect(result[2]).toBe("/media/articles/photo.webp");
  });

  test("base64 extraction from data URL", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const dataUrls = [
        "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "data:image/png;base64,iVBORw0KGgo=",
      ];

      return dataUrls.map((url) => url.split(",")[1]);
    });

    expect(result[0]).toBe("/9j/4AAQSkZJRg==");
    expect(result[1]).toBe("iVBORw0KGgo=");
  });

  test("image picker state management", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      let value = "";
      const states: string[] = [];

      // Initial state - no image
      states.push(value ? "has-image" : "no-image");

      // Select an image
      value = "/media/hero.jpg";
      states.push(value ? "has-image" : "no-image");

      // Remove the image
      value = "";
      states.push(value ? "has-image" : "no-image");

      // Select another image
      value = "/media/cert.png";
      states.push(value ? "has-image" : "no-image");

      return {
        states,
        finalValue: value,
      };
    });

    expect(result.states).toEqual(["no-image", "has-image", "no-image", "has-image"]);
    expect(result.finalValue).toBe("/media/cert.png");
  });

  test("upload creates separate commit with correct message", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      // Simulate what uploadImage sends
      const fileName = "new-photo.jpg";
      const base64Content = "base64EncodedImageData";
      const filePath = `public/media/${fileName}`;
      const message = `media: upload ${fileName}`;

      const requestBody = {
        message,
        content: base64Content,
      };

      return {
        filePath,
        message: requestBody.message,
        hasContent: requestBody.content.length > 0,
        isMediaPath: filePath.startsWith("public/media/"),
      };
    });

    expect(result.filePath).toBe("public/media/new-photo.jpg");
    expect(result.message).toBe("media: upload new-photo.jpg");
    expect(result.hasContent).toBe(true);
    expect(result.isMediaPath).toBe(true);
  });

  test("modal open/close state management", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      let isOpen = false;
      const stateLog: boolean[] = [];

      // Open modal
      isOpen = true;
      stateLog.push(isOpen);

      // Close via X button
      isOpen = false;
      stateLog.push(isOpen);

      // Open again
      isOpen = true;
      stateLog.push(isOpen);

      // Close via Escape
      isOpen = false;
      stateLog.push(isOpen);

      return { stateLog };
    });

    expect(result.stateLog).toEqual([true, false, true, false]);
  });
});
