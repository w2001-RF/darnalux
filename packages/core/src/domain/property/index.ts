import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, isPercent, toResult } from '../common/validation';

export type PropertyType = 'APARTMENT' | 'VILLA' | 'RIAD' | 'STUDIO' | 'HOUSE' | 'ROOM' | 'OTHER';
export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ARCHIVED';
export type BookingChannel = 'AIRBNB' | 'BOOKING' | 'DIRECT' | 'WEBSITE' | 'PHONE' | 'WHATSAPP' | 'OTHER';

export const PROPERTY_TYPES: readonly PropertyType[] = ['APARTMENT', 'VILLA', 'RIAD', 'STUDIO', 'HOUSE', 'ROOM', 'OTHER'];
export const PROPERTY_STATUSES: readonly PropertyStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED'];
export const BOOKING_CHANNELS: readonly BookingChannel[] = ['AIRBNB', 'BOOKING', 'DIRECT', 'WEBSITE', 'PHONE', 'WHATSAPP', 'OTHER'];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
  RIAD: 'Riad',
  STUDIO: 'Studio',
  HOUSE: 'Maison',
  ROOM: 'Chambre',
  OTHER: 'Autre',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  MAINTENANCE: 'Maintenance',
  ARCHIVED: 'Archivé',
};

export const PROPERTY_STATUS_TONES: Record<PropertyStatus, Tone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  MAINTENANCE: 'warning',
  ARCHIVED: 'neutral',
};

export const BOOKING_CHANNEL_LABELS: Record<BookingChannel, string> = {
  AIRBNB: 'Airbnb',
  BOOKING: 'Booking.com',
  DIRECT: 'Direct',
  WEBSITE: 'Site web',
  PHONE: 'Téléphone',
  WHATSAPP: 'WhatsApp',
  OTHER: 'Autre',
};

export const COMMON_AMENITIES: readonly string[] = [
  'Wi-Fi',
  'Climatisation',
  'Chauffage',
  'Cuisine équipée',
  'Lave-linge',
  'Parking',
  'Piscine',
  'Terrasse',
  'Ascenseur',
  'Télévision',
  'Espace de travail',
  'Linge de maison',
];

export interface PropertyInput {
  name: string;
  type: PropertyType;
  description: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string;
  status: PropertyStatus;
  commissionRate: number;
}

export type PropertyField = keyof PropertyInput;

export const DEFAULT_COMMISSION_RATE = 20;

export function emptyPropertyInput(): PropertyInput {
  return {
    name: '',
    type: 'APARTMENT',
    description: '',
    address: '',
    city: '',
    latitude: null,
    longitude: null,
    capacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: [],
    houseRules: '',
    status: 'ACTIVE',
    commissionRate: DEFAULT_COMMISSION_RATE,
  };
}

function isCount(value: number, min: number): boolean {
  return Number.isInteger(value) && value >= min && value <= 999;
}

export function validatePropertyInput(input: PropertyInput): ValidationResult<PropertyField> {
  const errors: Partial<Record<PropertyField, string>> = {};
  if (isBlank(input.name)) errors.name = 'Le nom du bien est obligatoire.';
  if (isBlank(input.city)) errors.city = 'La ville est obligatoire.';
  if (!PROPERTY_TYPES.includes(input.type)) errors.type = 'Type de bien invalide.';
  if (!PROPERTY_STATUSES.includes(input.status)) errors.status = 'Statut invalide.';
  if (!isCount(input.capacity, 1)) errors.capacity = 'La capacité doit être un entier ≥ 1.';
  if (!isCount(input.bedrooms, 0)) errors.bedrooms = 'Valeur invalide.';
  if (!isCount(input.beds, 0)) errors.beds = 'Valeur invalide.';
  if (!isCount(input.bathrooms, 0)) errors.bathrooms = 'Valeur invalide.';
  if (input.latitude !== null && !(Number.isFinite(input.latitude) && Math.abs(input.latitude) <= 90)) {
    errors.latitude = 'Latitude invalide (entre -90 et 90).';
  }
  if (input.longitude !== null && !(Number.isFinite(input.longitude) && Math.abs(input.longitude) <= 180)) {
    errors.longitude = 'Longitude invalide (entre -180 et 180).';
  }
  if ((input.latitude === null) !== (input.longitude === null)) {
    errors.longitude = errors.longitude ?? 'Renseignez latitude et longitude ensemble.';
  }
  if (!isPercent(input.commissionRate)) errors.commissionRate = 'La commission doit être entre 0 et 100 %.';
  return toResult(errors);
}
