"use client";

import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { displayWeight, kgToLbs } from "@/utils/units";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Skeleton,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
} from "@nextui-org/react";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Dumbbell,
  Info,
  Search,
  TrendingUp,
  Trophy,
  Weight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const supabase = createClient();
  const { useMetric } = useUnitPreference();
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [activeTab, setActiveTab] = useState("progress");
  const [exercises, setExercises] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);

  // Add this filtered exercises data computed from search term
  const filteredExercises = exercises.filter(
    (exercise) =>
      exerciseSearchTerm === "" ||
      exercise.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
      (exercise.category?.name || "")
        .toLowerCase()
        .includes(exerciseSearchTerm.toLowerCase())
  );

  // Add this helper function near the top of your component
  const getSelectedExerciseName = () => {
    if (!selectedExercise) return "";
    const exercise = exercises.find((ex) => ex.id === selectedExercise);
    return exercise ? exercise.name : "";
  };

  // Fetch user's exercises and session data
  useEffect(() => {
    const fetchData = async () => {
      const loadingToast = toast.loading("Loading your fitness analytics...");

      try {
        setIsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Authentication required");
          throw new Error("Not authenticated");
        }

        // Get all exercises for the dropdown
        const { data: exercisesData } = await supabase
          .from("exercises")
          .select("id, name, category:categories(name)")
          .or(`is_default.eq.true,user_id.eq.${user.id}`);

        const { data: analyticsData, error: analyticsError } = await supabase
          .from("analytics")
          .select(
            `
          exercise_id,
          max_weight,
          max_reps,
          max_volume,
          updated_at,
          exercise:exercises(name)
        `
          )
          .eq("user_id", user.id);

        if (analyticsError) {
          throw new Error(
            `Error fetching analytics: ${analyticsError.message}`
          );
        }

        // Transform analytics data to personal records format
        const records =
          analyticsData?.map((record) => ({
            id: record.exercise_id,
            name: record.exercise?.[0]?.name,
            max_weight: record.max_weight || 0,
            max_reps: record.max_reps || 0,
            max_volume: record.max_volume || 0,
            date: record.updated_at,
          })) || [];

        setExercises(exercisesData || []);
        setPersonalRecords(records);

        // Still need session data for charts
        const { data: sessionsData } = await supabase
          .from("session_exercises")
          .select(
            `
          id, reps, weight, exercise_id, 
          exercise:exercises(name),
          session:sessions(started_at)
        `
          )
          .eq("user_id", user.id)
          .order("session(started_at)", { ascending: false });

        setSessions(sessionsData || []);
        calculateVolumeData(sessionsData || []);

        // Show success toast with key stats
        toast.success(
          `Loaded ${exercisesData?.length || 0} exercises and ${records.length || 0} personal records`,
          {
            id: loadingToast,
          }
        );
      } catch (error: any) {
        console.error("Error fetching analytics data:", error);
        toast.error(error.message || "Failed to load analytics data", {
          id: loadingToast,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Add this useEffect to process data whenever selectedExercise changes or tab switches to "progress"
  useEffect(() => {
    if (selectedExercise && activeTab === "progress" && !isChartLoading) {
      setIsChartLoading(true);

      try {
        processExerciseData(selectedExercise, sessions, selectedTimeframe);
        // Add a small delay to show the loading state
        setTimeout(() => {
          setIsChartLoading(false);
        }, 300);
      } catch (error: any) {
        toast.error(`Error processing data: ${error.message}`);
        setIsChartLoading(false);
      }
    }
  }, [selectedExercise, activeTab]);

  // Add this useEffect after your other useEffects
  useEffect(() => {
    // When selectedExercise changes but not from a search action
    if (selectedExercise && !exerciseSearchTerm) {
      const exerciseName = exercises.find(
        (ex) => ex.id === selectedExercise
      )?.name;
      if (exerciseName) {
        setExerciseSearchTerm(exerciseName);
      }
    }
  }, [selectedExercise, exercises]);

  // Handle exercise selection with loading state
  const handleExerciseChange = (value: string) => {
    setIsChartLoading(true);
    setSelectedExercise(value);

    // Find the exercise name for the toast message
    const selectedExerciseName =
      exercises.find((ex) => ex.id === value)?.name || "Exercise";

    if (sessions.length > 0) {
      try {
        processExerciseData(value, sessions, selectedTimeframe);
        // Add a small delay to show the loading state
        setTimeout(() => {
          setIsChartLoading(false);
        }, 300);
      } catch (error: any) {
        toast.error(`Error processing data: ${error.message}`);
        setIsChartLoading(false);
      }
    } else {
      setIsChartLoading(false);
    }
  };

  // Handle timeframe selection with loading state
  const handleTimeframeChange = (value: string) => {
    setIsChartLoading(true);
    setSelectedTimeframe(value);

    // Get the readable timeframe name for the toast
    const timeframeLabels: Record<string, string> = {
      week: "Last 7 Days",
      month: "Last 30 Days",
      "3months": "Last 3 Months",
      year: "Last Year",
      all: "All Time",
    };

    if (selectedExercise && sessions.length > 0) {
      try {
        processExerciseData(selectedExercise, sessions, value);
        // Add a small delay to show the loading state
        setTimeout(() => {
          setIsChartLoading(false);
          // Only show toast if data exists
          if (exerciseData.length > 0) {
            toast(`Showing data for ${timeframeLabels[value] || value}`, {
              icon: <TrendingUp className="h-4 w-4" />,
            });
          }
        }, 300);
      } catch (error) {
        console.error("Error processing exercise data:", error);
        setIsChartLoading(false);
      }
    } else {
      setIsChartLoading(false);
    }
  };

  // Handle tab changes
  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as string);

    // Show a toast only when changing to the records tab
    if (key === "records" && personalRecords.length > 0) {
      toast(`Viewing ${personalRecords.length} personal records`, {
        icon: <Weight className="h-4 w-4" />,
      });
    }

    // Ensure volume data is calculated when switching to that tab
    if (key === "volume" && sessions.length > 0) {
      calculateVolumeData(sessions);
    }
  };

  // Process data for an individual exercise
  const processExerciseData = (
    exerciseId: string,
    sessionsData: any[],
    timeframe: string
  ) => {
    // Filter for the selected exercise
    const exerciseSessions = sessionsData.filter(
      (s) => s.exercise_id === exerciseId
    );

    // Group by date
    const groupedByDate: { [key: string]: any[] } = {};
    exerciseSessions.forEach((session) => {
      const date = new Date(session.session?.started_at)
        .toISOString()
        .split("T")[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(session);
    });

    // Apply timeframe filter
    let filteredDates = Object.keys(groupedByDate);
    if (timeframe !== "all") {
      const now = new Date();
      const cutoff = new Date();

      if (timeframe === "week") {
        cutoff.setDate(now.getDate() - 7);
      } else if (timeframe === "month") {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (timeframe === "3months") {
        cutoff.setMonth(now.getMonth() - 3);
      } else if (timeframe === "year") {
        cutoff.setFullYear(now.getFullYear() - 1);
      }

      filteredDates = filteredDates.filter((date) => new Date(date) >= cutoff);
    }

    // Create chart data
    const chartData = filteredDates
      .map((date) => {
        const sessions = groupedByDate[date];
        const maxWeight = Math.max(...sessions.map((s: any) => s.weight));
        const totalVolume = sessions.reduce(
          (sum: number, s: any) => sum + s.reps * s.weight,
          0
        );

        return {
          date,
          maxWeight,
          totalVolume,
          formattedDate: new Date(date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

    setExerciseData(chartData);

    // Calculate volume trends by exercise
    const volumeByExercise = sessionsData.reduce(
      (acc: { [key: string]: number }, session) => {
        const exerciseName = session.exercise?.[0]?.name;
        const volume = session.reps * session.weight;

        if (!acc[exerciseName]) {
          acc[exerciseName] = 0;
        }
        acc[exerciseName] += volume;
        return acc;
      },
      {}
    );

    const volumeChartData = Object.entries(volumeByExercise)
      .map(([name, volume]) => ({
        name,
        volume,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10); // Top 10 by volume

    setVolumeData(volumeChartData);
  };

  // Add this function to calculate volume data independently
  const calculateVolumeData = (sessionsData: any[]) => {
    // Calculate volume trends by exercise
    const volumeByExercise = sessionsData.reduce(
      (acc: { [key: string]: number }, session) => {
        const exerciseName = session.exercise?.name;
        const volume = session.reps * session.weight;

        if (!exerciseName) return acc;

        if (!acc[exerciseName]) {
          acc[exerciseName] = 0;
        }
        acc[exerciseName] += volume;
        return acc;
      },
      {}
    );

    const volumeChartData = Object.entries(volumeByExercise)
      .map(([name, volume]) => ({
        name,
        volume,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10); // Top 10 by volume

    setVolumeData(volumeChartData);
  };

  // Filter personal records based on search
  const filteredRecords = personalRecords.filter((record) =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format the date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    // Enhanced container with better width constraints
    <div className="w-full p-4 space-y-6 animate-fadeIn">
      <PageTitle title="Fitness Analytics" className="mb-6" />

      {/* Enhanced Tabs with improved mobile appearance */}
      <div className="relative">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={handleTabChange}
          color="primary"
          variant="underlined"
          className="mb-6 w-full"
          classNames={{
            tabList:
              "gap-2 w-full relative overflow-x-auto pb-0 px-0 scrollbar-hide",
            panel: "w-full pt-3",
            cursor: "w-full",
            tab: "max-w-fit px-3 h-10 data-[selected=true]:font-medium",
            base: "w-full",
          }}
          aria-label="Analytics views"
        >
          <Tab
            key="progress"
            title={
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                <span>Progress</span>
              </div>
            }
          />
          <Tab
            key="records"
            title={
              <div className="flex items-center gap-2">
                <Trophy size={16} />
                <span>Records</span>
              </div>
            }
          />
          <Tab
            key="volume"
            title={
              <div className="flex items-center gap-2">
                <BarChart3 size={16} />
                <span>Volume</span>
              </div>
            }
          />
        </Tabs>
      </div>

      {isLoading ? (
        // Improved loading skeleton
        <div className="space-y-8">
          {/* Improved skeleton animation */}
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-12 w-full md:w-1/2 rounded-lg animate-pulse" />
            <Skeleton className="h-12 w-full md:w-1/2 rounded-lg animate-pulse" />
          </div>

          {/* More realistic chart skeleton */}
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 flex-col items-start">
              <Skeleton className="h-6 w-48 rounded mb-2 animate-pulse" />
              <Skeleton className="h-4 w-72 rounded animate-pulse" />
            </CardHeader>
            <Divider className="my-2" />
            <CardBody className="h-80">
              <Skeleton
                className="h-full w-full rounded-lg"
                disableAnimation={false}
              />
            </CardBody>
          </Card>
        </div>
      ) : (
        <>
          {/* Progress Charts View - Enhanced for better mobile experience */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              {/* Add search input above dropdowns */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search input for exercises */}
                <div className="md:w-1/2 space-y-2">
                  <label
                    className="block text-small font-medium pb-1.5"
                    id="exercise-search-label"
                  >
                    Select Exercise
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search and select an exercise..."
                      value={exerciseSearchTerm}
                      onChange={(e) => setExerciseSearchTerm(e.target.value)}
                      startContent={
                        <Search size={16} className="text-default-400" />
                      }
                      isClearable={exerciseSearchTerm.length > 0}
                      onClear={() => {
                        setExerciseSearchTerm("");
                        setSelectedExercise(null);
                      }}
                      aria-labelledby="exercise-search-label"
                      classNames={{
                        inputWrapper: "h-12",
                      }}
                      onFocus={() => setIsExerciseDropdownOpen(true)}
                      onBlur={() => {
                        // Use a delay to allow for item clicks
                        setTimeout(() => setIsExerciseDropdownOpen(false), 200);
                      }}
                    />

                    {/* Add the dropdown content here */}
                    {isExerciseDropdownOpen && filteredExercises.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-background border border-default-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <ul className="py-1">
                          {filteredExercises.map((exercise) => (
                            <li
                              key={exercise.id}
                              className="px-3 py-2 hover:bg-default-100 cursor-pointer flex items-center justify-between"
                              onMouseDown={() => {
                                // Use mouseDown instead of click to beat the onBlur timing
                                handleExerciseChange(exercise.id);
                                setExerciseSearchTerm(exercise.name);
                                setIsExerciseDropdownOpen(false);
                              }}
                            >
                              <div className="flex items-center">
                                <Dumbbell
                                  size={14}
                                  className="mr-2 text-default-500"
                                />
                                <span>{exercise.name}</span>
                              </div>
                              {exercise.category && (
                                <span className="text-xs text-default-400">
                                  {exercise.category.name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {isExerciseDropdownOpen &&
                      exerciseSearchTerm &&
                      filteredExercises.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-background border border-default-200 rounded-lg shadow-lg p-4 text-center">
                          <p className="text-default-500">No exercises found</p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Timeframe selector - add a label to match the exercise selector */}
                <div className="md:w-1/2 space-y-2">
                  <label
                    className="block text-small font-medium pb-1.5"
                    id="timeframe-select-label"
                  >
                    Timeframe
                  </label>
                  <Select
                    selectedKeys={[selectedTimeframe]}
                    onChange={(e) => handleTimeframeChange(e.target.value)}
                    isDisabled={isChartLoading || !selectedExercise}
                    aria-labelledby="timeframe-select-label" // Add this
                    classNames={{
                      trigger: "h-12",
                      value: "text-base",
                    }}
                    placeholder="Select timeframe"
                  >
                    <SelectItem key="week" value="week" textValue="Last 7 Days">
                      Last 7 Days
                    </SelectItem>
                    <SelectItem
                      key="month"
                      value="month"
                      textValue="Last 30 Days"
                    >
                      Last 30 Days
                    </SelectItem>
                    <SelectItem
                      key="3months"
                      value="3months"
                      textValue="Last 3 Months"
                    >
                      Last 3 Months
                    </SelectItem>
                    <SelectItem key="year" value="year" textValue="Last Year">
                      Last Year
                    </SelectItem>
                    <SelectItem key="all" value="all" textValue="All Time">
                      All Time
                    </SelectItem>
                  </Select>
                </div>
              </div>

              {/* Rest of your progress tab content remains unchanged */}
              {selectedExercise ? (
                isChartLoading ? (
                  // Better skeleton loading indication
                  <div className="space-y-8">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <Skeleton className="h-6 w-48 rounded mb-2" />
                        <Skeleton className="h-4 w-72 rounded" />
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-[400px] md:h-80 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <Spinner size="lg" className="mb-2" />
                          <span className="text-sm text-gray-500">
                            Loading chart data...
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                ) : exerciseData.length > 0 ? (
                  // Improved charts with better responsiveness
                  <div className="space-y-8">
                    {/* Weight Progress Chart - Enhanced for better visibility on mobile */}
                    <Card className="shadow-sm hover:shadow transition-shadow">
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <p className="text-lg font-bold">Weight Progress</p>
                            <p className="text-small text-primary font-medium">
                              {getSelectedExerciseName()}
                            </p>
                          </div>
                          <Tooltip content="Shows your maximum weight lifted for this exercise over time">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              aria-label="Weight progress information" // Add this
                            >
                              <Info size={16} className="text-default-400" />
                            </Button>
                          </Tooltip>
                        </div>
                        <p className="text-small text-default-500">
                          Maximum weight used per workout session
                        </p>
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-[400px] md:h-80 overflow-hidden">
                        {/* Optimize chart for mobile with fewer x-axis ticks */}
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={exerciseData}
                            margin={{ left: 10, right: 10, bottom: 10 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="formattedDate"
                              tick={{ fontSize: 11 }}
                              interval={window.innerWidth < 768 ? 2 : 0}
                              axisLine={false}
                            />
                            <YAxis
                              label={{
                                value: useMetric ? "kg" : "lbs",
                                angle: -90,
                                position: "insideLeft",
                                dx: -10,
                                fontSize: 12,
                              }}
                              tickFormatter={(value) => `${value}`}
                              axisLine={false}
                              dx={-5}
                              tickLine={false}
                            />
                            <RechartsTooltip
                              formatter={(value) => [
                                displayWeight(Number(value), useMetric),
                                "Max Weight",
                              ]}
                              labelFormatter={(date) => `Date: ${date}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="maxWeight"
                              name="Max Weight"
                              stroke="#8884d8"
                              strokeWidth={3}
                              dot={{ r: 5, strokeWidth: 2 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>

                    {/* Volume Progress Chart - Similar enhancements */}
                    <Card className="shadow-sm hover:shadow transition-shadow">
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <p className="text-lg font-bold">Volume Progress</p>
                            <p className="text-small text-primary font-medium">
                              {getSelectedExerciseName()}
                            </p>
                          </div>
                          <Tooltip content="Shows your total workout volume (weight × reps) over time">
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              aria-label="Volume progress information" // Add this
                            >
                              <Info size={16} className="text-default-400" />
                            </Button>
                          </Tooltip>
                        </div>
                        <p className="text-small text-default-500">
                          Total workout volume per session
                        </p>
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-[400px] md:h-80 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={exerciseData}
                            margin={{ left: 10, right: 10, bottom: 10 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="formattedDate"
                              tick={{ fontSize: 11 }}
                              interval={window.innerWidth < 768 ? 2 : 0}
                              axisLine={false}
                            />
                            <YAxis
                              label={{
                                value: useMetric ? "kg" : "lbs",
                                angle: -90,
                                position: "insideLeft",
                                dx: -10,
                                fontSize: 12,
                              }}
                              tickFormatter={(value) => `${value}`}
                              axisLine={false}
                              dx={-5}
                              tickLine={false}
                            />
                            <RechartsTooltip
                              formatter={(value) => [
                                displayWeight(Number(value), useMetric),
                                "Total Volume",
                              ]}
                              labelFormatter={(date) => `Date: ${date}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="totalVolume"
                              name="Volume"
                              stroke="#82ca9d"
                              strokeWidth={3}
                              dot={{ r: 5, strokeWidth: 2 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  </div>
                ) : (
                  // Enhanced empty state for better UX
                  <Card className="shadow-sm">
                    <CardBody className="py-12 px-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Dumbbell size={32} className="text-default-400" />
                        </div>
                        <p className="text-xl font-semibold">
                          No data available
                        </p>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                          You haven't logged any sessions for this exercise yet.
                          Complete a workout with this exercise to see your
                          progress.
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )
              ) : (
                // Enhanced select exercise prompt
                <Card className="shadow-sm">
                  <CardBody className="py-12 px-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp size={32} className="text-primary/70" />
                      </div>
                      <p className="text-xl font-semibold">
                        Select an exercise
                      </p>
                      <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Choose an exercise from the dropdown above to view your
                        progress charts and performance metrics.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Personal Records View - Enhanced card design */}
          {activeTab === "records" && (
            <div className="space-y-6">
              {/* Enhanced search with better mobile appearance */}
              <Input
                placeholder="Search exercises..."
                startContent={
                  <Search
                    size={18}
                    className="text-default-400 flex-shrink-0"
                  />
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/2"
                size="lg"
                aria-label="Search exercises in records" // Add this
                classNames={{
                  inputWrapper: "h-12",
                }}
              />

              {filteredRecords.length > 0 ? (
                // Enhanced card grid with better spacing and visual improvements
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredRecords.map((record, index) => (
                    <Card
                      key={record.id}
                      className="shadow-sm hover:shadow transition-all duration-300"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <CardBody className="p-4">
                        {/* Enhanced record header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg line-clamp-1">
                              {record.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-default-500 text-xs">
                              <Calendar size={12} />
                              <span>{formatDate(record.date)}</span>
                            </div>
                          </div>
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="flex-shrink-0"
                          >
                            PR
                          </Chip>
                        </div>

                        {/* Enhanced stats display */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                            <span className="text-xs text-gray-500 mb-1">
                              Max Weight
                            </span>
                            <span className="font-bold text-sm md:text-base">
                              {displayWeight(record.max_weight, useMetric)}
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                            <span className="text-xs text-gray-500 mb-1">
                              Max Reps
                            </span>
                            <span className="font-bold text-base">
                              {record.max_reps}
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                            <span className="text-xs text-gray-500 mb-1">
                              Max Volume
                            </span>
                            <span className="font-bold text-sm md:text-base">
                              {displayWeight(record.max_volume, useMetric)}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                      <CardFooter className="pt-0">
                        <Button
                          color="primary"
                          variant="flat"
                          size="sm"
                          className="w-full"
                          onPress={() => {
                            // First, find the exercise name
                            const selectedExerciseName =
                              exercises.find((ex) => ex.id === record.id)
                                ?.name || record.name;

                            // Update both the ID and search term to stay in sync
                            setSelectedExercise(record.id);
                            setExerciseSearchTerm(selectedExerciseName);
                            setActiveTab("progress");

                            // Optional: show a toast to confirm the action
                            toast.info(
                              `Viewing progress for ${selectedExerciseName}`,
                              {
                                duration: 2000,
                                icon: <TrendingUp size={16} />,
                              }
                            );
                          }}
                          aria-label={`View progress for ${record.name}`}
                          endContent={<ChevronRight size={14} />}
                        >
                          View Progress
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : searchTerm ? (
                // Enhanced search results empty state
                <Card>
                  <CardBody className="py-10 px-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={28} className="text-default-400" />
                      </div>
                      <p className="text-xl font-semibold">No records found</p>
                      <p className="text-gray-500 mt-2">
                        No exercises match "{searchTerm}"
                      </p>
                      <Button
                        color="primary"
                        variant="light"
                        className="mt-4"
                        onPress={() => setSearchTerm("")}
                      >
                        Clear search
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                // Enhanced empty state for no records
                <Card>
                  <CardBody className="py-12 px-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy size={28} className="text-warning" />
                      </div>
                      <p className="text-xl font-semibold">No records yet</p>
                      <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Complete workout sessions to start tracking your
                        personal records. Each time you lift a new maximum
                        weight, it will appear here.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Volume Analysis View - Enhanced for mobile */}
          {activeTab === "volume" && (
            <div>
              <Card className="shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-0 pt-4 flex-col items-start">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-lg font-bold">
                      Top 10 Exercises by Volume
                    </p>
                    <Tooltip content="Shows your exercises ranked by total volume lifted (weight × reps)">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        aria-label="Volume analysis information" // Add this
                      >
                        <Info size={16} className="text-default-400" />
                      </Button>
                    </Tooltip>
                  </div>
                  <p className="text-small text-default-500">
                    Total volume lifted across all sessions
                  </p>
                </CardHeader>
                <Divider className="my-2" />
                <CardBody className="h-[500px] md:h-96">
                  {volumeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={volumeData}
                        layout="vertical"
                        margin={{
                          left: 20,
                          right: 30,
                          bottom: 5,
                          top: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={true}
                          vertical={false}
                        />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) =>
                            `${(useMetric ? value : kgToLbs(value)).toFixed(0)}`
                          }
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={window.innerWidth < 640 ? 100 : 150}
                          tick={{
                            fontSize: window.innerWidth < 640 ? 10 : 12,
                          }}
                          tickFormatter={(value) =>
                            window.innerWidth < 480 && value.length > 12
                              ? `${value.substring(0, 10)}...`
                              : value
                          }
                        />
                        <RechartsTooltip
                          formatter={(value) => [
                            displayWeight(Number(value), useMetric),
                            "Volume",
                          ]}
                          labelFormatter={(name) => `Exercise: ${name}`}
                          cursor={{ fill: "rgba(136, 132, 216, 0.1)" }}
                        />
                        <Bar
                          dataKey="volume"
                          name={`Volume (${useMetric ? "kg" : "lbs"})`}
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                          barSize={window.innerWidth < 640 ? 15 : 20}
                          animationDuration={1000}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    // Enhanced empty state for volume
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart3 size={32} className="text-default-400" />
                        </div>
                        <p className="text-xl font-semibold">
                          No volume data available
                        </p>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                          Complete workout sessions to see your volume analysis.
                          This will help you track your overall training load
                          over time.
                        </p>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Add global styles for animations and mobile optimizations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
