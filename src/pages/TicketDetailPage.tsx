import { TicketDetail } from "@/components/tickets/TicketDetail";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TicketDetailPage() {
    const { ticketId } = useParams();
    const navigate = useNavigate();

    if (!ticketId) return null;

    return (
        <div className="p-4 md:p-6 max-w-full h-[calc(100vh-4rem)] flex flex-col">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => navigate("/tickets")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Tickets
                </Button>
            </div>
            <div className="flex-1 overflow-hidden">
                <TicketDetail ticketId={ticketId} />
            </div>
        </div>
    );
}
