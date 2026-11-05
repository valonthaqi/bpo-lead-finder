import { describe, expect, it } from "vitest";
import { extractPage } from "./extract";

const html = `
<html>
  <head>
    <title>Final Expense Call Center | Zards BPO</title>
    <style>.hidden { color: red; }</style>
  </head>
  <body>
    <script>var ignored = "script text";</script>
    <h1>Final expense   live transfers</h1>
    <a href="tel:+92 300 1234567">Call us</a>
    <a href="mailto:info@zardsbpo.com?subject=Hi">Email</a>
    <p>Write to sales@zardsbpo.com or john.smith@zardsbpo.com</p>
    <address>Shahrah-e-Faisal,
      Karachi</address>
    <a href="/contact-us#form">Contact</a>
    <a href="https://zardsbpo.com/about">About us</a>
    <a href="https://www.zardsbpo.com/services">Services</a>
    <a href="https://other.com/contact">Partner contact</a>
    <a href="mailto:contact@zardsbpo.com">Contact email</a>
    <a href="https://www.linkedin.com/company/zards-bpo?trk=1">LinkedIn</a>
    <a href="https://www.linkedin.com/in/john-smith">John</a>
    <a href="https://www.facebook.com/zardsbpo">Facebook</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
  </body>
</html>`;

const page = extractPage(html, "https://zardsbpo.com/", "PK");

describe("extractPage", () => {
  it("uses the title part matching the domain as the company name", () => {
    expect(page.companyName).toBe("Zards BPO");
  });

  it("prefers the site name when the page declares one", () => {
    const named = extractPage(
      '<meta property="og:site_name" content="Zards Group"><title>Home</title>',
      "https://zardsbpo.com/",
      "PK",
    );
    expect(named.companyName).toBe("Zards Group");
  });

  it("ignores a site name that is really a URL", () => {
    const named = extractPage(
      '<meta property="og:site_name" content="https://www.zardsbpo.com"><title>Welcome</title>',
      "https://zardsbpo.com/",
      "PK",
    );
    expect(named.companyName).toBe("zardsbpo");
  });

  it("falls back to the domain when the title doesn't help", () => {
    const untitled = extractPage(
      "<title>Welcome home</title>",
      "https://zardsbpo.com/",
      "PK",
    );
    expect(untitled.companyName).toBe("zardsbpo");
  });

  it("leaves scripts and styles out of the text and collapses spaces", () => {
    expect(page.text).toContain("Final expense live transfers");
    expect(page.text).not.toContain("script text");
    expect(page.text).not.toContain("color: red");
  });

  it("finds phone numbers in E.164", () => {
    expect(page.phones).toEqual(["+923001234567"]);
  });

  it("does not turn a US number on the page into a local one", () => {
    const usNumber = extractPage(
      "<title>Home</title><p>Call 888.766.4482 today</p>",
      "https://a.com/",
      "PK",
    );
    expect(usNumber.phones).toEqual(["+18887664482"]);
  });

  it("keeps company emails and drops personal ones", () => {
    expect(page.emails.sort()).toEqual([
      "contact@zardsbpo.com",
      "info@zardsbpo.com",
      "sales@zardsbpo.com",
    ]);
  });

  it("reads the address tag", () => {
    expect(page.address).toBe("Shahrah-e-Faisal, Karachi");
  });

  it("keeps company social pages and drops personal profiles and share links", () => {
    expect(page.socialLinks).toEqual([
      "https://www.linkedin.com/company/zards-bpo",
      "https://www.facebook.com/zardsbpo",
    ]);
  });

  it("follows only same-site contact links, without fragments, at most two", () => {
    expect(page.contactLinks).toEqual([
      "https://zardsbpo.com/contact-us",
      "https://zardsbpo.com/about",
    ]);
  });

  it("handles a page with nothing in it", () => {
    const empty = extractPage("", "https://a.com/", "PK");
    expect(empty.phones).toEqual([]);
    expect(empty.address).toBeNull();
  });
});
