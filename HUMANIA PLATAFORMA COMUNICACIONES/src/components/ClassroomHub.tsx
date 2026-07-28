import React, { useState, useEffect } from "react";
import { 
  fetchClassroomCourses, fetchCourseAnnouncements, fetchCourseWork,
  ClassroomCourse, ClassroomAnnouncement, ClassroomCourseWork 
} from "../lib/classroom";
import { 
  BookOpen, Calendar, Award, RefreshCw, ChevronRight, AlertCircle, 
  Loader2, CheckCircle2, Send, Plus, Bell, Clock, Compass, FileText, UserCheck
} from "lucide-react";

interface ClassroomHubProps {
  user: any;
  accessToken: string | null;
  onGoogleLogin: () => void;
}

export default function ClassroomHub({ user, accessToken, onGoogleLogin }: ClassroomHubProps) {
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [coursework, setCoursework] = useState<ClassroomCourseWork[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New announcement draft state
  const [isPosting, setIsPosting] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  const loadCourses = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetched = await fetchClassroomCourses(accessToken);
      setCourses(fetched);
      if (fetched.length > 0 && !selectedCourse) {
        setSelectedCourse(fetched[0]);
      }
    } catch (err: any) {
      setErrorMsg("Failed to synchronize with Google Classroom. Verify your account permissions.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    if (!accessToken) return;
    setIsDetailsLoading(true);
    try {
      const [annData, cwData] = await Promise.all([
        fetchCourseAnnouncements(accessToken, courseId),
        fetchCourseWork(accessToken, courseId)
      ]);
      setAnnouncements(annData);
      setCoursework(cwData);
    } catch (err) {
      console.error("Error fetching course details:", err);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadCourses();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && selectedCourse) {
      loadCourseDetails(selectedCourse.id);
    }
  }, [accessToken, selectedCourse]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedCourse || !announcementText) return;
    setIsDetailsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Direct post to Google Classroom announcements
      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${selectedCourse.id}/announcements`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            text: announcementText
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Classroom API responded with status ${response.status}`);
      }

      setSuccessMsg("Announcement posted successfully to Google Classroom course feed!");
      setAnnouncementText("");
      setIsPosting(false);
      
      // Refresh course details
      await loadCourseDetails(selectedCourse.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post assignment announcement. Ensure you are enrolled as a teacher or have write access.");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-16 animate-fade-in" id="classroom-hub-root">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-brand-primary uppercase flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-primary" />
            <span>Google Classroom Workspace</span>
          </h2>
          <p className="text-[11px] text-white/50">Manage your course syllabus, view announcements, and track outstanding coursework.</p>
        </div>

        {accessToken && (
          <button
            onClick={loadCourses}
            disabled={isLoading}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
            title="Refresh Courses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        )}
      </div>

      {/* Auth Gate */}
      {!accessToken ? (
        <div className="glass-panel p-6 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <BookOpen className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Classroom Access Pending</h3>
            <p className="text-[11px] text-white/50 max-w-sm mx-auto leading-relaxed">
              Connect your Google Workspace account to read your academic schedule, assignments, and courses directly in the Quantum Hive suite.
            </p>
          </div>
          <button
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover rounded-xl font-bold font-sans text-xs transition-all cursor-pointer"
          >
            <span>Connect Google Classroom</span>
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

          {/* Courses Carousel/Horizontal List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Active Enrolled Courses</span>
              <span className="text-[9px] font-mono text-brand-primary">{courses.length} ACTIVE</span>
            </div>

            {isLoading && courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/50 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                <span className="text-[10px] font-mono">Synchronizing Google Courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl text-center space-y-1.5 text-white/50">
                <Compass className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-xs">No courses registered inside Google Classroom.</p>
                <p className="text-[9px] text-white/30">Create courses or join a student roster in your Google account.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`p-3 rounded-2xl border text-left transition-all flex-shrink-0 w-[170px] space-y-1.5 cursor-pointer ${
                        isSelected 
                          ? "bg-brand-surface border-brand-primary shadow-[0_0_15px_-3px_rgba(212,175,55,0.15)] text-white" 
                          : "bg-brand-surface/30 hover:bg-brand-surface/60 border-white/5 text-white/70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <BookOpen className={`w-4 h-4 ${isSelected ? "text-brand-primary animate-pulse" : "text-white/30"}`} />
                        {course.courseState === "ACTIVE" && (
                          <span className="text-[8px] bg-brand-primary/10 text-brand-primary font-mono px-1 rounded uppercase">Live</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-bold truncate leading-snug">{course.name}</h4>
                        <p className="text-[9px] text-white/40 truncate">{course.section || "Academic Term"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Course Hub */}
          {selectedCourse && (
            <div className="space-y-4 animate-fade-in">
              {/* Active Course Banner */}
              <div className="glass-panel p-4 rounded-3xl border-brand-primary/15 bg-gradient-to-r from-brand-surface via-[#0d121c] to-brand-surface">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-md">Selected Curriculum</span>
                    <h3 className="text-xs font-bold text-white mt-1.5">{selectedCourse.name}</h3>
                    <p className="text-[10px] text-white/50">{selectedCourse.descriptionHeading || selectedCourse.description || "Interactive Classroom roster."}</p>
                  </div>
                  
                  {/* Outer alternate link */}
                  {selectedCourse.alternateLink && (
                    <a
                      href={selectedCourse.alternateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono font-semibold text-brand-primary hover:underline"
                    >
                      OPEN IN CLASSROOM ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Action: Post Announcement or Syllabus Update */}
              {!isPosting ? (
                <button
                  onClick={() => setIsPosting(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-mono text-brand-primary tracking-wide transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>POST SYLLABUS ANNOUNCEMENT</span>
                </button>
              ) : (
                <form onSubmit={handlePostAnnouncement} className="glass-panel p-4 rounded-3xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      <span>Post to Course Stream</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPosting(false)}
                      className="text-[10px] font-mono text-white/40 hover:text-white"
                    >
                      CANCEL
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-white/40 font-bold">Announcement Content</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Type announcement message to broadcast to Classroom students..."
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDetailsLoading}
                    className="w-full py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover disabled:opacity-50 font-bold font-mono text-[10px] tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDetailsLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>BROADCAST TO GOOGLE CLASSROOM</span>
                  </button>
                </form>
              )}

              {/* Coursework & Announcements grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Announcements Feed */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <Bell className="w-3 h-3 text-brand-primary" />
                    <span>Stream Broadcasts</span>
                  </h4>

                  {isDetailsLoading && announcements.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="p-4 bg-brand-surface/20 border border-white/5 rounded-2xl text-center text-[10px] text-white/40">
                      No stream updates found for this curriculum.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="p-3 bg-[#0c1018]/60 border border-white/5 rounded-2xl space-y-1.5">
                          <p className="text-xs text-white/80 leading-relaxed font-sans">{ann.text}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/30">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(ann.creationTime).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Coursework/Assignments */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-brand-primary" />
                    <span>Assignments & Materials</span>
                  </h4>

                  {isDetailsLoading && coursework.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                    </div>
                  ) : coursework.length === 0 ? (
                    <div className="p-4 bg-brand-surface/20 border border-white/5 rounded-2xl text-center text-[10px] text-white/40">
                      No coursework items registered.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {coursework.map((cw) => (
                        <div key={cw.id} className="p-3 bg-brand-surface/40 border border-white/5 rounded-2xl space-y-1.5 hover:border-brand-primary/20 transition-all">
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-[11px] font-bold text-white leading-tight">{cw.title}</h5>
                            <FileText className="w-3 h-3 text-brand-primary flex-shrink-0" />
                          </div>
                          
                          {cw.description && (
                            <p className="text-[10px] text-white/55 leading-relaxed font-sans line-clamp-2">{cw.description}</p>
                          )}

                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-white/30">
                              {new Date(cw.creationTime).toLocaleDateString()}
                            </span>

                            {cw.dueDate ? (
                              <span className="text-rose-400 font-bold bg-rose-400/5 px-1 rounded">
                                Due {cw.dueDate.day}/{cw.dueDate.month}
                              </span>
                            ) : (
                              <span className="text-white/20">No due date</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
