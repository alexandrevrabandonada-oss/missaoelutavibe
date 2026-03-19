import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLogGrowthEvent, storeOrigin } from "@/hooks/useGrowth";
import { getPrefillCidade } from "@/hooks/useDistribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Check, MapPin, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// Same cities from Onboarding - shared constant
const RJ_CITIES = [
  "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios",
  "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim",
  "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci",
  "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo",
  "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu",
  "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin",
  "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara",
  "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco",
  "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira",
  "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu",
  "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis",
  "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados",
  "Quissamã", "Resende", "Rio Bonito", "Rio Claro", "Rio das Flores",
  "Rio das Ostras", "Rio de Janeiro", "Santa Maria Madalena", "Santo Antônio de Pádua",
  "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra",
  "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto",
  "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema",
  "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis",
  "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras",
  "Volta Redonda"
];

const INTERESTS_MINI = [
  { value: "rua", label: "Rua", desc: "Panfletagem, mutirões" },
  { value: "conteudo", label: "Conteúdo", desc: "Posts, vídeos" },
  { value: "escuta", label: "Escuta", desc: "Conversas, acolhimento" },
  { value: "dados", label: "Dados", desc: "Mapeamento" },
];

const AVAILABILITY_MINI = [
  { value: "baixa", label: "Pouca", desc: "1-2h/semana" },
  { value: "media", label: "Média", desc: "3-5h/semana" },
  { value: "alta", label: "Alta", desc: "6h+/semana" },
];

export default function ConviteMini() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const logGrowthEvent = useLogGrowthEvent();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  
  // Optional contact info (collapsed)
  const [showContact, setShowContact] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  
  // Get params from URL
  const refCode = searchParams.get("ref");
  const cidadeParam = searchParams.get("cidade");
  
  // Pre-fill city from URL or sessionStorage
  useEffect(() => {
    const storedCidade = getPrefillCidade();
    const prefillCity = cidadeParam || storedCidade;
    
    if (prefillCity && RJ_CITIES.includes(prefillCity)) {
      setCity(prefillCity);
    }
    
    // Store ref for later
    if (refCode) {
      sessionStorage.setItem("invite_code", refCode);
      storeOrigin({ inviteCode: refCode });
    }
  }, [cidadeParam, refCode]);

  const toggleInterest = (value: string) => {
    if (interests.includes(value)) {
      setInterests(interests.filter((v) => v !== value));
    } else {
      setInterests([...interests, value]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !city || interests.length === 0 || !availability || !lgpdConsent) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setLoading(true);
    
    try {
      // Store mini form data for onboarding completion
      sessionStorage.setItem("mini_lead_data", JSON.stringify({
        firstName: firstName.trim(),
        city,
        interests,
        availability,
        email: email.trim() || null,
        phone: phone.trim() || null,
        lgpdConsent: true,
        lgpdConsentAt: new Date().toISOString(),
        isMiniMode: true,
      }));
      
      // Log mini submit event
      logGrowthEvent.mutate({
        eventType: "invite_submit_mini",
        inviteCode: refCode || undefined,
        meta: {
          cidade: city,
          interests_count: interests.length,
          availability,
          has_email: !!email.trim(),
          has_phone: !!phone.trim(),
        },
      });
      
      toast.success("Ótimo! Agora crie sua conta para continuar.");
      
      // Redirect to auth with mini mode flag
      const authParams = new URLSearchParams();
      authParams.set("mode", "signup");
      if (refCode) authParams.set("ref", refCode);
      
      navigate(`/auth?${authParams.toString()}`, { replace: true });
    } catch (error) {
      console.error("Mini form error:", error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = firstName.trim() && city && interests.length > 0 && availability && lgpdConsent;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      <Logo size="sm" className="mb-6" />
      
      {/* Header */}
      <div className="text-center mb-6 animate-in-up">
        <Badge variant="outline" className="mb-3 text-xs tracking-wider">
          PRÉ-CAMPANHA
        </Badge>
        <h1 className="text-2xl font-black tracking-tight">#ÉLUTA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escutar • Cuidar • Organizar
        </p>
      </div>

      {/* City badge if pre-filled */}
      {city && (
        <div className="flex justify-center mb-4">
          <Badge variant="outline" className="bg-secondary px-3 py-1.5">
            <MapPin className="h-3 w-3 mr-1.5" />
            {city}
          </Badge>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 space-y-5 animate-in-up">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName">Seu primeiro nome *</Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Como quer ser chamado(a)?"
            className="bg-secondary border-border"
            maxLength={50}
            required
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label>Cidade (RJ) *</Label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full p-3 bg-secondary border border-border rounded-md text-sm"
            required
          >
            <option value="">Selecione sua cidade</option>
            {RJ_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Interests */}
        <div className="space-y-3">
          <Label>Como quer ajudar? *</Label>
          <div className="grid grid-cols-2 gap-2">
            {INTERESTS_MINI.map((i) => (
              <button
                key={i.value}
                type="button"
                onClick={() => toggleInterest(i.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all text-sm",
                  interests.includes(i.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-border hover:border-primary/50"
                )}
              >
                <span className="font-medium block">{i.label}</span>
                <span className="text-xs opacity-75">{i.desc}</span>
                {interests.includes(i.value) && (
                  <Check className="inline ml-1 h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-3">
          <Label>Disponibilidade *</Label>
          <div className="grid grid-cols-3 gap-2">
            {AVAILABILITY_MINI.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAvailability(a.value)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all text-sm",
                  availability === a.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary border-border hover:border-primary/50"
                )}
              >
                <span className="font-medium block">{a.label}</span>
                <span className="text-xs opacity-75">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Contact (Collapsible) */}
        <Collapsible open={showContact} onOpenChange={setShowContact}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-secondary/50 rounded-lg border border-border/50 text-sm">
            <span className="text-muted-foreground">Quero deixar contato (opcional)</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showContact && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-muted-foreground">WhatsApp/Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(21) 99999-9999"
                className="bg-secondary border-border"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* LGPD Consent */}
        <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
          <Checkbox
            id="lgpd"
            checked={lgpdConsent}
            onCheckedChange={(checked) => setLgpdConsent(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="lgpd" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            <Shield className="inline h-3 w-3 mr-1" />
            Concordo com o uso dos meus dados para fins de organização política, conforme a LGPD. 
            Posso solicitar exclusão a qualquer momento. *
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="btn-luta w-full"
          disabled={loading || !isFormValid}
        >
          {loading ? "Salvando..." : "Continuar →"}
        </Button>
      </form>

      <p className="signature-luta mt-6 text-center">#ÉLUTA</p>
    </div>
  );
}
