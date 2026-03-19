import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, Package, Sparkles } from "lucide-react";
import { useNewProductAI, type NewProductFormData } from "../hooks/useNewProductAI";

const SEED_STYLES = [
  "Pratico e tecnico",
  "Caldo e narrativo",
  "Minimal e diretto",
  "Guida step-by-step",
];

const INITIAL_FORM: NewProductFormData = {
  title: "",
  description: "",
  category: "",
  price: 0,
  tags: "",
  seedStyle: "Pratico e tecnico",
  imageUrl: "",
  generateImage: false,
};

export default function NewProductAIPanel() {
  const [form, setForm] = useState<NewProductFormData>({ ...INITIAL_FORM });
  const { generating, creating, generatedContent, generatedImageBase64, generateContent, createOnShopify, reset } = useNewProductAI();

  const set = <K extends keyof NewProductFormData>(key: K, value: NewProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    reset();
  };

  return (
    <div className="space-y-4">
      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nuovo Prodotto AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="np-title">Titolo base *</Label>
              <Input id="np-title" placeholder="es. Aloe Vera Premium" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-category">Categoria</Label>
              <Input id="np-category" placeholder="es. Piante da Interno" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="np-desc">Breve descrizione</Label>
            <Textarea id="np-desc" placeholder="Descrivi brevemente il prodotto..." value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="np-price">Prezzo (€) *</Label>
              <Input id="np-price" type="number" min={0.01} step={0.01} placeholder="29.90" value={form.price || ""} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-tags">Tag (separati da virgola)</Label>
              <Input id="np-tags" placeholder="indoor, facile, tropicale" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-style">Stile di scrittura</Label>
              <Select value={form.seedStyle} onValueChange={(v) => set("seedStyle", v)}>
                <SelectTrigger id="np-style"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEED_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Immagine prodotto</Label>
            <div className="space-y-2">
              <Input placeholder="URL immagine (opzionale)" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
              <div className="flex items-center gap-2">
                <Checkbox id="np-genimg" checked={form.generateImage} onCheckedChange={(v) => set("generateImage", !!v)} />
                <Label htmlFor="np-genimg" className="text-sm font-normal cursor-pointer">Genera immagine con AI</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => generateContent(form)} disabled={generating || !form.title.trim()} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera scheda prodotto
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={generating || creating}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Preview contenuti generati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title ottimizzato (H1)</Label>
                <p className="text-lg font-semibold">{generatedContent.h1_title}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">SEO Title</Label>
                <p className="text-sm">{generatedContent.seo_title}</p>
                <Label className="text-xs text-muted-foreground mt-2 block">SEO Description</Label>
                <p className="text-sm text-muted-foreground">{generatedContent.seo_description}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Descrizione HTML completa</Label>
              <div className="prose prose-sm max-h-[300px] overflow-auto rounded-md border p-3" dangerouslySetInnerHTML={{ __html: generatedContent.optimized_description }} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cura della pianta</Label>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p><strong>Luce:</strong> {generatedContent.care_guide?.light}</p>
                  <p><strong>Irrigazione:</strong> {generatedContent.care_guide?.watering}</p>
                  <p><strong>Terreno:</strong> {generatedContent.care_guide?.soil}</p>
                  <p><strong>Temperatura:</strong> {generatedContent.care_guide?.temperature}</p>
                  <p><strong>Note:</strong> {generatedContent.care_guide?.notes}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Caratteristiche</Label>
                <ul className="rounded-md border p-3 text-sm space-y-1 list-disc list-inside">
                  {generatedContent.characteristics?.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Benefici</Label>
                <ul className="rounded-md border p-3 text-sm space-y-1 list-disc list-inside">
                  {generatedContent.key_benefits?.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </div>

            {generatedContent.image_alt_texts?.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Alt text immagine</Label>
                <div className="flex flex-wrap gap-2">
                  {generatedContent.image_alt_texts.map((alt, i) => (
                    <Badge key={i} variant="secondary">{alt}</Badge>
                  ))}
                </div>
              </div>
            )}

            {generatedImageBase64 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Immagine generata AI</Label>
                <img src={generatedImageBase64} alt="Immagine generata" className="max-h-48 rounded-md border" />
              </div>
            )}

            <Separator />

            <Button onClick={() => createOnShopify(form)} disabled={creating || !form.price || form.price <= 0} className="gap-2" size="lg">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Crea prodotto su Shopify
            </Button>
            {(!form.price || form.price <= 0) && (
              <p className="text-sm text-destructive">Prezzo obbligatorio e deve essere {">"} 0</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
