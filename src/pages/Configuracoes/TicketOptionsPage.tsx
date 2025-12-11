import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash, Edit, Plus } from "lucide-react";

/**
 * Ticket Options Management Page
 *
 * This page provides a simple CRUD UI to manage ticket motivos and sub-motivos.
 * It expects a Supabase table `ticket_motivos` with the following suggested schema:
 *
 * -- SQL to create the table (run in Supabase SQL editor):
 * --
 * -- CREATE EXTENSION IF NOT EXISTS pgcrypto;
 * -- CREATE TABLE public.ticket_motivos (
 * --   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 * --   value text UNIQUE NOT NULL,
 * --   label text NOT NULL,
 * --   parent_value text NULL,
 * --   sort_order int DEFAULT 0,
 * --   created_at timestamptz DEFAULT now()
 * -- );
 *
 * If you prefer another schema, adapt the queries in this file.
 */

type Motivo = {
  id: string;
  value: string;
  label: string;
  parent_value: string | null;
  sort_order?: number;
};

async function fetchMotivos() {
  const { data, error } = await supabase
    .from("ticket_motivos")
    .select("id, value, label, parent_value, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) throw error;
  return data as Motivo[];
}

export default function TicketOptionsPage() {
  const qc = useQueryClient();
  const { data: motivos, isLoading } = useQuery({ queryKey: ["ticket-motivos"], queryFn: fetchMotivos });
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Motivo | null>(null);

  // form state for add/edit
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [parentValue, setParentValue] = useState<string | null>(null);

  useEffect(() => {
    if (!openAdd) {
      setValue("");
      setLabel("");
      setParentValue(null);
    }
  }, [openAdd]);

  useEffect(() => {
    if (editing) {
      setValue(editing.value);
      setLabel(editing.label);
      setParentValue(editing.parent_value);
    }
  }, [editing]);

  async function handleAdd() {
    try {
      await supabase.from("ticket_motivos").insert({ value, label, parent_value: parentValue });
      qc.invalidateQueries({ queryKey: ["ticket-motivos"] });
      setOpenAdd(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar motivo");
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      await supabase.from("ticket_motivos").update({ value, label, parent_value: parentValue }).eq("id", editing.id);
      qc.invalidateQueries({ queryKey: ["ticket-motivos"] });
      setOpenEdit(false);
      setEditing(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar motivo");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Confirmar exclusão deste motivo?")) return;
    try {
      await supabase.from("ticket_motivos").delete().eq("id", id);
      qc.invalidateQueries({ queryKey: ["ticket-motivos"] });
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar motivo");
    }
  }

  const roots = (motivos || []).filter(m => !m.parent_value);
  const childrenMap: Record<string, Motivo[]> = {};
  (motivos || []).forEach(m => {
    if (m.parent_value) {
      childrenMap[m.parent_value] = childrenMap[m.parent_value] || [];
      childrenMap[m.parent_value].push(m);
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Configuração: Motivos de Ticket</h1>

      <div className="mb-4">
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button variant="default"><Plus className="w-4 h-4 mr-2" />Adicionar Motivo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Motivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Label (exibição)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <Label>Value (identificador)</Label>
                <Input value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div>
                <Label>Parent (opcional)</Label>
                <Select onValueChange={(v) => setParentValue(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum - raiz" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (raiz)</SelectItem>
                    {roots.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAdd}>Adicionar</Button>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(isLoading ? [] : roots).map(root => (
          <div key={root.id} className="p-4 border rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{root.label} <span className="text-xs text-muted-foreground">({root.value})</span></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(root); setOpenEdit(true); }}><Edit className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(root.id)}><Trash className="w-4 h-4 text-red-600" /></Button>
              </div>
            </div>
            <div className="mt-2 ml-4 space-y-2">
              {(childrenMap[root.value] || []).map(child => (
                <div key={child.id} className="flex items-center justify-between">
                  <div className="text-sm">- {child.label} <span className="text-xs text-muted-foreground">({child.value})</span></div>
                  <div className="flex gap-2">
                    <Button size="xs" variant="ghost" onClick={() => { setEditing(child); setOpenEdit(true); }}><Edit className="w-3 h-3" /></Button>
                    <Button size="xs" variant="ghost" onClick={() => handleDelete(child.id)}><Trash className="w-3 h-3 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Motivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div>
              <Label>Parent (opcional)</Label>
              <Select onValueChange={(v) => setParentValue(v || null)}>
                <SelectTrigger><SelectValue placeholder="Nenhum - raiz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (raiz)</SelectItem>
                  {roots.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleUpdate}>Salvar</Button>
              <Button variant="outline" onClick={() => { setOpenEdit(false); setEditing(null); }}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
