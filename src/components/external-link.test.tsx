import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExternalLink } from "./external-link";

describe("ExternalLink", () => {
  it("links to a web address", () => {
    expect(
      renderToString(<ExternalLink url="https://a.com" label="a" />),
    ).toContain('href="https://a.com"');
  });

  it("does not make a link from any other kind of address", () => {
    expect(
      renderToString(<ExternalLink url="javascript:alert(1)" label="a" />),
    ).not.toContain("href");
  });
});
