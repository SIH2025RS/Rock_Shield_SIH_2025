import MapWeather from '../MapWeather'

export default function MapStreets(props) {
  return (
    <MapWeather
      {...props}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      enableTerrain={false}
      enableBuildings={false}
      initialPitch={0}
      initialBearing={0}
      initialZoom={5}
    />
  )
}
