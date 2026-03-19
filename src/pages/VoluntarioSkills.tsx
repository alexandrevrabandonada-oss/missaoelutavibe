import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import {
  useMySkills,
  AVAILABLE_SKILLS,
  SKILL_NIVEL_LABELS,
  DISPONIBILIDADE_TAGS,
  type SkillNivel,
} from "@/hooks/useTalentos";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Briefcase,
  Clock,
  Link as LinkIcon,
  Star,
} from "lucide-react";

export default function VoluntarioSkills() {
  const navigate = useNavigate();
  const { hasAccess, isLoading: isAuthLoading } = useRequireApproval();
  const {
    skills,
    isLoading,
    addSkill,
    isAdding,
    removeSkill,
    isRemoving,
  } = useMySkills();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill: "",
    nivel: "iniciante" as SkillNivel,
    disponibilidade_horas: "",
    disponibilidade_tags: [] as string[],
    portfolio_url: "",
  });

  if (isAuthLoading || isLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return null;
  }

  const existingSkillValues = skills.map((s) => s.skill);
  const availableToAdd = AVAILABLE_SKILLS.filter(
    (s) => !existingSkillValues.includes(s.value)
  );

  const handleAddSkill = async () => {
    if (!newSkill.skill) {
      toast.error("Selecione uma habilidade");
      return;
    }

    try {
      await addSkill({
        skill: newSkill.skill,
        nivel: newSkill.nivel,
        disponibilidade_horas: newSkill.disponibilidade_horas
          ? parseInt(newSkill.disponibilidade_horas)
          : undefined,
        disponibilidade_tags: newSkill.disponibilidade_tags,
        portfolio_url: newSkill.portfolio_url || undefined,
      });
      toast.success("Habilidade adicionada!");
      setShowAddDialog(false);
      setNewSkill({
        skill: "",
        nivel: "iniciante",
        disponibilidade_horas: "",
        disponibilidade_tags: [],
        portfolio_url: "",
      });
    } catch (error) {
      toast.error("Erro ao adicionar habilidade");
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await removeSkill(skillId);
      toast.success("Habilidade removida");
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  const toggleDispTag = (tag: string) => {
    setNewSkill((prev) => ({
      ...prev,
      disponibilidade_tags: prev.disponibilidade_tags.includes(tag)
        ? prev.disponibilidade_tags.filter((t) => t !== tag)
        : [...prev.disponibilidade_tags, tag],
    }));
  };

  const getSkillLabel = (value: string) => {
    return AVAILABLE_SKILLS.find((s) => s.value === value)?.label ?? value;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <h1 className="text-lg font-semibold flex-1">Minhas Habilidades</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Info */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Cadastre suas habilidades para que coordenadores possam encontrar
              você quando precisarem de apoio específico. Isso aumenta suas
              chances de participar de missões alinhadas com seu perfil.
            </p>
          </CardContent>
        </Card>

        {/* Add Button */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={availableToAdd.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Habilidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Habilidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Skill Select */}
              <div className="space-y-2">
                <Label>Habilidade *</Label>
                <Select
                  value={newSkill.skill}
                  onValueChange={(v) => setNewSkill((p) => ({ ...p, skill: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex flex-col">
                          <span>{s.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.desc}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nivel */}
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select
                  value={newSkill.nivel}
                  onValueChange={(v) =>
                    setNewSkill((p) => ({ ...p, nivel: v as SkillNivel }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_NIVEL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Disponibilidade tags */}
              <div className="space-y-2">
                <Label>Quando posso ajudar</Label>
                <div className="flex flex-wrap gap-2">
                  {DISPONIBILIDADE_TAGS.map((t) => (
                    <Badge
                      key={t.value}
                      variant={
                        newSkill.disponibilidade_tags.includes(t.value)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleDispTag(t.value)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Horas */}
              <div className="space-y-2">
                <Label>Horas por semana (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={newSkill.disponibilidade_horas}
                  onChange={(e) =>
                    setNewSkill((p) => ({
                      ...p,
                      disponibilidade_horas: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Portfolio */}
              <div className="space-y-2">
                <Label>Link do portfólio (opcional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={newSkill.portfolio_url}
                  onChange={(e) =>
                    setNewSkill((p) => ({ ...p, portfolio_url: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddSkill} disabled={isAdding}>
                {isAdding ? <LoadingSpinner size="sm" /> : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Skills List */}
        {skills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma habilidade cadastrada ainda.</p>
              <p className="text-sm">
                Adicione suas habilidades para ser encontrado!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {skills.map((skill) => (
              <Card key={skill.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {getSkillLabel(skill.skill)}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSkill(skill.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      {SKILL_NIVEL_LABELS[skill.nivel]}
                    </Badge>
                    {skill.disponibilidade_horas && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {skill.disponibilidade_horas}h/sem
                      </Badge>
                    )}
                    {skill.disponibilidade_tags?.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {DISPONIBILIDADE_TAGS.find((t) => t.value === tag)
                          ?.label ?? tag}
                      </Badge>
                    ))}
                  </div>
                  {skill.portfolio_url && (
                    <a
                      href={skill.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      Ver portfólio
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Link to Chamados */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/voluntario/talentos")}
        >
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Chamados Abertos</p>
              <p className="text-sm text-muted-foreground">
                Veja onde suas habilidades são necessárias
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 rotate-180" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
