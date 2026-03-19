import { useState } from "react";
import { useImportFormacao } from "@/hooks/useImportFormacao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Upload,
  CheckCircle2,
  XCircle,
  FileJson,
  BookOpen,
  HelpCircle,
  Link2,
  Tag,
  Clock,
  Star,
} from "lucide-react";

export default function AdminImportPanel() {
  const [jsonText, setJsonText] = useState("");
  const {
    isValidating,
    isImporting,
    validationResult,
    validateJSON,
    importPackage,
    resetValidation,
  } = useImportFormacao();

  const handleValidate = async () => {
    if (!jsonText.trim()) {
      return;
    }
    await validateJSON(jsonText);
  };

  const handleImport = async () => {
    const success = await importPackage(jsonText);
    if (success) {
      setJsonText("");
    }
  };

  const handleTextChange = (value: string) => {
    setJsonText(value);
    if (validationResult) {
      resetValidation();
    }
  };

  const exampleJSON = `{
  "curso": {
    "titulo": "Nome do Curso",
    "descricao": "Descrição do curso...",
    "nivel": "INTRO",
    "estimativa_min": 30,
    "tags": ["tag1", "tag2"],
    "recomendado": true
  },
  "aulas": [
    {
      "titulo": "Aula 1",
      "conteudo_texto": "# Título\\n\\nConteúdo em markdown...",
      "ordem": 1,
      "materiais": [
        {
          "titulo": "Link de referência",
          "url": "https://exemplo.com",
          "categoria": "texto"
        }
      ],
      "quiz": [
        {
          "enunciado": "Qual a resposta correta?",
          "explicacao": "Explicação após responder...",
          "opcoes": [
            { "texto": "Opção A", "correta": true },
            { "texto": "Opção B", "correta": false },
            { "texto": "Opção C", "correta": false }
          ]
        }
      ]
    }
  ]
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary mb-2">
          <Upload className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Importar Pacote</span>
        </div>
        <h2 className="text-2xl font-bold">Importar Pacote de Formação</h2>
        <p className="text-muted-foreground mt-1">
          Cole um JSON estruturado para criar automaticamente curso, aulas, quizzes e materiais.
        </p>
      </div>

      {/* JSON Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            JSON do Pacote
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setJsonText(exampleJSON)}
            className="text-xs"
          >
            Inserir exemplo
          </Button>
        </div>
        <Textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Cole o JSON aqui..."
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleValidate}
          disabled={!jsonText.trim() || isValidating || isImporting}
          variant="outline"
        >
          {isValidating ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Validando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Validar JSON
            </>
          )}
        </Button>
        <Button
          onClick={handleImport}
          disabled={!validationResult?.valid || isImporting}
          className="bg-primary hover:bg-primary/90"
        >
          {isImporting ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Importando...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </>
          )}
        </Button>
      </div>

      {/* Validation Errors */}
      {validationResult && !validationResult.valid && (
        <div className="card-luta border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive mb-3">
            <XCircle className="h-5 w-5" />
            <span className="font-bold">Erros encontrados</span>
          </div>
          <ul className="space-y-1 text-sm">
            {validationResult.errors.map((error, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-destructive">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {validationResult?.valid && validationResult.preview && (
        <div className="card-luta border-green-500/50 bg-green-500/5">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-bold">JSON válido! Preview:</span>
          </div>

          <div className="space-y-4">
            {/* Course Title */}
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {validationResult.preview.titulo}
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  RECOMENDADO
                </span>
              </h3>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <BookOpen className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-bold">{validationResult.preview.numAulas}</div>
                  <div className="text-xs text-muted-foreground">Aulas</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <HelpCircle className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-bold">{validationResult.preview.numPerguntas}</div>
                  <div className="text-xs text-muted-foreground">Perguntas</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <Link2 className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-bold">{validationResult.preview.numMateriais}</div>
                  <div className="text-xs text-muted-foreground">Materiais</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-bold">
                    {validationResult.preview.estimativa_min || "—"} min
                  </div>
                  <div className="text-xs text-muted-foreground">Estimativa</div>
                </div>
              </div>
            </div>

            {/* Level & Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Nível: {validationResult.preview.nivel}
              </span>
              {validationResult.preview.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON Schema Help */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver estrutura do JSON esperada
        </summary>
        <div className="mt-3 p-4 bg-muted/50 rounded-lg">
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{exampleJSON}</pre>
        </div>
      </details>
    </div>
  );
}
