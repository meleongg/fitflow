"use client";

import PageTitle from "@/components/ui/page-title";
import { createClient } from "@/utils/supabase/client";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import { EditIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
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

        if (error) throw error;
      } else {
        // Add new exercise
        const { error } = await supabase.from("exercises").insert({
          name: newExercise.name,
          description: newExercise.description,
          category_id: newExercise.category_id,
          user_id: user.id,
          is_default: false,
        });

        if (error) throw error;
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
      // Category tab
      return exercise.category_id === activeTab && matchesSearch;
    }
  });

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

  return (
    <div className="p-4 space-y-6">
      <PageTitle title="Exercise Library" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/2">
          <Input
            placeholder="Search exercises..."
            startContent={<SearchIcon className="text-default-400" size={20} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          color="primary"
          startContent={<PlusIcon size={18} />}
          onPress={handleAddExercise}
        >
          Add Custom Exercise
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-2",
          }}
        >
          <Tab key="all" title="All Exercises" />
          <Tab key="custom" title="My Exercises" />
          <Tab key="default" title="Default Exercises" />

          {/* Add tabs for each category */}
          {categories.map((category) => (
            <Tab key={category.id} title={category.name} />
          ))}
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading exercises...</div>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-lg mb-2">No exercises found</p>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab !== "all" &&
          activeTab !== "custom" &&
          activeTab !== "default" ? (
            // Show exercises for a specific category
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onEdit={handleEditExercise}
                />
              ))}
            </div>
          ) : (
            // Group by category
            Object.values(exercisesByCategory).map((category: any) => (
              <div key={category.name} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{category.name}</h2>
                  <div className="h-px bg-gray-200 flex-grow"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Add/Edit Exercise Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        scrollBehavior="inside"
        classNames={{
          base: "m-0 mx-auto",
          wrapper: "items-center justify-center p-2",
        }}
      >
        <ModalContent className="max-w-[95vw] sm:max-w-md">
          {() => (
            <>
              <ModalHeader>
                {editExercise ? "Edit Exercise" : "Add New Exercise"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
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
                  />

                  <Select
                    label="Category"
                    placeholder="Select a category"
                    selectedKeys={[
                      // Convert to string to ensure type consistency
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
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={saveExercise}>
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// Exercise Card Component
function ExerciseCard({
  exercise,
  onEdit,
}: {
  exercise: any;
  onEdit: (exercise: any) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-medium">{exercise.name}</h3>
            <p className="text-small text-default-500 mt-1">
              {exercise.category?.name || "Uncategorized"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {exercise.is_default ? (
              <Tooltip content="Default exercise (cannot be edited)">
                <Chip size="sm" color="secondary" variant="flat">
                  Default
                </Chip>
              </Tooltip>
            ) : (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => onEdit(exercise)}
              >
                <EditIcon size={16} />
              </Button>
            )}
          </div>
        </div>

        {exercise.description && (
          <p className="text-small mt-3">
            {exercise.description.length > 100
              ? `${exercise.description.substring(0, 100)}...`
              : exercise.description}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
