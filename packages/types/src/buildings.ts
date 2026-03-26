export enum BuildingType {
  AVES = "AVES",
  CERDO = "CERDO",
  FRIGORIFICO = "FRIGORIFICO",
}

export const BUILDING_DOCKS: Record<BuildingType, string[]> = {
  [BuildingType.AVES]: ["A1", "A2", "A3", "A4", "A5"],
  [BuildingType.CERDO]: ["C1", "C2", "C3"],
  [BuildingType.FRIGORIFICO]: ["F1", "F2", "F3"],
};
