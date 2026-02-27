// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

// ---- Navigation Context ----

describe("AdminNavigationContext", () => {
  it("ADMIN_SECTIONS contains 6 entries", async () => {
    const { ADMIN_SECTIONS } = await import("@/lib/admin/navigation-context");
    expect(ADMIN_SECTIONS).toHaveLength(6);
    const keys = ADMIN_SECTIONS.map((s) => s.key);
    expect(keys).toEqual([
      "translations",
      "articles",
      "conditions",
      "info",
      "contacts",
      "about",
    ]);
  });

  it("ADMIN_SECTIONS entries have key and label", async () => {
    const { ADMIN_SECTIONS } = await import("@/lib/admin/navigation-context");
    for (const section of ADMIN_SECTIONS) {
      expect(section).toHaveProperty("key");
      expect(section).toHaveProperty("label");
      expect(typeof section.key).toBe("string");
      expect(typeof section.label).toBe("string");
    }
  });

  it("default section is translations (first entry)", async () => {
    const { ADMIN_SECTIONS } = await import("@/lib/admin/navigation-context");
    expect(ADMIN_SECTIONS[0].key).toBe("translations");
  });
});

// ---- Component exports ----

describe("Component exports", () => {
  it("exports AdminButton, AdminInput, AdminTextarea, AdminCard from ui.tsx", async () => {
    const mod = await import("@/components/admin/ui");
    expect(typeof mod.AdminButton).toBe("function");
    expect(typeof mod.AdminInput).toBe("function");
    expect(typeof mod.AdminTextarea).toBe("function");
    expect(typeof mod.AdminCard).toBe("function");
  });

  it("exports LanguageTabs component", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    expect(typeof LanguageTabs).toBe("function");
  });

  it("exports AdminSectionContent component", async () => {
    const { AdminSectionContent } = await import("@/components/admin/admin-section-content");
    expect(typeof AdminSectionContent).toBe("function");
  });

  it("exports AdminCmsLayout component", async () => {
    const { AdminCmsLayout } = await import("@/components/admin/admin-cms-layout");
    expect(typeof AdminCmsLayout).toBe("function");
  });
});

// ---- React rendering tests ----

describe("React component rendering", () => {
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

  it("AdminButton renders with correct variant attribute", async () => {
    const { AdminButton } = await import("@/components/admin/ui");
    await render(React.createElement(AdminButton, { variant: "danger" }, "Delete"));

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.getAttribute("data-variant")).toBe("danger");
    expect(button!.textContent).toBe("Delete");
    expect(button!.className).toContain("bg-red-600");
  });

  it("AdminButton renders with secondary variant", async () => {
    const { AdminButton } = await import("@/components/admin/ui");
    await render(React.createElement(AdminButton, { variant: "secondary" }, "Cancel"));

    const button = container.querySelector("button");
    expect(button!.getAttribute("data-variant")).toBe("secondary");
    expect(button!.className).toContain("border");
  });

  it("AdminButton renders with primary variant by default", async () => {
    const { AdminButton } = await import("@/components/admin/ui");
    await render(React.createElement(AdminButton, null, "Save"));

    const button = container.querySelector("button");
    expect(button!.getAttribute("data-variant")).toBe("primary");
    expect(button!.className).toContain("bg-accent");
  });

  it("AdminButton disables correctly", async () => {
    const { AdminButton } = await import("@/components/admin/ui");
    await render(React.createElement(AdminButton, { disabled: true }, "Save"));

    const button = container.querySelector("button");
    expect(button!.disabled).toBe(true);
  });

  it("AdminInput renders label and input element", async () => {
    const { AdminInput } = await import("@/components/admin/ui");
    await render(
      React.createElement(AdminInput, {
        label: "Title",
        id: "title-input",
        placeholder: "Enter title",
      }),
    );

    const label = container.querySelector("label");
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe("Title");
    expect(label!.getAttribute("for")).toBe("title-input");

    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input!.id).toBe("title-input");
    expect(input!.placeholder).toBe("Enter title");
  });

  it("AdminInput renders error message", async () => {
    const { AdminInput } = await import("@/components/admin/ui");
    await render(
      React.createElement(AdminInput, {
        label: "Email",
        id: "email-input",
        error: "Required field",
      }),
    );

    const errorEl = container.querySelector("#email-input-error");
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toBe("Required field");

    const input = container.querySelector("input");
    expect(input!.getAttribute("aria-invalid")).toBe("true");
  });

  it("AdminTextarea renders label and textarea element", async () => {
    const { AdminTextarea } = await import("@/components/admin/ui");
    await render(
      React.createElement(AdminTextarea, {
        label: "Description",
        id: "desc-textarea",
        rows: 5,
      }),
    );

    const label = container.querySelector("label");
    expect(label!.textContent).toBe("Description");

    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();
    expect(textarea!.id).toBe("desc-textarea");
    expect(textarea!.rows).toBe(5);
  });

  it("AdminCard renders title and children", async () => {
    const { AdminCard } = await import("@/components/admin/ui");
    await render(
      React.createElement(
        AdminCard,
        { title: "Settings" },
        React.createElement("p", null, "Card content here"),
      ),
    );

    const card = container.querySelector("[data-testid='admin-card']");
    expect(card).not.toBeNull();

    const heading = card!.querySelector("h2");
    expect(heading!.textContent).toBe("Settings");

    const paragraph = card!.querySelector("p");
    expect(paragraph!.textContent).toBe("Card content here");
  });

  it("AdminCard renders without title", async () => {
    const { AdminCard } = await import("@/components/admin/ui");
    await render(
      React.createElement(
        AdminCard,
        null,
        React.createElement("span", null, "No title"),
      ),
    );

    const heading = container.querySelector("h2");
    expect(heading).toBeNull();

    expect(container.textContent).toContain("No title");
  });

  it("LanguageTabs renders 3 tabs (en, lv, ru)", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    await render(
      React.createElement(LanguageTabs, {
        activeLang: "en",
        onLangChange: () => {},
      }),
    );

    const tabs = container.querySelectorAll("[role='tab']");
    expect(tabs).toHaveLength(3);

    const langs = Array.from(tabs).map((t) => t.getAttribute("data-lang"));
    expect(langs).toEqual(["en", "lv", "ru"]);

    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    expect(tabs[2].getAttribute("aria-selected")).toBe("false");
  });

  it("LanguageTabs calls onLangChange with correct lang", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    const onLangChange = vi.fn();

    await render(
      React.createElement(LanguageTabs, {
        activeLang: "en",
        onLangChange,
      }),
    );

    const lvTab = container.querySelector("[data-lang='lv']") as HTMLButtonElement;
    lvTab.click();
    expect(onLangChange).toHaveBeenCalledWith("lv");

    const ruTab = container.querySelector("[data-lang='ru']") as HTMLButtonElement;
    ruTab.click();
    expect(onLangChange).toHaveBeenCalledWith("ru");
  });

  it("LanguageTabs shows warning indicator", async () => {
    const { LanguageTabs } = await import("@/components/admin/language-tabs");
    await render(
      React.createElement(LanguageTabs, {
        activeLang: "en",
        onLangChange: () => {},
        warnings: { lv: true },
      }),
    );

    const lvTab = container.querySelector("[data-lang='lv']") as HTMLElement;
    const warningDot = lvTab.querySelector("[aria-label]");
    expect(warningDot).not.toBeNull();
    expect(warningDot!.getAttribute("aria-label")).toContain("Warning");
  });
});
