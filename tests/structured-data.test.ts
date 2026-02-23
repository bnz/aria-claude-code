import { describe, it, expect } from "vitest";
import { getContacts, getAbout, getCondition, getArticle } from "@/lib/content";
import {
  buildMedicalBusinessJsonLd,
  buildPhysicianJsonLd,
  buildFaqPageJsonLd,
  buildArticleJsonLd,
} from "@/lib/structured-data";

describe("buildMedicalBusinessJsonLd", () => {
  const contacts = getContacts("en");
  const jsonLd = buildMedicalBusinessJsonLd(contacts, "Acupuncture Clinic");

  it("produces valid JSON", () => {
    const str = JSON.stringify(jsonLd);
    expect(() => JSON.parse(str)).not.toThrow();
  });

  it("has correct @type", () => {
    expect(jsonLd["@type"]).toBe("MedicalBusiness");
  });

  it("contains required fields", () => {
    expect(jsonLd.name).toBe("Acupuncture Clinic");
    expect(jsonLd.telephone).toBe(contacts.phone);
    expect(jsonLd.address).toBeDefined();
    expect(jsonLd.geo).toBeDefined();
  });

  it("has geo coordinates", () => {
    const geo = jsonLd.geo as Record<string, unknown>;
    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(geo.latitude).toBeDefined();
    expect(geo.longitude).toBeDefined();
  });

  it("includes openingHours when available", () => {
    expect(jsonLd.openingHours).toBe(contacts.workHours);
  });
});

describe("buildPhysicianJsonLd", () => {
  const about = getAbout("en");
  const jsonLd = buildPhysicianJsonLd(about);

  it("produces valid JSON", () => {
    const str = JSON.stringify(jsonLd);
    expect(() => JSON.parse(str)).not.toThrow();
  });

  it("has correct @type", () => {
    expect(jsonLd["@type"]).toBe("Physician");
  });

  it("contains required fields", () => {
    expect(jsonLd.name).toBe(about.title);
    expect(jsonLd.description).toBe(about.summary);
    expect(jsonLd.medicalSpecialty).toBe("Acupuncture");
  });

  it("includes credentials", () => {
    const credentials = jsonLd.hasCredential as Array<Record<string, unknown>>;
    expect(credentials.length).toBe(about.credentials.length);
    expect(credentials[0]["@type"]).toBe("EducationalOccupationalCredential");
  });
});

describe("buildFaqPageJsonLd", () => {
  const condition = getCondition("back-pain", "en");
  const jsonLd = buildFaqPageJsonLd(condition.faq);

  it("produces valid JSON", () => {
    const str = JSON.stringify(jsonLd);
    expect(() => JSON.parse(str)).not.toThrow();
  });

  it("has correct @type", () => {
    expect(jsonLd["@type"]).toBe("FAQPage");
  });

  it("generates FAQ from condition faq array", () => {
    const mainEntity = jsonLd.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity.length).toBe(condition.faq.length);

    for (let i = 0; i < condition.faq.length; i++) {
      expect(mainEntity[i]["@type"]).toBe("Question");
      expect(mainEntity[i].name).toBe(condition.faq[i].q);
      const answer = mainEntity[i].acceptedAnswer as Record<string, unknown>;
      expect(answer["@type"]).toBe("Answer");
      expect(answer.text).toBe(condition.faq[i].a);
    }
  });
});

describe("buildArticleJsonLd", () => {
  const article = getArticle("acupuncture-for-stress", "en");
  const jsonLd = buildArticleJsonLd(article, "en");

  it("produces valid JSON", () => {
    const str = JSON.stringify(jsonLd);
    expect(() => JSON.parse(str)).not.toThrow();
  });

  it("has correct @type", () => {
    expect(jsonLd["@type"]).toBe("Article");
  });

  it("contains required fields", () => {
    expect(jsonLd.headline).toBe(article.title);
    expect(jsonLd.dateModified).toBe(article.updatedAt);
    expect(jsonLd.inLanguage).toBe("en");
  });

  it("has author", () => {
    const author = jsonLd.author as Record<string, unknown>;
    expect(author["@type"]).toBe("Organization");
    expect(author.name).toBeTruthy();
  });

  it("includes image when heroImagePath is set", () => {
    expect(jsonLd.image).toBeDefined();
  });
});
