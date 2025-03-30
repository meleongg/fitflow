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
  ChevronDown,
  Dumbbell,
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

  // New state for mobile category dropdown
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] =
    useState("All Exercises");

  // Fetch exercises and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get user info
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Not authenticated");
        }

        // Get categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (categoriesError) throw categoriesError;

        // Get exercises (both default and user's custom ones)
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select("*, category:categories(*)")
          .or(`is_default.eq.true,user_id.eq.${user.id}`)
          .order("name");

        if (exercisesError) throw exercisesError;

        setCategories(categoriesData || []);
        setExercises(exercisesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load exercises");
      } finally {
        setIsLoading(false);
      }
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

      const toastId = toast.loading(
        editExercise ? "Updating exercise..." : "Creating exercise..."
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.dismiss(toastId);
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
          toast.dismiss(toastId);
          toast.error("Failed to update exercise");
          throw error;
        }
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
          toast.dismiss(toastId);
          toast.error("Failed to create exercise");
          throw error;
        }
      }

      // Refresh exercises
      const { data, error } = await supabase
        .from("exercises")
        .select("*, category:categories(*)")
        .or(`is_default.eq.true,user_id.eq.${user.id}`)
        .order("name");

      if (error) throw error;

      setExercises(data || []);
      toast.dismiss(toastId);
      toast.success(
        editExercise
          ? "Exercise updated successfully"
          : "Exercise added successfully"
      );
      onClose();
    } catch (error) {
      console.error("Error saving exercise:", error);
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

  // Select a category (for both tabs and dropdown)
  const selectCategory = (key: string) => {
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
      }
    }

    // Hide mobile filters after selection
    setShowMobileFilters(false);
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
      <PageTitle title="Exercise Library" />

      {/* Enhanced search and filter bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          {searchTerm && (
            <div className="text-xs text-gray-500 mt-1">
              {filteredExercises.length}{" "}
              {filteredExercises.length === 1 ? "result" : "results"}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Mobile filter dropdown */}
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
              // Add disabledKeys prop instead of using isDisabled on items
              disabledKeys={["category-header"]}
              items={[
                { key: "all", label: "All Exercises" },
                { key: "custom", label: "My Exercises" },
                { key: "default", label: "Default Exercises" },
                {
                  key: "category-header",
                  label: "Categories",
                  // Remove isDisabled property
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
                  // Remove isDisabled prop here
                  textValue={item.textValue || item.label}
                >
                  {item.label}
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>

          <Button
            color="primary"
            startContent={<PlusIcon size={18} />}
            onPress={handleAddExercise}
            className="w-full sm:w-auto"
          >
            Add Custom Exercise
          </Button>
        </div>
      </div>

      {/* Category Tabs - Hidden on mobile */}
      <div className="hidden md:block">
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

          {/* Fix type error by mapping each category to a properly typed Tab */}
          {categories.map((category) => (
            <Tab key={String(category.id)} title={category.name.toString()} />
          ))}
        </Tabs>
      </div>

      {/* Exercise Library Content */}
      <div className="transition-all duration-300 ease-in-out">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
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
        ) : filteredExercises.length === 0 ? (
          <div className="text-center p-12 border rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="inline-flex justify-center mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <Dumbbell size={28} className="text-gray-500" />
            </div>
            <p className="text-lg font-medium mb-2">No exercises found</p>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters
            </p>

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
          </div>
        ) : (
          <div className="space-y-8">
            {/* Single Category View */}
            {activeTab !== "all" &&
            activeTab !== "custom" &&
            activeTab !== "default" ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <LayersIcon size={18} className="text-primary" />
                  <span className="text-sm text-gray-500">
                    {filteredExercises.length} exercises
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
              // Grouped By Category
              sortedCategories.map((category: any) => (
                <div key={category.name} className="space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 sticky top-0 bg-background z-10 py-2">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    <span className="text-sm text-gray-500">
                      ({category.exercises.length})
                    </span>
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700 flex-grow"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.exercises.map((exercise: any) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onEdit={handleEditExercise}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Exercise Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        scrollBehavior="inside"
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
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={saveExercise}>
                  Save Exercise
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// Enhanced Exercise Card Component
function ExerciseCard({
  exercise,
  onEdit,
}: {
  exercise: any;
  onEdit: (exercise: any) => void;
}) {
  return (
    <Card
      className="hover:shadow-md transition-all duration-200 border border-transparent hover:border-primary/20"
      isPressable={!exercise.is_default}
      onPress={() => !exercise.is_default && onEdit(exercise)}
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
                  {/* Fixed button with separate onClick handler */}
                  <span onClick={(e) => e.stopPropagation()}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="text-default-400 hover:text-primary"
                      onPress={() => {
                        onEdit(exercise);
                      }}
                    >
                      <EditIcon size={16} />
                    </Button>
                  </span>
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
          <p className="text-small text-default-500 mt-1 line-clamp-3">
            {exercise.description}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
