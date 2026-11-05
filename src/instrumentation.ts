export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { markActiveSearchesInterrupted } = await import("./lib/searches");
    await markActiveSearchesInterrupted();
  }
}
