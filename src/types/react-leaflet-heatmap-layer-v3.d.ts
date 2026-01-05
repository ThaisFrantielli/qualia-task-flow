declare module 'react-leaflet-heatmap-layer-v3' {
  import { ComponentType } from 'react';

  export interface HeatmapLayerProps {
    points: Array<[number, number, number]>; // [lat, lng, intensity]
    longitudeExtractor?: (point: any) => number;
    latitudeExtractor?: (point: any) => number;
    intensityExtractor?: (point: any) => number;
    radius?: number;
    blur?: number;
    max?: number;
    maxZoom?: number;
    minOpacity?: number;
    gradient?: { [key: number]: string };
    fitBoundsOnLoad?: boolean;
    fitBoundsOnUpdate?: boolean;
    onStatsUpdate?: (stats: any) => void;
  }

  export const HeatmapLayer: ComponentType<HeatmapLayerProps>;
}
