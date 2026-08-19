import { createFileRoute } from "@tanstack/react-router";
import { SITE_PAGES } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const today = new Date().toISOString().slice(0, 10);
        const urls = SITE_PAGES.map(
          (p) => `  <url>
    <loc>${origin}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.path === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${p.path === "/" ? "1.0" : "0.7"}</priority>
  </url>`,
        ).join("\n");
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
