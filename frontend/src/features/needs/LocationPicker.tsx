import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

/** Keep the view on the marker when coordinates are typed in. */
function Follow({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

/** Small map: click to set the need's location. */
export function LocationPicker({ lat, lng, onPick, readOnly }: {
  lat: number; lng: number; onPick?: (lat: number, lng: number) => void; readOnly?: boolean;
}) {
  const valid = Number.isFinite(lat) && Number.isFinite(lng);
  const center: [number, number] = valid ? [lat, lng] : [-25.7479, 28.2293];
  return (
    <div className="relative z-0 h-56 overflow-hidden rounded-xl border border-slate-200 sm:h-64">
      <MapContainer center={center} zoom={11} scrollWheelZoom={false} className="h-full w-full" attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid && <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: '#0f766e', fillColor: '#26968a', fillOpacity: 0.55, weight: 2 }} />}
        {!readOnly && onPick && <ClickHandler onPick={onPick} />}
        <Follow lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
