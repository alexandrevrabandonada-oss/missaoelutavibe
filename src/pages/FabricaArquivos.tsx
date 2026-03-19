import { useState } from "react";
import { ArrowLeft, Search, Filter, Upload as UploadIcon, RefreshCw, CheckCircle, Archive, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentUploadWizard } from "@/components/fabrica/ContentUploadWizard";
import { ContentItemGrid } from "@/components/fabrica/ContentItemGrid";
import { useContentItems, ContentType, ContentStatus } from "@/hooks/useContentItems";
import { useMigrateOrphanAssets } from "@/hooks/useContentUpload";
import { useAuth } from "@/hooks/useAuth";

export default function FabricaArquivos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [variationParentId, setVariationParentId] = useState<string | null>(null);
  const [variationParentTags, setVariationParentTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "published" | "archived">("pending");

  const migrateAssets = useMigrateOrphanAssets();

  // Fetch all content items (no status filter at query level so we can count)
  const { data: allItems = [], isLoading, refetch } = useContentItems({
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: search.length >= 2 ? search : undefined,
  });

  // Filter by status based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case "pending":
        return allItems.filter(i => i.status === "DRAFT");
      case "published":
        return allItems.filter(i => i.status === "PUBLISHED");
      case "archived":
        return allItems.filter(i => i.status === "ARCHIVED");
      default:
        return allItems;
    }
  };

  const items = getFilteredItems();
  const pendingCount = allItems.filter(i => i.status === "DRAFT").length;
  const publishedCount = allItems.filter(i => i.status === "PUBLISHED").length;

  const handleAddVariation = (contentId: string) => {
    const parent = allItems.find(i => i.id === contentId);
    setVariationParentId(contentId);
    setVariationParentTags(parent?.tags || []);
    setUploadOpen(true);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Inbox de Conteúdo</h1>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nada pendente"}
            </p>
          </div>
          
          {/* Upload Button */}
          <Button onClick={() => setUploadOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Enviar
          </Button>
        </div>
      </header>

      <main className="container space-y-4 px-4 py-6">
        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="pending" className="relative">
              <Clock className="h-4 w-4 mr-1" />
              Pendentes
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px]"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              Todos
            </TabsTrigger>
            <TabsTrigger value="published">
              <CheckCircle className="h-4 w-4 mr-1" />
              Publicados
            </TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="h-4 w-4 mr-1" />
              Arquivados
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Buscar conteúdo"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as ContentType | "all")}
            >
              <SelectTrigger className="w-[140px]" aria-label="Filtrar por tipo">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="MATERIAL">📄 Materiais</SelectItem>
                <SelectItem value="SHAREPACK">📦 Sharepacks</SelectItem>
                <SelectItem value="TEMPLATE">🎨 Templates</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => migrateAssets.mutate()}
              disabled={migrateAssets.isPending}
              title="Migrar assets antigos"
            >
              <RefreshCw className={`h-4 w-4 ${migrateAssets.isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <ContentItemGrid
          items={items}
          isLoading={isLoading}
          showStatusActions={true}
          onAddVariation={handleAddVariation}
        />

        {/* Stats */}
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/50 p-4 text-sm">
          <div>
            <span className="font-medium">{allItems.length}</span>{" "}
            <span className="text-muted-foreground">total</span>
          </div>
          <div>
            <span className="font-medium text-amber-600">{pendingCount}</span>{" "}
            <span className="text-muted-foreground">pendentes</span>
          </div>
          <div>
            <span className="font-medium text-green-600">{publishedCount}</span>{" "}
            <span className="text-muted-foreground">publicados</span>
          </div>
          <div>
            <span className="font-medium">
              {allItems.filter((i) => i.type === "SHAREPACK").length}
            </span>{" "}
            <span className="text-muted-foreground">sharepacks</span>
          </div>
        </div>
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => {
        setUploadOpen(open);
        if (!open) {
          setVariationParentId(null);
          setVariationParentTags([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {variationParentId ? "📦 Enviar variação" : "📦 Enviar conteúdo"}
            </DialogTitle>
          </DialogHeader>
          <ContentUploadWizard
            defaultType={variationParentId ? "TEMPLATE" : "SHAREPACK"}
            parentContentId={variationParentId || undefined}
            parentTags={variationParentTags}
            onComplete={() => {
              refetch();
              setUploadOpen(false);
              setVariationParentId(null);
              setVariationParentTags([]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
