"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  tags: string[];
};

type ArticleDetail = Article & { body: string };

export default function HelpPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ArticleDetail | null>(null);

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/v1/knowledge-base${params}`)
      .then((r) => r.json())
      .then(({ data }) => setArticles(data || []))
      .finally(() => setLoading(false));
  }, [search]);

  async function openArticle(slug: string) {
    const res = await fetch(`/api/v1/knowledge-base?slug=${slug}`);
    if (res.ok) setSelected((await res.json()).data);
  }

  if (selected) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Help
        </Button>
        <div>
          <Badge variant="outline" className="mb-2">{selected.category}</Badge>
          <h1 className="text-2xl font-bold">{selected.title}</h1>
          <p className="text-muted-foreground mt-1">{selected.summary}</p>
        </div>
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none">
            {selected.body.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = new Map<string, Article[]>();
  for (const a of articles) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category)!.push(a);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Help Center</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {search ? "No articles found." : "No help articles published yet."}
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([category, arts]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-2">{category}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {arts.map((a) => (
                <Card
                  key={a.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openArticle(a.slug)}
                >
                  <CardContent className="p-4">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
