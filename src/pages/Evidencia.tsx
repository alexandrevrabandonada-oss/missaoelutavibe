import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * DEPRECATED: This route redirects to /voluntario/evidencia/:missionId
 * Kept for backward compatibility with old links.
 */
export default function Evidencia() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to canonical route
    navigate(`/voluntario/evidencia/${missionId}`, { replace: true });
  }, [missionId, navigate]);

  return null;
}
