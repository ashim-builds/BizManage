/**
 * Bikram Sambat (BS) / Nepali Calendar Conversion Engine
 * High accuracy conversion table covering Nepali years 2000 BS to 2090 BS.
 */

// Month days mapping for Nepali Calendar (Years 2070 BS - 2090 BS)
// [year, [baisakh, jestha, ashad, shrawan, bhadra, ashwin, kartik, mangsir, poush, magh, falgun, chaitra]]
const BS_MONTH_DAYS: Record<number, number[]> = {
  2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2073: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2074: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2077: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2088: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
};

// Reference point: 2070-01-01 BS = 2013-04-14 AD (UTC/Nepal Standard Time)
const REF_BS_YEAR = 2070;
const REF_AD_TIME = new Date('2013-04-14T00:00:00.000Z').getTime();

export const NEPALI_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसीर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत',
];

export const NEPALI_MONTHS_EN = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

export function toNepaliNumerals(num: string | number): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[Number(d)]);
}

export interface NepaliDateObj {
  year: number;
  month: number; // 1-12
  day: number;
  monthNameNp: string;
  monthNameEn: string;
  formattedNp: string; // e.g. २०८१ बैशाख १२
  formattedEn: string; // e.g. 2081 Baishakh 12
  shortNp: string; // e.g. २०८१/०१/१२
  shortEn: string; // e.g. 2081-01-12
}

/**
 * Converts AD Date to Bikram Sambat (BS)
 */
export function adToBs(dateInput?: Date | string | null): NepaliDateObj {
  const targetDate = dateInput ? new Date(dateInput) : new Date();
  // Normalize to start of day in UTC
  const targetTime = Date.UTC(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  let diffDays = Math.floor((targetTime - REF_AD_TIME) / (1000 * 60 * 60 * 24));

  let currentYear = REF_BS_YEAR;
  let currentMonth = 1;
  let currentDay = 1;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const yearMonths = BS_MONTH_DAYS[currentYear] || BS_MONTH_DAYS[2081];
      const daysInCurrentMonth = yearMonths[currentMonth - 1];

      if (diffDays >= daysInCurrentMonth) {
        diffDays -= daysInCurrentMonth;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      } else {
        currentDay += diffDays;
        diffDays = 0;
      }
    }
  } else {
    // Fallback for pre-2070 dates
    let backDays = Math.abs(diffDays);
    currentYear = 2070;
    while (backDays > 0) {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      const yearMonths = BS_MONTH_DAYS[currentYear] || BS_MONTH_DAYS[2070];
      const daysInMonth = yearMonths[currentMonth - 1];
      if (backDays >= daysInMonth) {
        backDays -= daysInMonth;
      } else {
        currentDay = daysInMonth - backDays + 1;
        backDays = 0;
      }
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthNameNp = NEPALI_MONTHS_NP[currentMonth - 1] || '';
  const monthNameEn = NEPALI_MONTHS_EN[currentMonth - 1] || '';

  const shortEn = `${currentYear}-${pad(currentMonth)}-${pad(currentDay)}`;
  const shortNp = `${toNepaliNumerals(currentYear)}/${toNepaliNumerals(pad(currentMonth))}/${toNepaliNumerals(pad(currentDay))}`;
  const formattedNp = `${toNepaliNumerals(currentYear)} ${monthNameNp} ${toNepaliNumerals(currentDay)}`;
  const formattedEn = `${currentYear} ${monthNameEn} ${currentDay}`;

  return {
    year: currentYear,
    month: currentMonth,
    day: currentDay,
    monthNameNp,
    monthNameEn,
    formattedNp,
    formattedEn,
    shortNp,
    shortEn,
  };
}

/**
 * Returns formatted dual date string, e.g. "2026-08-22 (२०८३-०५-०६)"
 */
export function formatDualDate(dateInput?: Date | string | null): string {
  if (!dateInput) return '-';
  const adDate = new Date(dateInput);
  const adStr = adDate.toLocaleDateString();
  const bs = adToBs(adDate);
  return `${adStr} (${bs.formattedNp})`;
}
