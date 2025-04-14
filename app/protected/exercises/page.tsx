"use client";

import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Skeleton,
  Tab,
  Tabs,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import {
  BookOpenCheckIcon,
  ChevronDown,
  EditIcon,
  FilterIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DropdownItemType = {
  key: string;
  label: string;
  textValue?: string;
  className?: string;
};

export default function ExerciseLibraryPage() {
  const supabase = createClient();
  const [exercises, setExercises] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editExercise, setEditExercise] = useState<any>(null);
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    category_id: "",
  });
  const [selectedCategoryName, setSelectedCategoryName] =
    useState("All Exercises");
  const [isSaving, setIsSaving] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Fetch exercises and categories
  useEffect(() => {
    const fetchData = async () => {
      toast.promise(
        (async () => {
          setIsLoading(true);
          try {
            // Get user info
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              throw new Error("Not authenticated");
            }

            // Get categories
            const { data: categoriesData, error: categoriesError } =
              await supabase.from("categories").select("*").order("name");

            if (categoriesError) throw categoriesError;

            // Get exercises (both default and user's custom ones)
            const { data: exercisesData, error: exercisesError } =
              await supabase
                .from("exercises")
                .select("*, category:categories(*)")
                .or(`is_default.eq.true,user_id.eq.${user.id}`)
                .order("name");

            if (exercisesError) throw exercisesError;

            // Set data with a slight delay to show loading states
            setCategories(categoriesData || []);
            setExercises(exercisesData || []);

            return exercisesData?.length || 0;
          } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
          } finally {
            setIsLoading(false);
          }
        })(),
        {
          loading: "Loading your exercise library...",
          success: (count) => `Loaded ${count} exercises`,
          error: "Failed to load exercises",
        }
      );
    };

    fetchData();
  }, []);

  const handleEditExercise = (exercise: any) => {
    setEditExercise({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description || "",
      category_id: exercise.category_id,
    });
    onOpen();
  };

  const handleAddExercise = () => {
    setEditExercise(null);
    setNewExercise({
      name: "",
      description: "",
      category_id: categories.length > 0 ? categories[0].id : "",
    });
    onOpen();
  };

  const saveExercise = async () => {
    try {
      const exerciseData = editExercise || newExercise;

      // Validate input
      if (!exerciseData.name.trim()) {
        toast.error("Exercise name is required");
        return;
      }

      setIsSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        throw new Error("Not authenticated");
      }

      if (editExercise) {
        // Update existing exercise
        const { error } = await supabase
          .from("exercises")
          .update({
            name: editExercise.name,
            description: editExercise.description,
            category_id: editExercise.category_id,
          })
          .eq("id", editExercise.id);

        if (error) {
          toast.error("Failed to update exercise");
          throw error;
        }

        toast.success("Exercise updated successfully");
      } else {
        // Add new exercise
        const { error } = await supabase.from("exercises").insert({
          name: newExercise.name,
          description: newExercise.description,
          category_id: newExercise.category_id,
          user_id: user.id,
          is_default: false,
        });

        if (error) {
          toast.error("Failed to create exercise");
          throw error;
        }

        toast.success("Exercise added successfully");
      }

      // Refresh exercises
      const { data, error } = await supabase
        .from("exercises")
        .select("*, category:categories(*)")
        .or(`is_default.eq.true,user_id.eq.${user.id}`)
        .order("name");

      if (error) throw error;

      setExercises(data || []);
      onClose();
    } catch (error) {
      console.error("Error saving exercise:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter exercises based on search and active tab
  const filteredExercises = exercises.filter((exercise) => {
    // Search filter
    const matchesSearch =
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.description &&
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Tab filter
    if (activeTab === "all") {
      return matchesSearch;
    } else if (activeTab === "custom") {
      return !exercise.is_default && matchesSearch;
    } else if (activeTab === "default") {
      return exercise.is_default && matchesSearch;
    } else {
      // Category tab - Convert both values to strings for comparison
      return (
        String(exercise.category_id) === String(activeTab) && matchesSearch
      );
    }
  });

  // Track when search is performed
  useEffect(() => {
    if (searchTerm) {
      setSearchPerformed(true);
      // Only show toast for non-empty searches with results
      if (filteredExercises.length > 0 && searchTerm.length > 2) {
        toast(`Found ${filteredExercises.length} matching exercises`, {
          icon: <SearchIcon size={16} />,
        });
      }
    } else {
      setSearchPerformed(false);
    }
  }, [searchTerm]);

  // Select a category (for both tabs and dropdown)
  const selectCategory = (key: string) => {
    // Don't reload if selecting the same category
    if (key === activeTab) return;

    setActiveTab(key);

    // Update the dropdown text for mobile view
    if (key === "all") {
      setSelectedCategoryName("All Exercises");
    } else if (key === "custom") {
      setSelectedCategoryName("My Exercises");
    } else if (key === "default") {
      setSelectedCategoryName("Default Exercises");
    } else {
      const category = categories.find((c) => String(c.id) === key);
      if (category) {
        setSelectedCategoryName(category.name);
        // Show toast for specific category selection
        toast(`Showing ${category.name} exercises`, {
          icon: <FilterIcon size={16} />,
        });
      }
    }
  };

  // Group exercises by category for better organization
  const exercisesByCategory = filteredExercises.reduce(
    (acc: any, exercise: any) => {
      const categoryId = exercise.category_id || "uncategorized";
      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: exercise.category?.name || "Uncategorized",
          exercises: [],
        };
      }
      acc[categoryId].exercises.push(exercise);
      return acc;
    },
    {}
  );

  const sortedCategories = Object.values(exercisesByCategory).sort(
    (a: any, b: any) => a.name.localeCompare(b.name)
  );

  // Clear search input
  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="p-4 space-y-6 animate-fadeIn">
      <PageTitle title="Exercise Library" className="mb-6" />

      {/* Enhanced search and filter bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full md:w-1/2 rounded-lg" />
        ) : (
          <div className="w-full md:w-1/2 relative">
            <Input
              placeholder="Search exercises..."
              startContent={
                <SearchIcon
                  className="text-default-400 flex-shrink-0"
                  size={18}
                />
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="bordered"
              classNames={{
                base: "max-w-full",
                inputWrapper: "h-10",
              }}
              endContent={
                searchTerm && (
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={clearSearch}
                  >
                    <XIcon size={14} />
                  </Button>
                )
              }
            />
            {searchPerformed && (
              <div className="text-xs text-gray-500 mt-1.5">
                {filteredExercises.length}{" "}
                {filteredExercises.length === 1 ? "result" : "results"} found
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Mobile filter dropdown */}
          {isLoading ? (
            <Skeleton className="h-10 w-full sm:w-40 rounded-lg" />
          ) : (
            <Dropdown className="block md:hidden">
              <DropdownTrigger>
                <Button
                  variant="flat"
                  startContent={<FilterIcon size={16} />}
                  endContent={<ChevronDown size={16} />}
                  className="w-full sm:w-auto"
                >
                  {selectedCategoryName}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Exercise Categories"
                onAction={(key) => selectCategory(key as string)}
                selectionMode="single"
                selectedKeys={[activeTab]}
                disabledKeys={["category-header"]}
                items={[
                  { key: "all", label: "All Exercises" },
                  { key: "custom", label: "My Exercises" },
                  { key: "default", label: "Default Exercises" },
                  {
                    key: "category-header",
                    label: "Categories",
                    className: "text-gray-400",
                  },
                  ...categories.map((category) => ({
                    key: String(category.id),
                    label: category.name,
                    textValue: category.name,
                  })),
                ]}
              >
                {(item: DropdownItemType) => (
                  <DropdownItem
                    key={item.key}
                    className={item.className || ""}
                    textValue={item.textValue || item.label}
                  >
                    {item.label}
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          )}

          {isLoading ? (
            <Skeleton className="h-10 w-full sm:w-48 rounded-lg" />
          ) : (
            <Button
              color="primary"
              startContent={<PlusIcon size={18} />}
              onPress={handleAddExercise}
              className="w-full sm:w-auto"
            >
              Add Custom Exercise
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs - Hidden on mobile */}
      <div className="hidden md:block">
        {isLoading ? (
          <div className="border-b border-default-200">
            <div className="flex gap-4 pb-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => selectCategory(key as string)}
            color="primary"
            variant="underlined"
            classNames={{
              tabList: "gap-2 w-full relative",
              tab: "max-w-fit px-4 h-10",
              cursor: "w-full",
              panel: "pt-3",
            }}
            aria-label="Exercise Categories"
          >
            <Tab key="all" title="All Exercises" />
            <Tab key="custom" title="My Exercises" />
            <Tab key="default" title="Default Exercises" />
            {categories.map((category) => (
              <Tab key={String(category.id)} title={category.name.toString()} />
            ))}
          </Tabs>
        )}
      </div>

      {/* Exercise Library Content */}
      <div className="transition-all duration-300 ease-in-out">
        {isLoading ? (
          // Enhanced loading skeleton with category headers
          <div className="space-y-12">
            {[...Array(2)].map((_, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-8 rounded-lg" />
                  <div className="h-[1px] bg-gray-200 dark:bg-gray-700 flex-grow"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardBody className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="w-2/3">
                            <Skeleton className="h-5 w-4/5 rounded-lg mb-2" />
                            <Skeleton className="h-4 w-1/2 rounded-lg" />
                          </div>
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                        <div className="mt-4">
                          <Skeleton className="h-4 w-full rounded-lg mb-2" />
                          <Skeleton className="h-4 w-4/5 rounded-lg" />
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          // Enhanced empty state
          <div className="text-center p-12 border rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="inline-flex justify-center mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              {searchTerm ? (
                <SearchIcon size={28} className="text-gray-500" />
              ) : (
                <BookOpenCheckIcon size={28} className="text-gray-500" />
              )}
            </div>
            <p className="text-xl font-medium mb-2">
              {searchTerm ? "No matching exercises" : "No exercises found"}
            </p>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm
                ? `We couldn't find any exercises matching "${searchTerm}"`
                : "Your exercise library appears to be empty"}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {searchTerm && (
                <Button
                  variant="flat"
                  color="default"
                  onPress={clearSearch}
                  startContent={<XIcon size={16} />}
                >
                  Clear Search
                </Button>
              )}
              <Button
                color="primary"
                onPress={handleAddExercise}
                startContent={<PlusIcon size={16} />}
              >
                Add Custom Exercise
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Single Category View */}
            {activeTab !== "all" &&
            activeTab !== "custom" &&
            activeTab !== "default" ? (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <LayersIcon size={18} className="text-primary" />
                  <span className="text-sm text-gray-500">
                    {filteredExercises.length}
                    {filteredExercises.length === 1
                      ? " exercise"
                      : " exercises"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onEdit={handleEditExercise}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Grouped By Category with improved animation
              sortedCategories.map((category: any, index) => (
                <div
                  key={category.name}
                  className="space-y-3 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-2 sticky top-0 bg-background/90 backdrop-blur-md z-10 py-2">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    <span className="text-sm text-gray-500">
                      ({category.exercises.length})
                    </span>
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700 flex-grow"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.exercises.map(
                      (exercise: any, exIndex: number) => (
                        <ExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          onEdit={handleEditExercise}
                          animationDelay={exIndex * 30}
                        />
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Exercise Modal - Updated for mobile */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isSaving) onClose();
        }}
        placement="top" // Changed from center to top
        scrollBehavior="inside"
        classNames={{
          base: "max-w-[95%] sm:max-w-md mx-auto max-h-[80vh]", // Add max height
          wrapper: "items-start sm:items-center justify-center p-2 pt-8", // Position better on mobile
          header:
            "pb-0 border-b border-default-200 sticky top-0 z-10 bg-background", // Make header sticky
          body: "p-4 overflow-auto pb-12", // Add bottom padding for keyboard space
          footer:
            "pt-3 px-6 pb-5 flex flex-row gap-3 justify-end sticky bottom-0 z-10 bg-background border-t border-default-200", // Make footer sticky
        }}
      >
        <ModalContent className="max-w-md mx-auto">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editExercise ? "Edit Exercise" : "Add New Exercise"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-5">
                  <Input
                    label="Exercise Name"
                    placeholder="Enter exercise name"
                    value={editExercise ? editExercise.name : newExercise.name}
                    onChange={(e) => {
                      if (editExercise) {
                        setEditExercise({
                          ...editExercise,
                          name: e.target.value,
                        });
                      } else {
                        setNewExercise({
                          ...newExercise,
                          name: e.target.value,
                        });
                      }
                    }}
                    variant="bordered"
                    isRequired
                    isDisabled={isSaving}
                  />

                  <Select
                    label="Category"
                    placeholder="Select a category"
                    selectedKeys={[
                      String(
                        editExercise
                          ? editExercise.category_id
                          : newExercise.category_id
                      ),
                    ]}
                    onChange={(e) => {
                      if (editExercise) {
                        setEditExercise({
                          ...editExercise,
                          category_id: e.target.value,
                        });
                      } else {
                        setNewExercise({
                          ...newExercise,
                          category_id: e.target.value,
                        });
                      }
                    }}
                    variant="bordered"
                    isDisabled={isSaving}
                  >
                    {categories.map((category) => (
                      <SelectItem key={String(category.id)} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Textarea
                    label="Description"
                    placeholder="Describe the exercise (optional)"
                    value={
                      editExercise
                        ? editExercise.description
                        : newExercise.description
                    }
                    onChange={(e) => {
                      if (editExercise) {
                        setEditExercise({
                          ...editExercise,
                          description: e.target.value,
                        });
                      } else {
                        setNewExercise({
                          ...newExercise,
                          description: e.target.value,
                        });
                      }
                    }}
                    variant="bordered"
                    minRows={3}
                    isDisabled={isSaving}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={onClose}
                  isDisabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={saveExercise}
                  isLoading={isSaving}
                  startContent={!isSaving && <PlusIcon size={16} />}
                >
                  {editExercise ? "Update" : "Save"} Exercise
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add global styles for animations */}
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
      `}</style>
    </div>
  );
}

// Enhanced Exercise Card Component
function ExerciseCard({
  exercise,
  onEdit,
  animationDelay = 0,
}: {
  exercise: any;
  onEdit: (exercise: any) => void;
  animationDelay?: number;
}) {
  return (
    <Card
      className="hover:shadow-md transition-all duration-200 border border-transparent hover:border-primary/20 animate-fadeIn"
      isPressable={!exercise.is_default}
      onPress={() => !exercise.is_default && onEdit(exercise)}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <CardBody className="p-4 gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-medium line-clamp-1">
                {exercise.name}
              </h3>
              {exercise.is_default ? (
                <Tooltip content="Default exercise (cannot be edited)">
                  <Chip
                    size="sm"
                    color="secondary"
                    variant="flat"
                    className="h-5"
                  >
                    Default
                  </Chip>
                </Tooltip>
              ) : (
                <Tooltip content="Edit exercise">
                  {/* Wrap with a div instead of span and use stopPropagation */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(exercise);
                    }}
                    className="flex items-center justify-center h-8 w-8 rounded-full cursor-pointer text-default-400 hover:text-primary hover:bg-default-100"
                  >
                    <EditIcon size={16} />
                  </div>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70 mr-1.5"></div>
              <span className="text-xs text-default-500">
                {exercise.category?.name || "Uncategorized"}
              </span>
            </div>
          </div>
        </div>

        {exercise.description && (
          <p className="text-small text-default-500 mt-2 line-clamp-3">
            {exercise.description}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
