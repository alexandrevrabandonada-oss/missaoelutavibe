/**
 * AdminOps - Redirects to /coordenador/hoje (canonical coordination entry point)
 * 
 * This page previously contained a duplicate operational dashboard.
 * Per navigation-reorganization-v1, /coordenador/hoje is now the single
 * entry point for coordinator operations.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function AdminOps() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to canonical coordination entry point
    navigate("/coordenador/hoje", { replace: true });
  }, [navigate]);

  return <FullPageLoader text="Redirecionando para Coordenação..." />;
}
