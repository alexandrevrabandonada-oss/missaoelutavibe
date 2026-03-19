/**
 * MissionRunnerPage - Route wrapper for the mission runner flow.
 *
 * Flow: Runner → (optional evidence) → PostMissionImpact
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { MissionRunner } from "@/components/missions/MissionRunner";
import { PostMissionImpact } from "@/components/missions/PostMissionImpact";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "running" | "completed";

export default function MissionRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { missions, isLoading } = useMissions();
  const [phase, setPhase] = useState<Phase>("running");

  const mission = missions.find((m) => m.id === id);

  if (isLoading) return <FullPageLoader />;

  if (!mission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Missão não encontrada</h1>
        <Button onClick={() => navigate("/voluntario/missoes")} variant="outline">
          Voltar
        </Button>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <PostMissionImpact
        mission={mission}
        onReset={() => navigate("/voluntario/hoje", { replace: true })}
      />
    );
  }

  return (
    <MissionRunner
      mission={mission}
      onComplete={() => setPhase("completed")}
      onCancel={() => navigate(-1)}
    />
  );
}
