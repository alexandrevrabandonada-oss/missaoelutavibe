import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserCells } from "@/hooks/useUserCells";
import { useCRMMutations, CRM_ORIGEM_OPTIONS, CRM_TAG_SUGGESTIONS, CRMContatoInput } from "@/hooks/useCRM";
import { ArrowLeft, UserPlus, X, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function VoluntarioCRMNovo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { userCells } = useUserCells();
  const { createContato } = useCRMMutations();

  // Form state
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState(profile?.city || "");
  const [bairro, setBairro] = useState("");
  const [origemCanal, setOrigemCanal] = useState<string>("rua");
  const [origemRef, setOrigemRef] = useState("");
  const [observacao, setObservacao] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false);
  const [escopoTipo, setEscopoTipo] = useState<"celula" | "cidade">("cidade");
  const [escopoId, setEscopoId] = useState("");

  // Set default escopo based on user's cells
  useState(() => {
    if (userCells && userCells.length > 0) {
      setEscopoTipo("celula");
      setEscopoId(userCells[0].id);
    } else if (profile?.city) {
      setEscopoTipo("cidade");
      setEscopoId(profile.city);
    }
  });

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!cidade.trim()) {
      toast.error("Cidade é obrigatória");
      return;
    }

    if (!consentimentoLgpd) {
      toast.error("Consentimento LGPD é obrigatório para registrar o contato");
      return;
    }

    if (!escopoId) {
      toast.error("Selecione uma célula ou cidade");
      return;
    }

    const input: CRMContatoInput = {
      escopo_tipo: escopoTipo,
      escopo_id: escopoId,
      nome: nome.trim(),
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
      cidade: cidade.trim(),
      bairro: bairro.trim() || undefined,
      origem_canal: origemCanal as any,
      origem_ref: origemRef.trim() || undefined,
      observacao: observacao.trim() || undefined,
      tags,
      consentimento_lgpd: consentimentoLgpd,
    };

    try {
      const newContact = await createContato.mutateAsync(input);
      // Navigate with deep-link to open drawer + from=novo for special post-create flow
      navigate(`/voluntario/crm?contato=${newContact.id}&from=novo`);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/crm")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Novo Contato</h1>
            <p className="text-sm text-muted-foreground">Registrar apoiador</p>
          </div>
        </div>

        {/* LGPD Notice */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Proteção de Dados (LGPD)</p>
                <p className="text-muted-foreground">
                  Antes de registrar, você deve obter consentimento verbal ou escrito do apoiador 
                  para armazenar suas informações de contato para fins de organização política.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Escopo */}
          <div className="space-y-3">
            <Label>Vincular a</Label>
            <div className="flex gap-2">
              <Select value={escopoTipo} onValueChange={(v) => setEscopoTipo(v as "celula" | "cidade")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="celula">Célula</SelectItem>
                </SelectContent>
              </Select>

              {escopoTipo === "celula" ? (
                <Select value={escopoId} onValueChange={setEscopoId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a célula" />
                  </SelectTrigger>
                  <SelectContent>
                    {userCells?.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={escopoId}
                  onChange={(e) => setEscopoId(e.target.value)}
                  placeholder="Nome da cidade"
                  className="flex-1"
                />
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do apoiador"
              required
            />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Localização */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
              />
            </div>
          </div>

          {/* Origem */}
          <div className="space-y-2">
            <Label>Origem do contato</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={origemCanal} onValueChange={setOrigemCanal}>
                <SelectTrigger>
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  {CRM_ORIGEM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={origemRef}
                onChange={(e) => setOrigemRef(e.target.value)}
                placeholder="Referência (evento, quem indicou...)"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => handleAddTag(newTag)}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {CRM_TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleAddTag(tag)}
                >
                  + {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Anotações sobre o contato..."
              rows={3}
            />
          </div>

          {/* LGPD Consent */}
          <Card className={`${consentimentoLgpd ? "border-green-500/50" : "border-destructive/50"}`}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="lgpd"
                  checked={consentimentoLgpd}
                  onCheckedChange={(checked) => setConsentimentoLgpd(!!checked)}
                  className="mt-1"
                />
                <label htmlFor="lgpd" className="text-sm cursor-pointer">
                  <span className="font-medium">Consentimento LGPD *</span>
                  <p className="text-muted-foreground mt-1">
                    Confirmo que o apoiador consentiu verbalmente ou por escrito o armazenamento 
                    de seus dados pessoais para contato e organização política.
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>

          {!consentimentoLgpd && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Marque o consentimento LGPD para salvar</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={!consentimentoLgpd || createContato.isPending}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {createContato.isPending ? "Salvando..." : "Registrar Contato"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
