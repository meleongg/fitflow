"use client";

import PageTitle from "@/components/ui/page-title";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import { createClient } from "@/utils/supabase/client";
import { displayWeight, kgToLbs } from "@/utils/units";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  SelectItem,
  Skeleton,
  Spinner,
  Tab,
  Tabs,
} from "@nextui-org/react";
import { BarChart3, Dumbbell, Search, TrendingUp, Weight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
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

        // Get all completed session exercises with dates
        const { data: sessionsData } = await supabase
          .from("session_exercises")
          .select(
            `
            id,
            reps,
            weight,
            exercise_id,
            exercise:exercises(name),
            session:sessions(started_at)
          `
          )
          .eq("user_id", user.id)
          .order("session(started_at)", { ascending: false });

        // Calculate and set data
        setExercises(exercisesData || []);
        setSessions(sessionsData || []);
        calculatePersonalRecords(sessionsData || []);

        // Show success toast with key stats
        toast.success(
          `Loaded ${exercisesData?.length || 0} exercises and ${Object.keys(calculatePersonalRecords(sessionsData || [])).length || 0} personal records`,
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
          // Only show toast if there's actual data
          if (exerciseData.length > 0) {
            toast.success(`Showing progress data for ${selectedExerciseName}`);
          }
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
  };

  // Calculate personal records from session data
  const calculatePersonalRecords = (sessionsData: any[]) => {
    const records: { [key: string]: any } = {};

    sessionsData?.forEach((session) => {
      const exerciseId = session.exercise_id;
      const exerciseName = session.exercise?.name;
      const weight = session.weight;
      const volume = session.reps * session.weight;

      if (!records[exerciseId]) {
        records[exerciseId] = {
          id: exerciseId,
          name: exerciseName,
          max_weight: weight,
          max_volume: volume,
          max_reps: session.reps,
          date: session.session?.started_at,
        };
      } else {
        if (weight > records[exerciseId].max_weight) {
          records[exerciseId].max_weight = weight;
          records[exerciseId].date = session.session?.started_at;
        }

        if (volume > records[exerciseId].max_volume) {
          records[exerciseId].max_volume = volume;
        }

        if (session.reps > records[exerciseId].max_reps) {
          records[exerciseId].max_reps = session.reps;
        }
      }
    });

    setPersonalRecords(Object.values(records));
    return records; // Return records for the toast notification
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
        const exerciseId = session.exercise_id;
        const exerciseName = session.exercise?.name;
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
    <div className="p-4 space-y-6">
      <PageTitle title="Fitness Analytics" />

      {/* Tabs for different analysis views */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={handleTabChange}
        color="primary"
        variant="underlined"
        className="mb-6 w-full"
        classNames={{
          tabList: "gap-4 w-full",
          panel: "w-full",
          base: "w-full",
          tab: "max-w-fit",
        }}
      >
        <Tab
          key="progress"
          title={
            <div className="flex items-center gap-2">
              <TrendingUp size={18} />
              <span className="whitespace-nowrap">Progress Charts</span>
            </div>
          }
        />
        <Tab
          key="records"
          title={
            <div className="flex items-center gap-2">
              <Weight size={18} />
              <span className="whitespace-nowrap">Personal Records</span>
            </div>
          }
        />
        <Tab
          key="volume"
          title={
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              <span className="whitespace-nowrap">Volume Analysis</span>
            </div>
          }
        />
      </Tabs>

      {isLoading ? (
        // Enhanced loading state with skeletons instead of just a spinner
        <div className="space-y-8">
          {/* Skeleton for selectors */}
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-12 w-full md:w-1/2 rounded-lg" />
            <Skeleton className="h-12 w-full md:w-1/2 rounded-lg" />
          </div>

          {/* Skeleton for charts */}
          <Card>
            <CardHeader className="pb-0 pt-4 flex-col items-start">
              <Skeleton className="h-6 w-48 rounded mb-2" />
              <Skeleton className="h-4 w-72 rounded" />
            </CardHeader>
            <Divider className="my-2" />
            <CardBody className="h-80">
              <div className="h-full w-full flex items-center justify-center bg-default-100/50 rounded-lg">
                <Spinner size="lg" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="pb-0 pt-4 flex-col items-start">
              <Skeleton className="h-6 w-48 rounded mb-2" />
              <Skeleton className="h-4 w-72 rounded" />
            </CardHeader>
            <Divider className="my-2" />
            <CardBody className="h-80">
              <div className="h-full w-full flex items-center justify-center bg-default-100/50 rounded-lg">
                <Spinner size="lg" />
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <>
          {/* Progress Charts View */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Select
                  label="Select Exercise"
                  placeholder="Choose an exercise to analyze"
                  selectedKeys={selectedExercise ? [selectedExercise] : []}
                  onChange={(e) => handleExerciseChange(e.target.value)}
                  className="md:w-1/2"
                  isDisabled={isChartLoading}
                >
                  {exercises.map((exercise) => (
                    <SelectItem
                      key={exercise.id}
                      value={exercise.id}
                      textValue={`${exercise.name}${exercise.category ? ` (${exercise.category.name})` : ""}`}
                    >
                      {exercise.name}{" "}
                      {exercise.category ? `(${exercise.category.name})` : ""}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Timeframe"
                  selectedKeys={[selectedTimeframe]}
                  onChange={(e) => handleTimeframeChange(e.target.value)}
                  className="md:w-1/2"
                  isDisabled={isChartLoading || !selectedExercise}
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

              {/* Charts section with loading states */}
              {selectedExercise ? (
                isChartLoading ? (
                  // Skeleton for chart loading state
                  <div className="space-y-8">
                    <Card>
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <Skeleton className="h-6 w-48 rounded mb-2" />
                        <Skeleton className="h-4 w-72 rounded" />
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-80 flex items-center justify-center">
                        <Spinner size="lg" />
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <Skeleton className="h-6 w-48 rounded mb-2" />
                        <Skeleton className="h-4 w-72 rounded" />
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-80 flex items-center justify-center">
                        <Spinner size="lg" />
                      </CardBody>
                    </Card>
                  </div>
                ) : exerciseData.length > 0 ? (
                  // Actual charts (unchanged)
                  <div className="space-y-8">
                    {/* Weight Progress Chart */}
                    <Card>
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <p className="text-lg font-bold">Weight Progress</p>
                        <p className="text-small text-default-500">
                          Maximum weight used per workout session
                        </p>
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={exerciseData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="formattedDate"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              label={{
                                value: `Weight (${useMetric ? "kg" : "lbs"})`,
                                angle: -90,
                                position: "insideLeft",
                              }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${useMetric ? value : kgToLbs(Number(value)).toFixed(1)} ${useMetric ? "kg" : "lbs"}`,
                                "Max Weight",
                              ]}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="maxWeight"
                              name={`Max Weight (${useMetric ? "kg" : "lbs"})`}
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>

                    {/* Volume Progress Chart */}
                    <Card>
                      <CardHeader className="pb-0 pt-4 flex-col items-start">
                        <p className="text-lg font-bold">Volume Progress</p>
                        <p className="text-small text-default-500">
                          Total workout volume (weight × reps) per session
                        </p>
                      </CardHeader>
                      <Divider className="my-2" />
                      <CardBody className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={exerciseData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="formattedDate"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              label={{
                                value: `Volume (${useMetric ? "kg" : "lbs"})`,
                                angle: -90,
                                position: "insideLeft",
                              }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${useMetric ? value : kgToLbs(Number(value)).toFixed(1)} ${useMetric ? "kg" : "lbs"}`,
                                "Total Volume",
                              ]}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="totalVolume"
                              name={`Total Volume (${useMetric ? "kg" : "lbs"})`}
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  </div>
                ) : (
                  // No data for selected exercise (unchanged)
                  <Card>
                    <CardBody className="py-8">
                      <div className="text-center">
                        <Dumbbell
                          size={48}
                          className="mx-auto text-gray-400 mb-3"
                        />
                        <p className="text-xl font-semibold">
                          No data available
                        </p>
                        <p className="text-gray-500 mt-2">
                          You haven't logged any sessions for this exercise yet.
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )
              ) : (
                // No exercise selected (unchanged)
                <Card>
                  <CardBody className="py-12">
                    <div className="text-center">
                      <TrendingUp
                        size={48}
                        className="mx-auto text-gray-400 mb-3"
                      />
                      <p className="text-xl font-semibold">
                        Select an exercise
                      </p>
                      <p className="text-gray-500 mt-2">
                        Choose an exercise from the dropdown to view your
                        progress charts.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Personal Records View */}
          {activeTab === "records" && (
            <div className="space-y-6">
              <Input
                placeholder="Search exercises..."
                startContent={<Search size={18} className="text-default-400" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/2"
              />

              {filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="shadow-sm">
                      <CardBody className="p-4">
                        <h3 className="font-bold text-lg">{record.name}</h3>
                        <p className="text-gray-500 text-small mb-2">
                          Last PR: {formatDate(record.date)}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <span className="text-sm text-gray-500">
                              Max Weight
                            </span>
                            <span className="font-bold">
                              {displayWeight(record.max_weight, useMetric)}
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <span className="text-sm text-gray-500">
                              Max Reps
                            </span>
                            <span className="font-bold">{record.max_reps}</span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <span className="text-sm text-gray-500">
                              Max Volume
                            </span>
                            <span className="font-bold">
                              {displayWeight(record.max_volume, useMetric)}
                            </span>
                          </div>
                        </div>
                        <Button
                          color="primary"
                          variant="flat"
                          size="sm"
                          className="mt-4 w-full"
                          onPress={() => {
                            setSelectedExercise(record.id);
                            setActiveTab("progress");
                          }}
                        >
                          View Progress
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : searchTerm ? (
                // Searching with no results
                <Card>
                  <CardBody className="py-8">
                    <div className="text-center">
                      <Search
                        size={48}
                        className="mx-auto text-gray-400 mb-3"
                      />
                      <p className="text-xl font-semibold">No records found</p>
                      <p className="text-gray-500 mt-2">
                        Try a different search term
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                // No records yet
                <Card>
                  <CardBody className="py-8">
                    <div className="text-center">
                      <Weight
                        size={48}
                        className="mx-auto text-gray-400 mb-3"
                      />
                      <p className="text-xl font-semibold">No records found</p>
                      <p className="text-gray-500 mt-2">
                        Complete workout sessions to start tracking your records
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Volume Analysis View */}
          {activeTab === "volume" && (
            <div>
              <Card>
                <CardHeader className="pb-0 pt-4 flex-col items-start">
                  <p className="text-lg font-bold">
                    Top 10 Exercises by Volume
                  </p>
                  <p className="text-small text-default-500">
                    Total volume lifted (weight × reps) across all sessions
                  </p>
                </CardHeader>
                <Divider className="my-2" />
                <CardBody className="h-96">
                  {volumeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          label={{
                            value: `Volume (${useMetric ? "kg" : "lbs"})`,
                            position: "insideBottom",
                            offset: -5,
                          }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${useMetric ? value : kgToLbs(Number(value)).toFixed(1)} ${useMetric ? "kg" : "lbs"}`,
                            "Volume",
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="volume"
                          name={`Total Volume (${useMetric ? "kg" : "lbs"})`}
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <div className="text-center">
                        <BarChart3
                          size={48}
                          className="mx-auto text-gray-400 mb-3"
                        />
                        <p className="text-xl font-semibold">
                          No volume data available
                        </p>
                        <p className="text-gray-500 mt-2">
                          Complete workout sessions to see volume analysis
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
    </div>
  );
}
