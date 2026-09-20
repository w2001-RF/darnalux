export * from './domain/auth';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECK_IN' | 'IN_PROGRESS' | 'CHECK_OUT' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type TaskStatus = 'TODO' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type BookingChannel = 'AIRBNB' | 'BOOKING' | 'DIRECT' | 'WEBSITE' | 'PHONE' | 'WHATSAPP' | 'OTHER';

export interface Property { id: string; name: string; city: string; status: 'ACTIVE'|'INACTIVE'|'MAINTENANCE'|'ARCHIVED'; capacity: number; }
export interface Reservation { id: string; propertyId: string; guestName: string; checkIn: string; checkOut: string; status: ReservationStatus; channel: BookingChannel; totalAmount: number; }
export interface Task { id: string; propertyId: string; title: string; status: TaskStatus; priority: TaskPriority; dueAt?: string; }

export const formatMad = (value: number) => new Intl.NumberFormat('fr-MA',{style:'currency',currency:'MAD',maximumFractionDigits:0}).format(value);
export const nightsBetween = (checkIn: string, checkOut: string) => Math.max(0, Math.ceil((new Date(checkOut).getTime()-new Date(checkIn).getTime())/86400000));
export const isActiveReservation = (status: ReservationStatus) => !['CANCELLED','NO_SHOW','COMPLETED'].includes(status);
