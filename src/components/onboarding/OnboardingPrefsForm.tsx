import { useState } from "react";
import {
  OnboardingPrefs,
  INTERESSE_OPTIONS,
  HABILIDADE_OPTIONS,
  TEMPO_OPTIONS,
  CONFORTO_OPTIONS,
} from "@/hooks/useOnboardingPrefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

interface OnboardingPrefsFormProps {
  initialPrefs?: OnboardingPrefs | null;
  onSave: (prefs: OnboardingPrefs) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  showConforto?: boolean;
  compact?: boolean;
}

export function OnboardingPrefsForm({
  initialPrefs,
  onSave,
  onCancel,
  isSaving = false,
  showConforto = true,
  compact = false,
}: OnboardingPrefsFormProps) {
  const [step, setStep] = useState(1);
  const [interesses, setInteresses] = useState<string[]>(initialPrefs?.interesses || []);
  const [habilidades, setHabilidades] = useState<string[]>(initialPrefs?.habilidades || []);
  const [tempo, setTempo] = useState<"10" | "20" | "40">(initialPrefs?.tempo || "10");
  const [conforto, setConforto] = useState<"baixo" | "medio" | "alto" | undefined>(
    initialPrefs?.conforto
  );

  const toggleValue = (arr: string[], value: string, setter: (v: string[]) => void) => {
    if (arr.includes(value)) {
      setter(arr.filter((v) => v !== value));
    } else {
      setter([...arr, value]);
    }
  };

  const handleSubmit = () => {
    onSave({
      interesses,
      habilidades,
      tempo,
      conforto,
    });
  };

  const canProceed = () => {
    if (step === 1) return interesses.length > 0;
    if (step === 2) return true; // habilidades is optional
    if (step === 3) return true; // tempo has default
    return true;
  };

  const nextStep = () => {
    if (step < (showConforto ? 4 : 3)) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  // Compact mode: show all in one card
  if (compact) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Interesses */}
          <div>
            <p className="text-sm font-medium mb-2">O que te interessa?</p>
            <div className="flex flex-wrap gap-2">
              {INTERESSE_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={interesses.includes(opt.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleValue(interesses, opt.value, setInteresses)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tempo */}
          <div>
            <p className="text-sm font-medium mb-2">Tempo disponível/dia</p>
            <div className="flex gap-2">
              {TEMPO_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={tempo === opt.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setTempo(opt.value as "10" | "20" | "40")}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={interesses.length === 0 || isSaving}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar preferências
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, ...(showConforto ? [4] : [])].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Interesses */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">O que te interessa?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione uma ou mais áreas de atuação
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTERESSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleValue(interesses, opt.value, setInteresses)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  interesses.includes(opt.value)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {interesses.includes(opt.value) && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Habilidades */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Suas habilidades</CardTitle>
            <p className="text-sm text-muted-foreground">
              Opcional: nos ajuda a direcionar melhor (pode pular)
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {HABILIDADE_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={habilidades.includes(opt.value) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleValue(habilidades, opt.value, setHabilidades)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tempo */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quanto tempo por dia?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Isso ajuda a calibrar suas missões
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEMPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTempo(opt.value as "10" | "20" | "40")}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  tempo === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {tempo === opt.value && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Conforto (optional) */}
      {step === 4 && showConforto && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Conforto presencial</CardTitle>
            <p className="text-sm text-muted-foreground">
              Opcional: para calibrar missões de rua
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONFORTO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConforto(opt.value as "baixo" | "medio" | "alto")}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  conforto === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {conforto === opt.value && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                setConforto(undefined);
                handleSubmit();
              }}
            >
              Pular
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          {step === 1 && onCancel ? "Cancelar" : "Voltar"}
        </Button>
        <Button onClick={nextStep} disabled={!canProceed() || isSaving} className="flex-1">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === (showConforto ? 4 : 3) ? (
            "Salvar"
          ) : (
            <>
              Próximo
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
