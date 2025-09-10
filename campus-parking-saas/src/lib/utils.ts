import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1000 // Convert to meters
}

export function getOccupancyStatus(current: number, capacity: number) {
  const percentage = (current / capacity) * 100
  
  if (percentage >= 90) {
    return { status: 'full', color: 'text-red-600', bgColor: 'bg-red-100' }
  } else if (percentage >= 70) {
    return { status: 'busy', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
  } else {
    return { status: 'available', color: 'text-green-600', bgColor: 'bg-green-100' }
  }
}

export function getParkingRecommendation(
  lots: Array<{
    id: string
    name: string
    capacity: number
    current_occupancy: number
    location: { lat: number; lng: number }
    permit_restrictions: string[]
    amenities: string[]
  }>,
  userLocation: { lat: number; lng: number },
  userPermit: string,
  preferences: any = {}
) {
  const filteredLots = lots.filter(lot => 
    lot.permit_restrictions.includes(userPermit) || lot.permit_restrictions.length === 0
  )

  return filteredLots
    .map(lot => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        lot.location.lat,
        lot.location.lng
      )
      
      const occupancyRate = lot.current_occupancy / lot.capacity
      const availableSpots = lot.capacity - lot.current_occupancy
      
      // Calculate score based on distance, availability, and preferences
      let score = 0
      
      // Distance factor (closer is better)
      score += Math.max(0, 1000 - distance) / 10
      
      // Availability factor
      score += availableSpots * 2
      
      // Occupancy rate factor (less crowded is better)
      score += (1 - occupancyRate) * 50
      
      // Preference bonuses
      if (preferences?.preferCovered && lot.amenities.includes('covered')) {
        score += 20
      }
      if (preferences?.needEvCharging && lot.amenities.includes('ev_charging')) {
        score += 30
      }
      if (preferences?.needHandicapAccess && lot.amenities.includes('handicap_accessible')) {
        score += 25
      }
      
      return {
        ...lot,
        distance,
        availableSpots,
        occupancyRate,
        score,
        recommendation: score > 100 ? 'highly_recommended' : 
                      score > 50 ? 'recommended' : 'available'
      }
    })
    .sort((a, b) => b.score - a.score)
}