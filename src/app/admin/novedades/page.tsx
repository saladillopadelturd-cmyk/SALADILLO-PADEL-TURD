"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Flyer } from "@/types/flyer";
import Link from "next/link";
import { Plus, Trash2, Edit2, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function AdminNovedadesPage() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    link_url: "",
    active: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFlyers();
  }, []);

  async function fetchFlyers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flyers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setFlyers(data);
    } catch (err) {
      console.error("Error fetching flyers:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddFlyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMsg({ type: "error", text: "Debes seleccionar una imagen para el flyer." });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      // 1. Upload image
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("flyers")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("flyers")
        .getPublicUrl(uploadData.path);

      // 3. Insert record
      const { error: dbError } = await supabase
        .from("flyers")
        .insert({
          title: formData.title || null,
          link_url: formData.link_url || null,
          image_url: publicUrl,
          active: formData.active,
          sort_order: flyers.length,
        });

      if (dbError) throw dbError;

      setStatusMsg({ type: "success", text: "Flyer agregado exitosamente." });
      setIsModalOpen(false);
      resetForm();
      fetchFlyers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir flyer";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (flyer: Flyer) => {
    try {
      const { error } = await supabase
        .from("flyers")
        .update({ active: !flyer.active })
        .eq("id", flyer.id);
      if (error) throw error;
      setFlyers(flyers.map(f => f.id === flyer.id ? { ...f, active: !flyer.active } : f));
    } catch (e) {
      console.error(e);
      alert("Error al cambiar estado");
    }
  };

  const deleteFlyer = async (id: string, imageUrl: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este flyer?")) return;
    
    try {
      // Delete from DB
      const { error: dbError } = await supabase.from("flyers").delete().eq("id", id);
      if (dbError) throw dbError;

      // Attempt to delete from storage
      const pathParts = imageUrl.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName) {
        await supabase.storage.from("flyers").remove([`public/${fileName}`]);
      }

      setFlyers(flyers.filter(f => f.id !== id));
      setStatusMsg({ type: "success", text: "Flyer eliminado." });
    } catch (e) {
      console.error(e);
      alert("Error al eliminar el flyer");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", link_url: "", active: true });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Novedades y Flyers
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Gestiona los flyers que se muestran en el carrusel de la página principal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/flyers-ai">
            <Button
              variant="secondary"
              className="flex items-center gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Sparkles className="w-4 h-4" /> Generador de Flyers
            </Button>
          </Link>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Subir Flyer Manual
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
          statusMsg.type === "success"
            ? "bg-green-500/10 border border-green-500/30 text-green-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-dark-400">Cargando flyers...</div>
      ) : flyers.length === 0 ? (
        <Card className="text-center py-12 text-dark-400 border-dashed">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No hay flyers subidos actualmente.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flyers.map((flyer) => (
            <Card key={flyer.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-[21/9] w-full bg-dark-900 group">
                <Image
                  src={flyer.image_url}
                  alt={flyer.title || "Flyer"}
                  fill
                  className={`object-cover transition-opacity ${!flyer.active ? 'opacity-40 grayscale' : ''}`}
                />
                {!flyer.active && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-dark-950/80 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                      Inactivo
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-white mb-1 truncate">
                    {flyer.title || "Sin título"}
                  </h3>
                  {flyer.link_url && (
                    <a href={flyer.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mb-3">
                      <LinkIcon className="w-3 h-3" /> Enlace adjunto
                    </a>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-dark-800">
                  <button
                    onClick={() => toggleActive(flyer)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      flyer.active 
                        ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                    }`}
                  >
                    {flyer.active ? "Desactivar" : "Activar"}
                  </button>
                  
                  <button
                    onClick={() => deleteFlyer(flyer.id, flyer.image_url)}
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title="Nuevo Flyer">
        <form onSubmit={handleAddFlyer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Imagen del Flyer (Formato horizontal recomendado)</label>
            <div 
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                previewUrl ? 'border-primary-500/50 bg-primary-500/5' : 'border-dark-700 hover:border-dark-600 bg-dark-900'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden">
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 text-dark-400 mb-2" />
                  <span className="text-sm text-dark-400">Clic para seleccionar imagen (.jpg, .png)</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Título (Opcional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Torneo Apertura"
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Enlace / Link (Opcional)</label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary-500"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 rounded border-dark-700 bg-dark-900 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-dark-300">Mostrar inmediatamente en portada</span>
          </label>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? "Subiendo..." : "Guardar Flyer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
