import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl md:text-2xl",
    md: "text-3xl md:text-4xl",
    lg: "text-5xl md:text-6xl",
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <h1 className={cn("font-display font-bold tracking-tight", sizeClasses[size])}>
        <span className="text-foreground">MISSÃO</span>{" "}
        <span className="text-primary">ÉLUTA</span>
      </h1>
      <p className="signature-luta mt-1.5">
        Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
