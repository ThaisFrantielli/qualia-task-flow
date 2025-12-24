import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PropostaWizard } from '@/components/proposta/PropostaWizard';

export default function PropostasFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  useEffect(() => {
    // scroll to top when opening page
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto py-6">
      <PropostaWizard
        asPage
        open
        propostaId={id ?? undefined}
        onClose={() => navigate('/propostas')}
      />
    </div>
  );
}
