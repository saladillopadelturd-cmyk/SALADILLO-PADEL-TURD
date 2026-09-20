"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import NewsCarousel from "@/components/home/NewsCarousel";
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

      {/* Vista previa del carrusel con miniaturas y botón eliminar */}
      <NewsCarousel 
        flyers={flyers} 
        showThumbnails={true} 
        isAdmin={true}
        onDelete={deleteFlyer}
      />

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
                  <Image src={previewUrl} alt="Preview" fill className="object-contain" />
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
