/**
 * CityCellWizard - Simplified: city selection only
 * Cell is auto-assigned to "Geral" when coordinator approves.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCityCellSelection, City } from "@/hooks/useCityCellSelection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/ui/Logo";
import {
  MapPin,
  ArrowRight,
  Check,
  Search,
  Loader2,
} from "lucide-react";

interface CityCellWizardProps {
  onComplete?: () => void;
}

export function CityCellWizard({ onComplete }: CityCellWizardProps) {
  const navigate = useNavigate();
  const {
    cities,
    isLoadingCities,
    saveSelection,
    isSaving,
  } = useCityCellSelection();

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");

  const filteredCities = cities.filter((city) =>
    city.nome.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectedCity = cities.find((c) => c.id === selectedCityId);

  const handleSelectCity = (city: City) => {
    setSelectedCityId(city.id);
  };

  const handleFinish = () => {
    if (!selectedCityId) return;

    saveSelection(
      { cityId: selectedCityId, cellId: null, skipCell: true },
      {
        onSuccess: () => {
          onComplete?.();
          navigate("/aguardando-aprovacao");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Logo size="sm" />
          <div className="flex-1">
            <h1 className="font-semibold">Escolha sua cidade</h1>
            <p className="text-xs text-muted-foreground">
              Você será alocado automaticamente na célula Geral
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Onde você vai atuar?
            </CardTitle>
            <CardDescription>
              Selecione a cidade. Ao ser aprovado, você entra automaticamente na célula Geral.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cidade..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* City list */}
            {isLoadingCities ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredCities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {citySearch ? "Nenhuma cidade encontrada" : "Nenhuma cidade disponível"}
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {filteredCities.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted
                        ${selectedCityId === city.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{city.nome}</p>
                          <p className="text-xs text-muted-foreground">{city.uf}</p>
                        </div>
                        {selectedCityId === city.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Confirm button */}
            {selectedCity && (
              <Button
                onClick={handleFinish}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Confirmar {selectedCity.nome}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
