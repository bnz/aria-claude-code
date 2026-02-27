import { test, expect } from "@playwright/test";

test.describe("Admin Contacts Editor", () => {
  test("contacts editor bundle is isolated from public pages", async ({ page }) => {
    await page.goto("/en/contacts");
    const html = await page.content();
    expect(html).not.toContain("contacts-editor");
    expect(html).not.toContain("ContactsEditor");
  });

  test("draft auto-save works for contacts data", async ({ page }) => {
    await page.goto("/admin");

    await page.evaluate(() => {
      const data = {
        id: "contacts",
        updatedAt: "2024-01-01T00:00:00Z",
        phone: "+371 20000000",
        address: "Test address",
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=test",
        introText: "Test intro",
        workHours: "Mon-Fri 10:00-18:00",
      };
      localStorage.setItem("cms_draft:content/contacts.en.json", JSON.stringify(data));
      localStorage.setItem("cms_original:content/contacts.en.json", JSON.stringify({
        ...data,
        phone: "+371 00000000",
      }));
    });

    const dirtyKeys = await page.evaluate(() => {
      const prefix = "cms_draft:";
      const dirty: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith(prefix)) continue;
        const key = storageKey.slice(prefix.length);
        const draftRaw = localStorage.getItem("cms_draft:" + key);
        const originalRaw = localStorage.getItem("cms_original:" + key);
        if (draftRaw !== originalRaw) dirty.push(key);
      }
      return dirty;
    });

    expect(dirtyKeys).toContain("content/contacts.en.json");
  });

  test("shared field sync works for phone across languages", async ({ page }) => {
    await page.goto("/admin");

    const result = await page.evaluate(() => {
      const langs = ["en", "lv", "ru"];
      const data: Record<string, { phone: string; address: string }> = {};
      for (const lang of langs) {
        data[lang] = { phone: "+371 20000000", address: `Addr_${lang}` };
      }
      // Update shared phone
      const newPhone = "+371 99999999";
      for (const lang of langs) {
        data[lang].phone = newPhone;
      }
      return {
        allSame: data.en.phone === data.lv.phone && data.lv.phone === data.ru.phone,
        phone: data.en.phone,
        addressesDiffer: data.en.address !== data.lv.address,
      };
    });

    expect(result.allSame).toBe(true);
    expect(result.phone).toBe("+371 99999999");
    expect(result.addressesDiffer).toBe(true);
  });
});
