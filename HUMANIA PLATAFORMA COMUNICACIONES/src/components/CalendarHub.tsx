import React, { useState, useEffect } from "react";
import { Contact, CalendarEvent } from "../types";
import { fetchCalendarEvents, createCalendarEvent } from "../lib/googleCalendar";
import { 
  Calendar, Clock, Plus, RefreshCw, Video, MapPin, 
  Sparkles, CheckCircle2, AlertCircle, CalendarDays, Loader2, ArrowRight
} from "lucide-react";

interface CalendarHubProps {
  user: any;
  accessToken: string | null;
  contacts: Contact[];
  onGoogleLogin: () => void;
}

export default function CalendarHub({ user, accessToken, contacts, onGoogleLogin }: CalendarHubProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Create Event Form state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventDuration, setEventDuration] = useState("30"); // minutes
  const [customNotes, setCustomNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch upcoming events
  const loadEvents = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetchedEvents = await fetchCalendarEvents(accessToken);
      setEvents(fetchedEvents);
    } catch (err: any) {
      setErrorMsg("Failed to synchronize with Google Calendar. Make sure your account allows Calendar API access.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadEvents();
    }
  }, [accessToken]);

  // Handle schedule creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!selectedContactId) {
      alert("Please select an agent.");
      return;
    }
    if (!eventDate || !eventTime) {
      alert("Please select a valid date and time.");
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const startDateTimeStr = `${eventDate}T${eventTime}:00`;
      const startObj = new Date(startDateTimeStr);
      const endObj = new Date(startObj.getTime() + Number(eventDuration) * 60 * 1000);
      
      const summary = `Quantum Hive Session: ${contact.name} (${contact.role})`;
      const description = `Immersive digital consultation scheduled via Quantum Hive. 
Agent Specialty: ${contact.tagline}
Mode: High-Fidelity Call Simulation
Vocal profile: ${contact.voiceTone} tone, ${contact.personalityStyle} demeanor.

Notes: ${customNotes || "No custom notes entered."}`;

      await createCalendarEvent(accessToken, {
        summary,
        description,
        location: "Quantum Hive Virtual Communication Core",
        startDateTime: startObj.toISOString(),
        endDateTime: endObj.toISOString(),
      });

      setSuccessMsg(`Session successfully booked with ${contact.name}!`);
      setIsCreating(false);
      
      // Reset form fields
      setSelectedContactId("");
      setEventDate("");
      setEventTime("");
      setCustomNotes("");
      
      // Reload events to show updated list
      await loadEvents();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to schedule session event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-16" id="calendar-hub-root">
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-brand-primary uppercase flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-brand-primary" />
            <span>Google Calendar Sync</span>
          </h2>
          <p className="text-[11px] text-white/50">Manage your real-world appointments and AI agent bookings seamlessly.</p>
        </div>

        {accessToken && (
          <button
            onClick={loadEvents}
            disabled={isLoading}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
            title="Refresh Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        )}
      </div>

      {/* Auth Gate */}
      {!accessToken ? (
        <div className="glass-panel p-6 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Google Calendar Disconnected</h3>
            <p className="text-[11px] text-white/50 max-w-sm mx-auto leading-relaxed">
              Connect your Google account to retrieve real-time schedule information and block times for therapy, mentoring, or custom coaching.
            </p>
          </div>
          <button
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover rounded-xl font-bold font-sans text-xs transition-all cursor-pointer"
          >
            <span>Connect Google Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Alerts / Feedback */}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-[11px] flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-[11px] flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Trigger - Book Session */}
          {!isCreating ? (
            <button
              onClick={() => {
                setIsCreating(true);
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg rounded-2xl font-bold font-mono text-[11px] tracking-wide transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>SCHEDULE SESSION WITH AI AGENT</span>
            </button>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreateEvent} className="glass-panel p-4 rounded-3xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Book Smart Call Session</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-[10px] font-mono text-white/40 hover:text-white"
                >
                  CANCEL
                </button>
              </div>

              {/* Agent Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Select Active Agent</label>
                <select
                  required
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                >
                  <option value="">-- Choose an Agent --</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Session Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Start Time</label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
              </div>

              {/* Duration & Custom Notes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Duration</label>
                  <select
                    value={eventDuration}
                    onChange={(e) => setEventDuration(e.target.value)}
                    className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Goal / Focus</label>
                  <input
                    type="text"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="e.g. Cognitive therapy, tarot reading, legal advice..."
                    className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover disabled:opacity-50 font-bold font-mono text-[10px] tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Calendar className="w-3.5 h-3.5" />
                )}
                <span>CONFIRM BOOKING IN GOOGLE CALENDAR</span>
              </button>
            </form>
          )}

          {/* Events Feed Container */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Upcoming Calendar Entries</h3>
            
            {isLoading && events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/50 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                <span className="text-xs font-mono">Synchronizing events...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="glass-panel p-6 rounded-3xl text-center space-y-1.5 text-white/50">
                <p className="text-xs">No upcoming events scheduled.</p>
                <p className="text-[9px] text-white/30">Your calendar is clear. Create a session with an AI agent to see it reflected here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {events.map((evt) => {
                  const isQuantumHive = evt.summary.toLowerCase().includes("quantum hive") || evt.summary.toLowerCase().includes("session:");
                  const startDate = evt.start?.dateTime ? new Date(evt.start.dateTime) : (evt.start?.date ? new Date(evt.start.date) : null);
                  const endDate = evt.end?.dateTime ? new Date(evt.end.dateTime) : (evt.end?.date ? new Date(evt.end.date) : null);
                  
                  const formattedDate = startDate ? startDate.toLocaleDateString(undefined, { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  }) : "All-day";

                  const formattedTime = startDate && evt.start?.dateTime ? `${startDate.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} - ${endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}` : "All-day";

                  return (
                    <div 
                      key={evt.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isQuantumHive 
                          ? "bg-gradient-to-r from-brand-primary/10 to-brand-surface border-brand-primary/25 shadow-[0_0_15px_-3px_rgba(212,175,55,0.15)]" 
                          : "bg-brand-surface/40 border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 leading-snug">
                            {isQuantumHive && <Sparkles className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 animate-pulse" />}
                            <span>{evt.summary}</span>
                          </h4>
                          
                          {evt.description && (
                            <p className="text-[10px] text-white/40 leading-relaxed max-w-lg line-clamp-2">
                              {evt.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-white/50 pt-1">
                            <span className="flex items-center gap-1 text-brand-primary">
                              <Calendar className="w-3 h-3" />
                              <span>{formattedDate}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-white/30" />
                              <span>{formattedTime}</span>
                            </span>
                            {evt.location && (
                              <span className="flex items-center gap-1 max-w-[150px] truncate">
                                <MapPin className="w-3 h-3 text-white/30" />
                                <span className="truncate">{evt.location}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {evt.htmlLink && (
                          <a
                            href={evt.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-mono font-bold text-brand-primary hover:underline flex-shrink-0 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg"
                          >
                            OPEN
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
