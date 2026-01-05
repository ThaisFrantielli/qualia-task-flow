import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, DollarSign, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para ícones do Leaflet no React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Sinistro {
  IdOcorrencia: number;
  Ocorrencia: string;
  Placa: string;
  Modelo?: string;
  DataSinistro: string;
  Descricao?: string;
  TipoSinistro?: string;
  Status?: string;
  ValorTotal?: number;
  ValorOrcado?: number;
  IndenizacaoSeguradora?: number;
  BoletimOcorrencia?: string;
  Condutor?: string;
  Cliente?: string;
  MotoristaCulpado?: string;
  ResponsavelCulpado?: string;
  Latitude?: number;
  Longitude?: number;
  Cidade?: string;
  Estado?: string;
}

interface SinistrosMapViewProps {
  sinistros: Sinistro[];
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getMarkerColor = (sinistro: Sinistro): string => {
  if (sinistro.MotoristaCulpado === 'Sim' || sinistro.MotoristaCulpado === '1') return '#ef4444'; // Vermelho
  if (sinistro.ResponsavelCulpado === 'Sim' || sinistro.ResponsavelCulpado === '1') return '#f59e0b'; // Laranja
  return '#10b981'; // Verde (terceiros)
};

const SinistrosMapView: React.FC<SinistrosMapViewProps> = ({
  sinistros,
  defaultCenter = [-15.7975, -47.8919], // Brasília como centro padrão
  defaultZoom = 5,
}) => {
  // Filtrar sinistros com localização válida
  const sinistrosComGPS = useMemo(() => {
    return sinistros.filter(
      (s) => s.Latitude != null && s.Longitude != null && s.Latitude !== 0 && s.Longitude !== 0
    );
  }, [sinistros]);

  // Calcular centro do mapa baseado nos sinistros
  const mapCenter = useMemo<[number, number]>(() => {
    if (sinistrosComGPS.length === 0) return defaultCenter;

    const avgLat = sinistrosComGPS.reduce((sum, s) => sum + (s.Latitude || 0), 0) / sinistrosComGPS.length;
    const avgLng = sinistrosComGPS.reduce((sum, s) => sum + (s.Longitude || 0), 0) / sinistrosComGPS.length;

    return [avgLat, avgLng];
  }, [sinistrosComGPS, defaultCenter]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const total = sinistros.length;
    const comGPS = sinistrosComGPS.length;
    const semGPS = total - comGPS;
    const valorTotal = sinistrosComGPS.reduce((sum, s) => sum + (s.ValorTotal || 0), 0);
    const comBO = sinistrosComGPS.filter((s) => s.BoletimOcorrencia).length;

    return { total, comGPS, semGPS, valorTotal, comBO };
  }, [sinistros, sinistrosComGPS]);

  if (sinistrosComGPS.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Sinistros
          </CardTitle>
          <CardDescription>Visualização geográfica de sinistros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum sinistro com localização GPS</p>
            <p className="text-sm">
              {sinistros.length} sinistro(s) total, mas sem coordenadas geográficas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de Sinistros
        </CardTitle>
        <CardDescription>
          {stats.comGPS} sinistro(s) mapeado(s) • {formatCurrency(stats.valorTotal)} em custos •{' '}
          {stats.comBO} com B.O.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Motorista Culpado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Empresa Responsável</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Terceiros</span>
            </div>
          </div>

          {/* Mapa */}
          <div className="h-[600px] w-full rounded-lg overflow-hidden border">
            <MapContainer
              center={mapCenter}
              zoom={defaultZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {sinistrosComGPS.map((sinistro) => (
                <CircleMarker
                  key={sinistro.IdOcorrencia}
                  center={[sinistro.Latitude!, sinistro.Longitude!]}
                  radius={8}
                  pathOptions={{
                    fillColor: getMarkerColor(sinistro),
                    fillOpacity: 0.7,
                    color: '#fff',
                    weight: 2,
                  }}
                >
                  <Popup maxWidth={300}>
                    <div className="space-y-2 p-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-lg">{sinistro.Placa}</p>
                          <p className="text-sm text-muted-foreground">{sinistro.Modelo}</p>
                        </div>
                        <Badge variant={sinistro.Status === 'Concluída' ? 'default' : 'secondary'}>
                          {sinistro.Status || 'N/A'}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">{sinistro.TipoSinistro || 'Sinistro'}</span>
                        </div>

                        {sinistro.Descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {sinistro.Descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {sinistro.Cidade}, {sinistro.Estado}
                          </span>
                        </div>

                        {sinistro.Condutor && (
                          <div className="flex items-center gap-2 text-xs">
                            <User className="h-3 w-3" />
                            <span>{sinistro.Condutor}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <span className="font-bold">{formatCurrency(sinistro.ValorTotal)}</span>
                        </div>

                        {sinistro.IndenizacaoSeguradora && sinistro.IndenizacaoSeguradora > 0 && (
                          <div className="text-xs text-green-600">
                            Indenização: {formatCurrency(sinistro.IndenizacaoSeguradora)}
                          </div>
                        )}

                        {sinistro.BoletimOcorrencia && (
                          <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            B.O.: {sinistro.BoletimOcorrencia}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Estatísticas Adicionais */}
          {stats.semGPS > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {stats.semGPS} sinistro(s) sem localização GPS não são exibidos no mapa
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SinistrosMapView;
