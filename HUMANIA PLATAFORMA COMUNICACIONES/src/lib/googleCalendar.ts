import { CalendarEvent } from "../types";

export async function fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const timeMin = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&singleEvents=true&orderBy=startTime&maxResults=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API responded with status ${response.status}`);
    }

    const data = await response.json();
    return (data.items || []) as CalendarEvent[];
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    throw error;
  }
}

export async function createCalendarEvent(
  accessToken: string,
  eventData: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
  }
): Promise<CalendarEvent> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          summary: eventData.summary,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: eventData.startDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create calendar event: ${response.statusText} (${errText})`);
    }

    const data = await response.json();
    return data as CalendarEvent;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}
