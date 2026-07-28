import React, { useState, useEffect } from "react";
import { Contact } from "../types";
import { fetchGmailMessages, sendGmailMessage, GmailMessage } from "../lib/gmail";
import { 
  Mail, Send, RefreshCw, Plus, CheckCircle2, AlertCircle, 
  Loader2, User, Clock, ChevronRight, Inbox, BookOpen, ChevronDown, Reply
} from "lucide-react";

interface GmailHubProps {
  user: any;
  accessToken: string | null;
  contacts: Contact[];
  onGoogleLogin: () => void;
}

export default function GmailHub({ user, accessToken, contacts, onGoogleLogin }: GmailHubProps) {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compose state
  const [isComposing, setIsComposing] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Email reader state
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

  const loadEmails = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetched = await fetchGmailMessages(accessToken);
      setEmails(fetched);
    } catch (err: any) {
      setErrorMsg("Failed to synchronize with Gmail. Ensure your Google account has Gmail authorization.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadEmails();
    }
  }, [accessToken]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!toEmail || !subject || !body) {
      alert("All fields are required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendGmailMessage(accessToken, {
        to: toEmail,
        subject,
        body
      });
      setSuccessMsg(`Email successfully sent to ${toEmail}!`);
      setIsComposing(false);
      setToEmail("");
      setSubject("");
      setBody("");
      
      // Reload inbox
      await loadEmails();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch Gmail message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetRecipient = (contactEmail: string, contactName: string) => {
    setToEmail(contactEmail);
    setSubject(`Quantum Hive Consultation Follow-up with ${contactName}`);
    setBody(`Dear ${contactName},\n\nI wanted to reach out regarding our conversation on the Quantum Hive platform. Let's schedule another session soon.\n\nWarm regards,\n${user?.displayName || "Quantum Hive User"}`);
    setIsComposing(true);
    setSelectedEmail(null);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-16 animate-fade-in" id="gmail-hub-root">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-brand-primary uppercase flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-brand-primary" />
            <span>Gmail Workspace Sync</span>
          </h2>
          <p className="text-[11px] text-white/50">Manage your connected Gmail inbox and dispatch reports to your human connections.</p>
        </div>

        {accessToken && (
          <button
            onClick={loadEmails}
            disabled={isLoading}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        )}
      </div>

      {/* Auth Gate */}
      {!accessToken ? (
        <div className="glass-panel p-6 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Gmail Access Pending</h3>
            <p className="text-[11px] text-white/50 max-w-sm mx-auto leading-relaxed">
              Connect your Google account to authorize reading from your primary inbox and sending emails securely.
            </p>
          </div>
          <button
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover rounded-xl font-bold font-sans text-xs transition-all cursor-pointer"
          >
            <span>Connect Google Gmail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Status Banners */}
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

          {/* Quick Contacts to Email section */}
          <div className="glass-panel p-3 rounded-2xl space-y-2">
            <p className="text-[9px] uppercase font-mono tracking-widest text-white/40 font-bold">Quick Email to Hive Contacts</p>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handlePresetRecipient(c.id + "@gmail.com", c.name)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-brand-primary/20 hover:text-brand-primary border border-white/5 rounded-xl text-[10px] font-mono transition-all flex-shrink-0 cursor-pointer"
                >
                  <img src={c.avatar} alt={c.name} className="w-4 h-4 rounded-full object-cover" />
                  <span>Email {c.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger - Write New Email */}
          {!isComposing ? (
            <button
              onClick={() => {
                setIsComposing(true);
                setSelectedEmail(null);
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg rounded-2xl font-bold font-mono text-[11px] tracking-wide transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>COMPOSE GMAIL MESSAGE</span>
            </button>
          ) : (
            /* Email Compose Form */
            <form onSubmit={handleSendEmail} className="glass-panel p-4 rounded-3xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Draft Message</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="text-[10px] font-mono text-white/40 hover:text-white"
                >
                  CANCEL
                </button>
              </div>

              {/* Recipient */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/40 font-bold">To (Recipient Email)</label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Enter email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write your email body here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none font-sans"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover disabled:opacity-50 font-bold font-mono text-[10px] tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>DISPATCH VIA GMAIL CORE</span>
              </button>
            </form>
          )}

          {/* Inbox Feed / Reading panel */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Connected Inbox Feed</h3>

            {isLoading && emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/50 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                <span className="text-xs font-mono">Retrieving mail stream...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="glass-panel p-6 rounded-3xl text-center space-y-1.5 text-white/50">
                <Inbox className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-xs">No email threads retrieved.</p>
                <p className="text-[9px] text-white/30">Your inbox appears empty or awaiting query permission.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {emails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <div 
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(isSelected ? null : email);
                        setIsComposing(false);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-brand-surface border-brand-primary/40 shadow-[0_0_15px_-3px_rgba(212,175,55,0.15)]" 
                          : "bg-brand-surface/40 hover:bg-brand-surface/60 border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                            <span className="text-brand-primary truncate max-w-[150px] font-bold">{email.from}</span>
                            <span className="flex items-center gap-1 text-[9px] flex-shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{email.date.split(",")[0] || email.date}</span>
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug truncate">
                            {email.subject}
                          </h4>

                          <p className="text-[10px] text-white/50 leading-relaxed truncate">
                            {email.snippet}
                          </p>

                          {/* Email Body Expander */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-fade-in text-xs text-white/85 bg-[#070a10]/50 p-3 rounded-xl max-h-[300px] overflow-y-auto no-scrollbar font-sans whitespace-pre-wrap leading-relaxed">
                              {email.body || email.snippet}
                              
                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setToEmail(email.from.match(/<([^>]+)>/)?.[1] || email.from);
                                    setSubject(`Re: ${email.subject}`);
                                    setBody(`\n\nOn ${email.date}, ${email.from} wrote:\n> ` + (email.body || email.snippet).replace(/\n/g, "\n> "));
                                    setIsComposing(true);
                                    setSelectedEmail(null);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover font-bold font-mono text-[10px] rounded-lg tracking-wide transition-all"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>REPLY</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${isSelected ? "rotate-180 text-brand-primary" : ""}`} />
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
