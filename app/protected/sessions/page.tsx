"use client";

import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { kgToLbs } from "@/utils/units";
import { Button, Card, Chip, Pagination, Skeleton } from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Helper functions for stats calculations
const calculateStreakDays = (sessions: any[]) => {
  if (!sessions.length) return 0;

  // Sort sessions by date
  const sortedDates = sessions
    .map((s) => new Date(s.started_at).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a); // Descending (most recent first)

  // Remove duplicates (same day)
  const uniqueDates = Array.from(new Set(sortedDates));

  let streak = 1;
  const MS_PER_DAY = 86400000;

  // Count consecutive days
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const diff = uniqueDates[i] - uniqueDates[i + 1];
    if (diff === MS_PER_DAY) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const calculateTotalWeight = (sessions: any[]) => {
  return sessions.reduce((total, session) => {
    const sessionTotal = session.session_exercises.reduce(
      (acc: number, ex: any) => acc + ex.weight * ex.reps,
      0
    );
    return total + sessionTotal;
  }, 0);
};

const calculateTotalSets = (sessions: any[]) => {
  return sessions.reduce(
    (total, session) => total + session.session_exercises.length,
    0
  );
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatDuration = (start: string, end: string) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diff = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const getMonthName = (date: Date) => {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [months, setMonths] = useState<string[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(10);

  const { useMetric, isLoading: loadingPreferences } = useUnitPreference();

  const supabase = createClient();

  // Fetch sessions with workout and exercise details
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated");
          return;
        }

        const { data, error } = await supabase
          .from("sessions")
          .select(
            `
            *,
            workout:workouts(*),
            session_exercises(*)
          `
          )
          .eq("user_id", user.id)
          .order("started_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setSessions(data);

          // Extract unique months from sessions
          const allMonths = data.map((s) =>
            getMonthName(new Date(s.started_at))
          );
          const uniqueMonths = Array.from(new Set(allMonths));
          setMonths(uniqueMonths);

          // Set default selected month to most recent
          if (uniqueMonths.length > 0) {
            setSelectedMonth(uniqueMonths[0]);
          }
        }
      } catch (err: any) {
        console.error("Error fetching sessions:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Filter sessions whenever selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      const filtered = sessions.filter((session) => {
        const sessionMonth = getMonthName(new Date(session.started_at));
        return sessionMonth === selectedMonth;
      });
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions(sessions);
    }
    // Reset to first page whenever filter changes
    setCurrentPage(1);
  }, [selectedMonth, sessions]);

  // Calculate paginated sessions - add this before grouping
  const paginateSessionsByDate = () => {
    // First group all filtered sessions by date
    const groupedByDate = filteredSessions.reduce(
      (groups: any, session: any) => {
        const date = new Date(session.started_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(session);
        return groups;
      },
      {}
    );

    // Convert to array of [date, sessions] pairs for easier pagination
    const dateSessionPairs = Object.entries(groupedByDate);

    // Calculate pagination indexes
    const indexOfLastItem = currentPage * sessionsPerPage;
    const indexOfFirstItem = indexOfLastItem - sessionsPerPage;

    // Slice the array for current page
    const currentItems = dateSessionPairs.slice(
      indexOfFirstItem,
      indexOfLastItem
    );

    // Convert back to object
    return currentItems.reduce((acc: any, [date, sessions]) => {
      acc[date] = sessions;
      return acc;
    }, {});
  };

  // Use this function instead of directly using sessionsByDate
  const paginatedSessionsByDate = isLoading ? {} : paginateSessionsByDate();

  // Calculate total pages
  const totalPages = Math.ceil(
    Object.keys(
      filteredSessions.reduce((groups: any, session: any) => {
        const date = new Date(session.started_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(session);
        return groups;
      }, {})
    ).length / sessionsPerPage
  );

  const displayTotalWeight = (totalKg: number): number | string => {
    if (loadingPreferences) return "-";

    if (useMetric) {
      return Math.floor(totalKg);
    } else {
      return Math.floor(kgToLbs(totalKg));
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <PageTitle title="Session History" />
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <PageTitle title="Workout History" />

      {/* Stats Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-4">Workout Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {isLoading ? (
            <>
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </>
          ) : (
            <>
              <div className="p-3 bg-creamyBeige rounded-lg">
                <div className="text-3xl font-bold">{sessions.length}</div>
                <div className="text-sm">Total Sessions</div>
              </div>
              <div className="p-3 bg-creamyBeige rounded-lg">
                <div className="text-3xl font-bold">
                  {calculateStreakDays(sessions)}
                </div>
                <div className="text-sm">Day Streak</div>
              </div>
              <div className="p-3 bg-creamyBeige rounded-lg">
                <div className="text-3xl font-bold">
                  {calculateTotalSets(sessions)}
                </div>
                <div className="text-sm">Sets Completed</div>
              </div>
              <div className="p-3 bg-creamyBeige rounded-lg">
                <div className="text-3xl font-bold">
                  {displayTotalWeight(calculateTotalWeight(sessions))}
                </div>
                <div className="text-sm">
                  Total Volume ({useMetric ? "kg" : "lbs"})
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex gap-2 overflow-x-auto py-2">
        {isLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ) : (
          months.map((month) => (
            <Button
              key={month}
              size="sm"
              variant={selectedMonth === month ? "solid" : "flat"}
              onPress={() => setSelectedMonth(month)}
            >
              {month}
            </Button>
          ))
        )}
      </div>

      {/* Session Timeline */}
      <div className="space-y-8">
        {isLoading ? (
          <>
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </>
        ) : Object.keys(paginatedSessionsByDate).length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <p className="text-xl font-semibold text-gray-500">
              No sessions found for this month
            </p>
            <p className="text-gray-400 mt-2">
              Try selecting a different month or start a new workout
            </p>
          </div>
        ) : (
          <>
            {Object.entries(paginatedSessionsByDate).map(
              ([date, dateSessions]) => (
                <div key={date}>
                  <h3 className="text-md font-medium text-gray-500 mb-3">
                    {formatDate(date)}
                  </h3>
                  <div className="space-y-4">
                    {(dateSessions as any[]).map((session) => (
                      <Card
                        key={session.id}
                        className="p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Make header section stack on mobile, side-by-side on larger screens */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <div>
                            <h3 className="text-lg font-bold mb-2">
                              {session.workout.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span>
                                {formatDuration(
                                  session.started_at,
                                  session.ended_at
                                )}
                              </span>
                              <span>•</span>
                              <span>
                                {session.session_exercises.length} sets
                              </span>
                            </div>
                          </div>
                          <Chip
                            size="sm"
                            color="primary"
                            variant="flat"
                            className="self-start"
                          >
                            {new Date(session.started_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </Chip>
                        </div>

                        <Button
                          as={Link}
                          href={`/protected/sessions/${session.id}`}
                          color="primary"
                          variant="flat"
                          size="sm"
                          className="mt-2"
                        >
                          View Details
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  total={totalPages}
                  initialPage={currentPage}
                  page={currentPage}
                  onChange={(page) => setCurrentPage(page)}
                  color="primary"
                  showControls
                  size="lg"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
