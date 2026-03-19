import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Check, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useConvites } from "@/hooks/useConvites";
import { cn } from "@/lib/utils";

// Cidades do Rio de Janeiro (células disponíveis)
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

const AVAILABILITY = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "fim_de_semana", label: "Fim de semana" },
  { value: "flexivel", label: "Flexível" },
];

const INTERESTS = [
  { value: "rua", label: "Rua", desc: "Panfletagem, mutirões" },
  { value: "conteudo", label: "Conteúdo", desc: "Posts, vídeos, design" },
  { value: "escuta", label: "Escuta", desc: "Conversas, acolhimento" },
  { value: "dados", label: "Dados", desc: "Mapeamento, organização" },
  { value: "tech", label: "Tech", desc: "Desenvolvimento, sistemas" },
  { value: "formacao", label: "Formação", desc: "Estudar e ensinar" },
  { value: "juridico", label: "Jurídico", desc: "Orientação legal" },
  { value: "logistica", label: "Logística", desc: "Transporte, materiais" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const state = "RJ"; // Estado fixo por enquanto
  
  const [availability, setAvailability] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Contact completion (step 4 for mini mode)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const { isPending, isRejected, isStatusLoading } = useVolunteerStatus();
  const { registerUsage } = useConvites();
  const navigate = useNavigate();
  
  // Check if coming from mini mode
  const miniLeadData = (() => {
    try {
      const stored = sessionStorage.getItem("mini_lead_data");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  
  const isMiniMode = !!miniLeadData?.isMiniMode;
  const totalSteps = isMiniMode ? 4 : 3;
  
  // Pre-fill from mini lead data
  useEffect(() => {
    if (miniLeadData) {
      if (miniLeadData.city) setCity(miniLeadData.city);
      if (miniLeadData.interests) setInterests(miniLeadData.interests);
      if (miniLeadData.availability) {
        // Convert single availability to array format
        const availMap: Record<string, string[]> = {
          baixa: ["flexivel"],
          media: ["manha", "tarde"],
          alta: ["manha", "tarde", "noite", "fim_de_semana"],
        };
        setAvailability(availMap[miniLeadData.availability] || []);
      }
      if (miniLeadData.email) setEmail(miniLeadData.email);
      if (miniLeadData.phone) setPhone(miniLeadData.phone);
      
      // For mini mode, start at step that needs completion
      // Skip location if city already set, skip interests/availability if already set
      if (miniLeadData.city && miniLeadData.interests?.length > 0) {
        // Mini users already have city + interests, go to step 4 (complete profile)
        setStep(4);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect pending/rejected users to approval page
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao");
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  if (isStatusLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  // Don't render if user should be redirected
  if (isPending || isRejected) {
    return null;
  }

  const toggleSelection = (value: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Build profile update with optional contact info
      const profileUpdate: Record<string, any> = {
        city,
        neighborhood,
        state,
        availability: availability as any,
        interests: interests as any,
        onboarding_status: "concluido",
        onboarding_completed_at: new Date().toISOString(),
        lgpd_consent: miniLeadData?.lgpdConsent || true,
        lgpd_consent_at: miniLeadData?.lgpdConsentAt || new Date().toISOString(),
      };
      
      // Add contact info if provided (especially for mini mode step 4)
      if (email.trim()) {
        profileUpdate.contact_email = email.trim();
      }
      if (phone.trim()) {
        profileUpdate.phone = phone.trim();
      }
      
      updateProfile(profileUpdate);
      
      // Clear mini lead data
      sessionStorage.removeItem("mini_lead_data");

      // Register invite usage if there was a ref code
      const inviteCode = sessionStorage.getItem("invite_code");
      if (inviteCode && user.id) {
        try {
          await registerUsage({ code: inviteCode, userId: user.id });
          sessionStorage.removeItem("invite_code");
        } catch (e) {
          console.error("Failed to register invite usage:", e);
        }
      }
      
      toast.success("Perfil completo! Vamos para sua primeira missão.");
      navigate("/voluntario/hoje");
    } catch (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      <Logo size="sm" className="mb-8" />

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full", s <= step ? "bg-primary" : "bg-secondary")} />
        ))}
      </div>

      <div className="flex-1 animate-slide-up">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Onde você está?</h2>
            <p className="text-muted-foreground">Vamos te conectar com ações perto de você.</p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="w-full p-3 bg-secondary/50 border border-border rounded-md text-muted-foreground">
                Rio de Janeiro
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade (sua célula) *</label>
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                className="w-full p-3 bg-secondary border border-border rounded-md"
                required
              >
                <option value="">Selecione sua cidade</option>
                {RJ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Bairro (opcional)</label>
              <input 
                type="text" 
                value={neighborhood} 
                onChange={(e) => setNeighborhood(e.target.value)} 
                placeholder="Seu bairro" 
                className="w-full p-3 bg-secondary border border-border rounded-md" 
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quando você pode ajudar?</h2>
            <p className="text-muted-foreground">Selecione seus horários disponíveis.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {AVAILABILITY.map((a) => (
                <button key={a.value} onClick={() => toggleSelection(a.value, availability, setAvailability)} className={cn("p-4 rounded-lg border text-left transition-all", availability.includes(a.value) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/50")}>
                  <span className="font-medium">{a.label}</span>
                  {availability.includes(a.value) && <Check className="inline ml-2 h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && !isMiniMode && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Como quer ajudar?</h2>
            <p className="text-muted-foreground">Escolha uma ou mais áreas.</p>
            
            <div className="grid gap-3">
              {INTERESTS.map((i) => (
                <button key={i.value} onClick={() => toggleSelection(i.value, interests, setInterests)} className={cn("p-4 rounded-lg border text-left transition-all", interests.includes(i.value) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/50")}>
                  <span className="font-bold">{i.label}</span>
                  <span className="text-sm opacity-80 ml-2">{i.desc}</span>
                  {interests.includes(i.value) && <Check className="inline ml-2 h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 4: Complete profile (mini mode) */}
        {step === 4 && isMiniMode && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Complete seu perfil</h2>
            <p className="text-muted-foreground">
              Adicione formas de contato para a coordenação te encontrar.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email (opcional)
                </Label>
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
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp/Telefone (opcional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(21) 99999-9999"
                  className="bg-secondary border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Bairro (opcional)</Label>
                <Input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Seu bairro"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Você pode pular e adicionar depois nas configurações.
            </p>
          </div>
        )}
      </div>

      <div className="pt-6 space-y-3 safe-bottom">
        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)} className="btn-luta w-full" disabled={step === 1 && !city}>
            Continuar
          </Button>
        ) : (
          <Button onClick={handleComplete} className="btn-luta w-full animate-pulse-action" disabled={loading || (step === 3 && !isMiniMode && interests.length === 0)}>
            {loading ? "Salvando..." : "Começar Minha Primeira Missão"}
          </Button>
        )}
        
        {step > 1 && !isMiniMode && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="w-full">Voltar</Button>
        )}
        
        {/* Mini mode step 4: allow skip */}
        {step === 4 && isMiniMode && (
          <Button variant="ghost" onClick={handleComplete} className="w-full" disabled={loading}>
            Pular por agora
          </Button>
        )}
      </div>
    </div>
  );
}
