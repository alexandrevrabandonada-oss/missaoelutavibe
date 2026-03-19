import { useState } from "react";
import { useCells, CELL_TIPO_LABELS } from "@/hooks/useCells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MapPin,
  Plus,
  X,
  Target,
  Globe,
  Layers,
  Building2
} from "lucide-react";

type CellTipo = "territorial" | "tema" | "regional";

const TIPO_ICONS: Record<CellTipo, React.ElementType> = {
  territorial: MapPin,
  tema: Layers,
  regional: Globe,
};

export default function AdminCelulasPanel() {
  const { cells, isLoading, createCell, isCreating } = useCells();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    city: "",
    state: "",
    neighborhood: "",
    weekly_goal: 5,
    tipo: "territorial" as CellTipo,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    await createCell({
      name: form.name,
      description: form.description || null,
      city: form.city || "N/A",
      state: form.state || "N/A",
      neighborhood: form.neighborhood || null,
      weekly_goal: form.weekly_goal,
      is_active: true,
      tipo: form.tipo,
    } as any);

    setForm({
      name: "",
      description: "",
      city: "",
      state: "",
      neighborhood: "",
      weekly_goal: 5,
      tipo: "territorial",
    });
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Building2 className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Gestão de Células</span>
          </div>
          <h2 className="text-2xl font-bold">Células</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? "Cancelar" : "Nova Célula"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-luta space-y-4">
          <h3 className="font-bold text-lg">Criar Nova Célula</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium mb-1 block">Nome da Célula *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Comunicação, Sul Fluminense"
                required
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium mb-1 block">Tipo *</label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as CellTipo })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="territorial">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Territorial
                    </span>
                  </SelectItem>
                  <SelectItem value="tema">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Temática
                    </span>
                  </SelectItem>
                  <SelectItem value="regional">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Regional
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade (opcional)</label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ex: Rio de Janeiro"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Ex: RJ"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bairro</label>
              <Input
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                placeholder="Ex: Centro"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Semanal</label>
              <Input
                type="number"
                value={form.weekly_goal}
                onChange={(e) => setForm({ ...form, weekly_goal: parseInt(e.target.value) || 0 })}
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o objetivo e contexto desta célula..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isCreating || !form.name.trim()}>
            {isCreating ? <LoadingSpinner size="sm" /> : "Criar Célula"}
          </Button>
        </form>
      )}

      {/* Cells List */}
      {cells.length === 0 ? (
        <div className="card-luta text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-bold text-lg">Nenhuma célula ainda</p>
          <p className="text-muted-foreground">Crie a primeira célula para organizar a base.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cells.map((cell) => {
            const tipo = (cell as any).tipo as CellTipo | undefined;
            const TipoIcon = tipo ? TIPO_ICONS[tipo] : MapPin;
            
            return (
              <div key={cell.id} className="card-luta">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    cell.is_active ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    <TipoIcon className={`h-5 w-5 ${
                      cell.is_active ? "text-primary" : ""
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold">{cell.name}</p>
                      {tipo && (
                        <Badge variant="outline" className="text-xs">
                          {CELL_TIPO_LABELS[tipo]}
                        </Badge>
                      )}
                      {!cell.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    {cell.city && cell.city !== "N/A" && (
                      <p className="text-sm text-muted-foreground">
                        {cell.neighborhood ? `${cell.neighborhood}, ` : ""}{cell.city} - {cell.state}
                      </p>
                    )}
                    {cell.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {cell.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Meta: {cell.weekly_goal}/semana
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
