import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchForm } from "./search-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SearchForm", () => {
  it("is sent from the server with the search button disabled", () => {
    const html = renderToString(<SearchForm />);
    const [button] = html.match(/<button[^>]*>/) ?? [""];
    expect(button).toContain('type="submit"');
    expect(button).toContain("disabled");
  });
});
