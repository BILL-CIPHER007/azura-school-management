"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeacherSection } from "@/components/teacher/teacher-ui";
import { formatEventDateTime } from "@/lib/calendar-events";
import { eventTypeLabel } from "@/lib/teacher-labels";
import { cn } from "@/lib/utils";

type CalendarEventItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startsAt: string;
  startTime?: string | null;
  endTime?: string | null;
  academicYear: {
    year: number;
  };
  classroomNames?: string[];
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function monthTitle(date: Date) {
  const title = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getDate() === second.getDate() &&
    first.getMonth() === second.getMonth() &&
    first.getFullYear() === second.getFullYear()
  );
}

function classroomLabel(names?: string[]) {
  if (!names?.length) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function eventSortValue(event: CalendarEventItem) {
  return `${event.startsAt.slice(0, 10)}T${event.startTime ?? "00:00"}`;
}

export function ProfessorCalendarBoard({ events }: { events: CalendarEventItem[] }) {
  const today = new Date();
  const [activeMonth, setActiveMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((first, second) => eventSortValue(first).localeCompare(eventSortValue(second))),
    [events]
  );
  const selectedEvent = sortedEvents.find((event) => event.id === selectedEventId);
  const upcomingEvents = useMemo(() => {
    const firstEvents = sortedEvents.slice(0, 6);
    if (!selectedEvent || firstEvents.some((event) => event.id === selectedEvent.id)) return firstEvents;
    return [...firstEvents, selectedEvent].sort((first, second) => eventSortValue(first).localeCompare(eventSortValue(second)));
  }, [selectedEvent, sortedEvents]);

  const monthEvents = sortedEvents.filter((event) => {
    const eventDate = new Date(event.startsAt);
    return eventDate.getMonth() === activeMonth.getMonth() && eventDate.getFullYear() === activeMonth.getFullYear();
  });

  const daysInMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1).getDay();
  const blankDays = (firstWeekday + 6) % 7;
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  function moveMonth(direction: -1 | 1) {
    setSelectedEventId(null);
    setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId);
    window.requestAnimationFrame(() => {
      document.getElementById(`teacher-calendar-event-${eventId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <TeacherSection
        title={monthTitle(activeMonth)}
        description="Visão mensal simples da agenda escolar."
        action={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Próximo mês" onClick={() => moveMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border text-sm">
          {weekDays.map((day) => (
            <div key={day} className="bg-school-primary-soft px-2 py-2 text-center font-semibold text-school-navy">
              {day}
            </div>
          ))}
          {Array.from({ length: blankDays }, (_, index) => (
            <div key={`blank-${index}`} className="min-h-24 bg-surface" />
          ))}
          {monthDays.map((day) => {
            const date = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), day);
            const dayEvents = monthEvents.filter((event) => isSameDay(new Date(event.startsAt), date));
            const hiddenEvents = Math.max(0, dayEvents.length - 2);
            const isToday = isSameDay(date, today);

            return (
              <div key={day} className={cn("min-h-24 bg-surface p-2", isToday && "bg-school-primary-soft/35")}>
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-text-muted",
                    isToday && "bg-school-primary text-white"
                  )}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => selectEvent(event.id)}
                      className={cn(
                        "block w-full truncate rounded bg-school-primary-soft px-1.5 py-1 text-left text-xs font-medium text-school-primary transition-colors hover:bg-school-blue-100",
                        selectedEventId === event.id && "bg-school-primary text-white hover:bg-school-primary"
                      )}
                    >
                      {event.title}
                    </button>
                  ))}
                  {hiddenEvents ? (
                    <span className="inline-flex rounded bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-text-secondary">
                      +{hiddenEvents}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </TeacherSection>

      <TeacherSection title="Próximos eventos">
        <div className="space-y-3">
          {upcomingEvents.map((event) => {
            const eventDate = new Date(event.startsAt);
            const classes = classroomLabel(event.classroomNames);
            const selected = selectedEventId === event.id;

            return (
              <article
                key={event.id}
                id={`teacher-calendar-event-${event.id}`}
                className={cn(
                  "rounded-lg border border-border p-3 transition-colors",
                  selected && "border-school-primary bg-school-primary-soft/45 ring-1 ring-school-primary/15"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-school-primary-soft text-school-navy">
                    <strong className="text-base leading-none">{String(eventDate.getDate()).padStart(2, "0")}</strong>
                    <span className="mt-1 text-[10px] font-semibold uppercase">
                      {eventDate.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-school-navy">{event.title}</h3>
                      <Badge variant="info">{eventTypeLabel(event.type)}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {formatEventDateTime({ startsAt: eventDate, startTime: event.startTime, endTime: event.endTime })}
                    </p>
                    {classes ? <p className="mt-1 text-xs font-medium text-school-primary">{classes}</p> : null}
                    {event.description ? <p className="mt-2 text-sm text-text-secondary">{event.description}</p> : null}
                    <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Ano letivo {event.academicYear.year}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          {!upcomingEvents.length ? (
            <p className="text-sm text-text-secondary">Nenhum evento encontrado para o filtro selecionado.</p>
          ) : null}
        </div>
      </TeacherSection>
    </section>
  );
}
