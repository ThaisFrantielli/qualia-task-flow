import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, X, FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TicketAnexo = {
    id: string;
    nome_arquivo: string;
    url_arquivo: string;
    tipo_arquivo: string;
    tamanho_bytes: number;
    created_at: string;
    uploaded_by?: {
        full_name: string;
    };
};

interface TicketAnexosProps {
    ticketId: string;
    anexos: TicketAnexo[];
    onUploadComplete: () => void;
    onDeleteComplete: () => void;
}

export function TicketAnexos({ ticketId, anexos, onUploadComplete, onDeleteComplete }: TicketAnexosProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${ticketId}/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('ticket-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('ticket-attachments')
                .getPublicUrl(filePath);

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('ticket_anexos')
                .insert({
                    ticket_id: ticketId,
                    nome_arquivo: file.name,
                    url_arquivo: publicUrl,
                    tipo_arquivo: file.type.startsWith('image/') ? 'image' : 'document',
                    tamanho_bytes: file.size,
                    uploaded_by: (await supabase.auth.getUser()).data.user?.id
                });

            if (dbError) throw dbError;

            toast.success("Arquivo enviado com sucesso!");
            onUploadComplete();
        } catch (error: any) {
            console.error("Erro no upload:", error);
            toast.error("Erro ao enviar arquivo", { description: error.message });
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (anexo: TicketAnexo) => {
        if (!confirm("Tem certeza que deseja excluir este anexo?")) return;

        setIsDeleting(anexo.id);
        try {
            // 1. Delete from Database
            const { error: dbError } = await supabase
                .from('ticket_anexos')
                .delete()
                .eq('id', anexo.id);

            if (dbError) throw dbError;

            // 2. Delete from Storage (optional, maybe keep for history?)
            // const path = anexo.url_arquivo.split('/').pop(); // Simplified logic
            // await supabase.storage.from('ticket-attachments').remove([`${ticketId}/${path}`]);

            toast.success("Anexo excluído!");
            onDeleteComplete();
        } catch (error: any) {
            toast.error("Erro ao excluir anexo", { description: error.message });
        } finally {
            setIsDeleting(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Paperclip className="w-5 h-5" />
                        Anexos ({anexos.length})
                    </CardTitle>
                    <div>
                        <Input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <Label
                            htmlFor="file-upload"
                            className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isUploading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Paperclip className="w-4 h-4 mr-2" />
                            )}
                            Adicionar Anexo
                        </Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {anexos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Nenhum anexo vinculado a este ticket</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {anexos.map((anexo) => (
                            <div
                                key={anexo.id}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                                <div className="p-2 bg-muted rounded">
                                    {anexo.tipo_arquivo === 'image' ? (
                                        <ImageIcon className="w-5 h-5 text-blue-500" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-orange-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" title={anexo.nome_arquivo}>
                                        {anexo.nome_arquivo}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{formatSize(anexo.tamanho_bytes)}</span>
                                        <span>•</span>
                                        <span>
                                            {formatDistanceToNow(new Date(anexo.created_at), { locale: ptBR })}
                                        </span>
                                    </div>
                                    {anexo.uploaded_by && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            por {anexo.uploaded_by.full_name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => window.open(anexo.url_arquivo, '_blank')}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(anexo)}
                                        disabled={isDeleting === anexo.id}
                                    >
                                        {isDeleting === anexo.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <X className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
