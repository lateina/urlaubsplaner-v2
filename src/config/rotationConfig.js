export const MONTH_AREA_MAPPING = {
  'station18a': 'Station 18A',
  'station18b': 'Station 18B',
  'station19a': 'Station 19A',
  'station19b': 'Station 19B',
  'station46': 'Station 46',
  'echolabor': 'Echo',
  'kardambulanz': 'Kard Ambulanz',
  'hfambulanz': 'HF Ambulanz',
  'phambulanz': 'PH Ambulanz',
  'pneumambulanz': 'Pneu Ambulanz',
  'studienambulanz': 'Studienambulanz',
  'station93': 'Station 93',
  'cpu': 'CPU',
  'hfu': 'HFU',
  'sm': 'SM',
  'icd': 'ICD Ambulanz',
  'epu': 'EPU',
  'hkl': 'HKL',
  'med1': 'Med I',
  'med3': 'Med III',
  'bronchoskopie': 'Bronchoskopie',
  'ict': 'ICT',
  'mrtct': 'MRT',
  'schlaflabor': 'Schlaflabor',
  'donaustauf': 'Donaustauf',
  'labor': 'Labor',
  'elternzeit': 'Elternzeit'
};

export const MONTH_AREA_ORDER = Object.keys(MONTH_AREA_MAPPING);

export const ROTATION_BIN_ID = '699c40edae596e708f42284d';

export const getAreaColor = (areaId) => {
  if (!areaId || areaId === 'none') return '#e2e8f0';
  let hash = 0;
  for (let i = 0; i < areaId.length; i++) {
    hash = areaId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};
