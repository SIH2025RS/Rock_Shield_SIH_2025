import MapWeather from '../MapWeather'

export default function Map3D(props) {
  return (
    <MapWeather
      {...props}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      enableTerrain={true}
      enableBuildings={true}
      initialPitch={60}
      initialBearing={-17.6}
      initialZoom={4}
    />
  )
}
