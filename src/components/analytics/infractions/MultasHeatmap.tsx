import React, { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Multa {
  IdOcorrencia: number;
  Ocorrencia: string;
  Placa: string;
  DataInfracao: string;
  DescricaoInfracao?: string;
  CodigoInfracao?: string;
  OrgaoAutuador?: string;
  ValorMulta?: number;
  Pontuacao?: number;
  Latitude?: number;
  Longitude?: number;
  Cidade?: string;
  Estado?: string;
}

interface MultasHeatmapProps {
  multas: Multa[];
  defaultCenter?: [number, number];
  defaultZoom?: number;
  intensity?: number;
}

const MultasHeatmap: React.FC<MultasHeatmapProps> = ({
  multas,
  defaultCenter = [-15.7975, -47.8919], // Brasília
  defaultZoom = 5,
  intensity = 20,
}) => {
  // Filtrar multas com localização válida
  const multasComGPS = useMemo(() => {
    return multas.filter(
      (m) => m.Latitude != null && m.Longitude != null && m.Latitude !== 0 && m.Longitude !== 0
    );
  }, [multas]);

  // Preparar dados para heatmap (formato: [lat, lng, intensity])
  const heatmapPoints = useMemo<[number, number, number][]>(() => {
    return multasComGPS.map((m) => {
      // Normalizar pontuação (0-7 pontos) para intensidade do heatmap (0-1)
      const intensidade = m.Pontuacao ? Math.min(m.Pontuacao / 7, 1) : 0.5;
      return [m.Latitude!, m.Longitude!, intensidade] as [number, number, number];
    });
  }, [multasComGPS]);

  // Calcular centro do mapa baseado nas multas
  const mapCenter = useMemo<[number, number]>(() => {
    if (multasComGPS.length === 0) return defaultCenter;

    const avgLat = multasComGPS.reduce((sum, m) => sum + (m.Latitude || 0), 0) / multasComGPS.length;
    const avgLng = multasComGPS.reduce((sum, m) => sum + (m.Longitude || 0), 0) / multasComGPS.length;

    return [avgLat, avgLng];
  }, [multasComGPS, defaultCenter]);

  // Estatísticas por região
  const estatisticasRegiao = useMemo(() => {
    const porCidade = multasComGPS.reduce((map, m) => {
      const cidade = `${m.Cidade}, ${m.Estado}`;
      if (!map[cidade]) {
        map[cidade] = { count: 0, pontos: 0, valor: 0 };
      }
      map[cidade].count++;
      map[cidade].pontos += m.Pontuacao || 0;
      map[cidade].valor += m.ValorMulta || 0;
      return map;
    }, {} as Record<string, { count: number; pontos: number; valor: number }>);

    return Object.entries(porCidade)
      .map(([cidade, stats]) => ({ cidade, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [multasComGPS]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = multas.length;
    const comGPS = multasComGPS.length;
    const semGPS = total - comGPS;
    const totalPontos = multasComGPS.reduce((sum, m) => sum + (m.Pontuacao || 0), 0);
    const totalValor = multasComGPS.reduce((sum, m) => sum + (m.ValorMulta || 0), 0);

    return { total, comGPS, semGPS, totalPontos, totalValor };
  }, [multas, multasComGPS]);

  if (multasComGPS.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Calor - Infrações
          </CardTitle>
          <CardDescription>Áreas com maior concentração de multas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma infração com localização GPS</p>
            <p className="text-sm">
              {multas.length} infração(ões) total, mas sem coordenadas geográficas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de Calor - Infrações
        </CardTitle>
        <CardDescription>
          {stats.comGPS} infração(ões) mapeada(s) • {stats.totalPontos} pontos CNH •{' '}
          {formatCurrency(stats.totalValor)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-sm bg-muted p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="flex-1">
              Intensidade do calor representa a <strong>pontuação da infração</strong> (mais pontos
              = mais vermelho)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-12 h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded"></div>
              <span className="text-xs">0 → 7 pts</span>
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

              <HeatmapLayer
                points={heatmapPoints}
                longitudeExtractor={(point: any) => point[1]}
                latitudeExtractor={(point: any) => point[0]}
                intensityExtractor={(point: any) => point[2]}
                radius={intensity}
                blur={15}
                maxZoom={18}
                max={1}
                gradient={{
                  0.0: '#00ff00',
                  0.3: '#ffff00',
                  0.5: '#ff9900',
                  0.7: '#ff6600',
                  1.0: '#ff0000',
                }}
              />
            </MapContainer>
          </div>

          {/* Top 5 Regiões com Mais Infrações */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Top 5 Regiões Críticas</h3>
            </div>

            <div className="space-y-2">
              {estatisticasRegiao.map((regiao, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? 'destructive' : 'secondary'}>
                      {index + 1}º
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{regiao.cidade}</p>
                      <p className="text-xs text-muted-foreground">
                        {regiao.count} infração(ões) • {regiao.pontos} pontos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatCurrency(regiao.valor)}</p>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta de Dados Faltantes */}
          {stats.semGPS > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>
                {stats.semGPS} infração(ões) sem localização GPS não são exibidas no mapa
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MultasHeatmap;
