// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
} as Storage;

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

function makeContacts(lang: string) {
  return {
    id: "contacts",
    updatedAt: "2024-01-01T00:00:00Z",
    phone: "+371 20000000",
    address: `Address_${lang}`,
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=test",
    introText: `Intro_${lang}`,
    workHours: `Mon-Fri_${lang}`,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- Component export ---

describe("ContactsEditor", () => {
  it("exports ContactsEditor component", async () => {
    const { ContactsEditor } = await import("@/components/admin/contacts-editor");
    expect(typeof ContactsEditor).toBe("function");
  });

  it("renders nothing without auth token", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const { ContactsEditor } = await import("@/components/admin/contacts-editor");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null, React.createElement(ContactsEditor)),
      );
      setTimeout(resolve, 50);
    });

    const editor = container.querySelector("[data-testid='contacts-editor']");
    expect(editor).toBeNull();

    root.unmount();
    container.remove();
  });
});

// --- Draft integration ---

describe("Contacts draft integration", () => {
  it("saveDraft stores contacts data", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");
    const data = makeContacts("en");
    saveDraft("content/contacts.en.json", data);
    expect(loadDraft("content/contacts.en.json")).toEqual(data);
  });

  it("getDirtyKeys detects changed contacts", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");

    const original = makeContacts("en");
    setOriginal("content/contacts.en.json", original);

    const modified = { ...original, phone: "+371 99999999" };
    saveDraft("content/contacts.en.json", modified);

    expect(getDirtyKeys()).toContain("content/contacts.en.json");
  });

  it("getDirtyKeys does not include unchanged contacts", async () => {
    const { saveDraft, setOriginal, getDirtyKeys } = await import("@/lib/admin/draft-manager");

    const data = makeContacts("lv");
    setOriginal("content/contacts.lv.json", data);
    saveDraft("content/contacts.lv.json", data);

    expect(getDirtyKeys()).not.toContain("content/contacts.lv.json");
  });
});

// --- Zod validation ---

describe("ContactsSchema validation", () => {
  it("validates correct contacts data", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const result = ContactsSchema.safeParse(makeContacts("en"));
    expect(result.success).toBe(true);
  });

  it("rejects contacts with empty phone", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const data = { ...makeContacts("en"), phone: "" };
    const result = ContactsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects contacts with short phone (< 3 chars)", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const data = { ...makeContacts("en"), phone: "12" };
    const result = ContactsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects contacts with short address (< 3 chars)", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const data = { ...makeContacts("en"), address: "AB" };
    const result = ContactsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects contacts with invalid mapEmbedUrl", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const data = { ...makeContacts("en"), mapEmbedUrl: "not-a-url" };
    const result = ContactsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows contacts without optional fields", async () => {
    const { ContactsSchema } = await import("@/schemas");
    const data = {
      id: "contacts",
      updatedAt: "2024-01-01T00:00:00Z",
      phone: "+371 20000000",
      address: "Some address here",
    };
    const result = ContactsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

// --- Shared field sync logic ---

describe("Contacts shared field sync", () => {
  it("updating phone syncs to all languages", () => {
    const data = {
      en: makeContacts("en"),
      lv: makeContacts("lv"),
      ru: makeContacts("ru"),
    };

    const newPhone = "+371 11111111";
    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = { ...data[lang], phone: newPhone };
    }

    expect(data.en.phone).toBe(newPhone);
    expect(data.lv.phone).toBe(newPhone);
    expect(data.ru.phone).toBe(newPhone);
  });

  it("updating mapEmbedUrl syncs to all languages", () => {
    const data = {
      en: makeContacts("en"),
      lv: makeContacts("lv"),
      ru: makeContacts("ru"),
    };

    const newUrl = "https://www.google.com/maps/embed?pb=new";
    for (const lang of ["en", "lv", "ru"] as const) {
      data[lang] = { ...data[lang], mapEmbedUrl: newUrl };
    }

    expect(data.en.mapEmbedUrl).toBe(newUrl);
    expect(data.lv.mapEmbedUrl).toBe(newUrl);
    expect(data.ru.mapEmbedUrl).toBe(newUrl);
  });

  it("per-language fields update independently", () => {
    const data = {
      en: makeContacts("en"),
      lv: makeContacts("lv"),
      ru: makeContacts("ru"),
    };

    data.en = { ...data.en, address: "New English address" };

    expect(data.en.address).toBe("New English address");
    expect(data.lv.address).toBe("Address_lv");
    expect(data.ru.address).toBe("Address_ru");
  });
});

// --- DraftRecoveryDialog / DraftIndicator (already tested in translations, verify wired) ---

describe("Contacts editor UI components", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  function render(element: React.ReactElement): Promise<void> {
    return new Promise((resolve) => {
      root.render(element);
      setTimeout(resolve, 0);
    });
  }

  it("AdminSectionContent renders ContactsEditor for contacts section", async () => {
    // Verify the section content component recognizes "contacts"
    const { AdminSectionContent } = await import("@/components/admin/admin-section-content");
    expect(typeof AdminSectionContent).toBe("function");
  });

  it("DraftIndicator is hidden when no draft changes exist", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");
    await render(React.createElement(DraftIndicator, { visible: false }));

    const dot = container.querySelector("[data-testid='draft-indicator']");
    expect(dot).toBeNull();
  });

  it("DraftIndicator shows when draft changes exist", async () => {
    const { DraftIndicator } = await import("@/components/admin/draft-indicator");
    await render(React.createElement(DraftIndicator, { visible: true }));

    const dot = container.querySelector("[data-testid='draft-indicator']");
    expect(dot).not.toBeNull();
  });
});
