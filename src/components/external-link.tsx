function isWebLink(url: string) {
  return url.startsWith("https://") || url.startsWith("http://");
}

export function ExternalLink({ url, label }: { url: string; label: string }) {
  if (!isWebLink(url)) return <span>{label}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="wrap-anywhere text-primary hover:underline"
    >
      {label}
    </a>
  );
}
