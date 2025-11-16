import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const TeamPerformanceNew: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Componente placeholder — métricas da equipe serão implementadas aqui.</p>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceNew;
