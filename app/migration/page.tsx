"use client";

import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { CheckCircle, Database, XCircle } from "lucide-react";
import { useState } from "react";

export default function MigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const handleMigration = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const response = await fetch("/api/migrate-analytics", {
        method: "GET",
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: "Migration completed successfully!",
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Migration failed",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Analytics Data Migration</h1>

      <Card className="mb-6">
        <CardBody>
          <p className="text-default-600">
            This utility will migrate your workout data to the analytics table,
            calculating your personal records for weight, reps, and volume.
          </p>
          <p className="mt-2 text-default-500 text-sm">
            This process may take a few moments depending on how much workout
            data you have.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-col items-center gap-4 py-6">
        <Button
          color="primary"
          size="lg"
          startContent={<Database className="w-4 h-4" />}
          onPress={handleMigration}
          isDisabled={isLoading}
          className="px-8"
        >
          {isLoading ? "Migrating..." : "Start Migration"}
        </Button>

        {isLoading && (
          <div className="flex items-center gap-2 mt-4">
            <Spinner size="sm" />
            <span>Processing your workout data...</span>
          </div>
        )}

        {result && (
          <Card
            className={`w-full mt-6 ${
              result.success ? "bg-success-50" : "bg-danger-50"
            }`}
          >
            <CardBody>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="text-success w-5 h-5" />
                ) : (
                  <XCircle className="text-danger w-5 h-5" />
                )}
                <span
                  className={result.success ? "text-success" : "text-danger"}
                >
                  {result.message}
                </span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <Button
          variant="light"
          color="primary"
          as="a"
          href="/protected/analytics"
          className="text-sm"
        >
          Return to Analytics
        </Button>
      </div>
    </div>
  );
}
