import MapWeather from '../MapWeather'

export default function MapSatellite(props) {
  return (
    <MapWeather
      {...props}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      enableTerrain={false}
      enableBuildings={false}
      initialPitch={0}
      initialBearing={0}
      initialZoom={5}
    />
  )
}
