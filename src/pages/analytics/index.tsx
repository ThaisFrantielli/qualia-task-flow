import React from 'react';
import { Link } from 'react-router-dom';
import { Title, Card, Text } from '@tremor/react';

export default function AnalyticsIndex() {
  return (
    <div style={{ padding: 16 }}>
      <Title>Analytics</Title>
      <Card style={{ marginTop: 12 }}>
        <Text>Escolha um dashboard:</Text>
        <ul className="mt-3 space-y-2">
          <li>
            <Link to="/analytics/frota" className="text-blue-500">Frota</Link>
          </li>
          <li>
            <Link to="/analytics/financeiro" className="text-blue-500">Financeiro (em breve)</Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
