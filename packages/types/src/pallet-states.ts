export type PalletState = 'EN_ARMADO' | 'ARMADO' | 'CARGADO' | 'VERIFICADO';

export type SemanticColorPallet = 'warning' | 'info' | 'active' | 'success';

export const PALLET_STATE_COLOR: Record<PalletState, SemanticColorPallet> = {
  EN_ARMADO:  'warning',
  ARMADO:     'info',
  CARGADO:    'active',
  VERIFICADO: 'success',
};
