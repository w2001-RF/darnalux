import { supabase } from '../../lib/supabaseClient';

async function count(table: string, apply: (query: ReturnType<typeof base>) => ReturnType<typeof base>): Promise<number | null> {
  const { count: total, error } = await apply(base(table));
  return error ? null : (total ?? 0);
}

function base(table: string) {
  return supabase.from(table).select('id', { count: 'exact', head: true });
}

export interface DashboardCounts {
  properties: number | null;
  activeProperties: number | null;
  openReservations: number | null;
  checkInsToday: number | null;
  checkOutsToday: number | null;
  openTasks: number | null;
  urgentTasks: number | null;
  pendingVerifications: number | null;
  incidents: number | null;
}

// Each count is independent: a module the user cannot read (RLS/permission)
// yields null and is simply hidden by the dashboard.
export async function loadDashboardCounts(today: string, monthStart: string): Promise<DashboardCounts> {
  const blocking = '(CANCELLED,NO_SHOW)';
  const [properties, activeProperties, openReservations, checkInsToday, checkOutsToday, openTasks, urgentTasks, pendingVerifications, incidents] =
    await Promise.all([
      count('properties', (q) => q),
      count('properties', (q) => q.eq('status', 'ACTIVE')),
      count('reservations', (q) => q.not('status', 'in', '(CANCELLED,NO_SHOW,COMPLETED)').gte('check_out', today)),
      count('reservations', (q) => q.eq('check_in', today).not('status', 'in', blocking)),
      count('reservations', (q) => q.eq('check_out', today).not('status', 'in', blocking)),
      count('tasks', (q) => q.not('status', 'in', '(COMPLETED,CANCELLED)')),
      count('tasks', (q) => q.eq('priority', 'URGENT').not('status', 'in', '(COMPLETED,CANCELLED)')),
      count('checkins', (q) => q.eq('status', 'SUBMITTED')),
      count('checkouts', (q) => q.eq('incident_reported', true).gte('completed_at', monthStart)),
    ]);
  return { properties, activeProperties, openReservations, checkInsToday, checkOutsToday, openTasks, urgentTasks, pendingVerifications, incidents };
}
