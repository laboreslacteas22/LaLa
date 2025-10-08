
import { CourierName, Zone } from './types';

export const COURIERS: CourierName[] = [
    CourierName.James,
    CourierName.Beltran,
    CourierName.Ismael,
];

export const ZONES: Zone[] = [
    Zone.AreaMetropolitana,
    Zone.SanAntonio,
    Zone.Oriente,
    Zone.Bogota,
];

export const DELIVERY_COSTS: Record<Zone, number> = {
    [Zone.AreaMetropolitana]: 9000,
    [Zone.SanAntonio]: 13500,
    [Zone.Oriente]: 25000,
    [Zone.Bogota]: 10000,
};

export const ZONE_TO_COURIER_MAP: Record<Zone, CourierName> = {
    [Zone.AreaMetropolitana]: CourierName.James,
    [Zone.SanAntonio]: CourierName.James,
    [Zone.Oriente]: CourierName.Beltran,
    [Zone.Bogota]: CourierName.Ismael,
};