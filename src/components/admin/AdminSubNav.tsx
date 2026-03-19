/**
 * AdminSubNav - Consistent sub-navigation within admin sections
 * 
 * Shows title, subtitle, and breadcrumbs for each admin section.
 */

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AdminSubNavProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  backHref?: string;
  backLabel?: string;
}

export function AdminSubNav({
  title,
  subtitle,
  breadcrumbs = [],
  backHref = "/admin",
  backLabel = "Voltar ao painel",
}: AdminSubNavProps) {
  const location = useLocation();

  return (
    <div className="space-y-2 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/admin" className="hover:text-foreground transition-colors">
            Admin
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Back button + Title */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="mt-1"
        >
          <Link to={backHref} aria-label={backLabel}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * AdminSectionWrapper - Wrapper for admin sub-pages
 * 
 * Provides consistent layout with sub-nav.
 */
interface AdminSectionWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  backHref?: string;
}

export function AdminSectionWrapper({
  children,
  title,
  subtitle,
  breadcrumbs,
  backHref,
}: AdminSectionWrapperProps) {
  return (
    <div className="space-y-4">
      <AdminSubNav
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        backHref={backHref}
      />
      {children}
    </div>
  );
}
