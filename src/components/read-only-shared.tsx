import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function CalendarPageContent({
  title,
  events
}: {
  title: string;
  events: Array<{ id: string; title: string; description: string | null; type: string; startsAt: Date }>;
}) {
  return (
    <main className="page-shell">
      <PageHeader title={title} description="Eventos escolares e prazos relevantes." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <Badge variant="info">{event.type}</Badge>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{event.description}</p>
              <p className="mt-3">{formatDate(event.startsAt)}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

export function AnnouncementsPageContent({
  title,
  announcements
}: {
  title: string;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    audience: string;
    publishedAt: Date;
  }>;
}) {
  return (
    <main className="page-shell">
      <PageHeader title={title} description="Comunicados publicados pela escola." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <Badge variant="info">{announcement.audience}</Badge>
              <CardTitle>{announcement.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{announcement.content}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {formatDate(announcement.publishedAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
