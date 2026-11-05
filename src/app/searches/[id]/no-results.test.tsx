import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoResults } from "./no-results";

describe("NoResults", () => {
  it("shows a loading state while the search is running", () => {
    expect(renderToString(<NoResults isRunning />)).toContain("Looking for");
  });

  it("shows an empty state when a finished search found nothing", () => {
    expect(renderToString(<NoResults isRunning={false} />)).toContain(
      "No companies found.",
    );
  });
});
