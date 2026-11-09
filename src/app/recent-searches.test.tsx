import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecentSearches } from "./recent-searches";

describe("RecentSearches", () => {
  it("shows an empty state when there are no searches", () => {
    expect(renderToString(<RecentSearches searches={[]} />)).toContain(
      "No searches yet.",
    );
  });

  it("links each search to its results", () => {
    const html = renderToString(
      <RecentSearches
        searches={[
          {
            id: 7,
            countryId: "pakistan",
            marketId: "english",
            campaignId: "medicare",
            status: "completed",
            companiesFound: 12,
          },
        ]}
      />,
    );
    expect(html).toContain("/searches/7");
    expect(html).toContain("Pakistan, English market, Medicare");
    expect(html).toContain("Finished");
  });

  it("shows who ran each search only when asked", () => {
    const search = {
      id: 7,
      countryId: "pakistan",
      marketId: "english",
      campaignId: "medicare",
      status: "completed",
      companiesFound: 12,
      ranBy: "agent@example.com",
    };
    expect(
      renderToString(<RecentSearches searches={[search]} showRanBy />),
    ).toContain("agent@example.com");
    expect(
      renderToString(<RecentSearches searches={[search]} />),
    ).not.toContain("agent@example.com");
  });
});
