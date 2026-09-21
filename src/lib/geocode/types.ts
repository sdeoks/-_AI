export interface GeocodeResult {
  lat: number;
  lng: number;
  provider: string;
  confidence: "exact" | "approximate" | "failed";
}

export interface GeocodeAdapter {
  readonly key: string;
  geocode(address: string): Promise<GeocodeResult>;
}
