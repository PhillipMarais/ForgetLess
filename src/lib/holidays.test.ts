import { ForgetlessDevice } from './device';
import { easterSunday, holidayRegionChoices, holidaysBetween, isHolidayRegion } from './holidays';

jest.mock('./device', () => ({ ForgetlessDevice: { phoneHolidays: jest.fn(() => []) } }));

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();
const year = (y: number) => holidaysBetween('ZA', day(y, 1, 1), day(y + 1, 1, 1));

describe('easterSunday', () => {
  it('matches known dates', () => {
    expect(easterSunday(2024)).toBe(day(2024, 3, 31));
    expect(easterSunday(2025)).toBe(day(2025, 4, 20));
    expect(easterSunday(2026)).toBe(day(2026, 4, 5));
    expect(easterSunday(2027)).toBe(day(2027, 3, 28));
  });
});

describe('South African public holidays', () => {
  it('has the twelve holidays (plus Mondays for Sunday ones), with Easter around Good Friday', () => {
    const holidays = year(2026);
    expect(holidays.get(day(2026, 4, 3))).toBe('Good Friday');
    expect(holidays.get(day(2026, 4, 6))).toBe('Family Day');
    expect(holidays.get(day(2026, 9, 24))).toBe('Heritage Day');
    expect(holidays.get(day(2026, 12, 16))).toBe('Day of Reconciliation');
    // Twelve, plus Monday 10 August for Women's Day on a Sunday.
    expect(holidays.size).toBe(13);
  });

  it('moves a Sunday holiday to the Monday', () => {
    // 9 August 2026 is a Sunday.
    expect(year(2026).get(day(2026, 8, 10))).toBe('National Women’s Day (observed)');
  });

  it('moves Christmas on a Sunday past the Day of Goodwill', () => {
    // 25 December 2022 was a Sunday; Tuesday the 27th was the holiday.
    const holidays = year(2022);
    expect(holidays.get(day(2022, 12, 26))).toBe('Day of Goodwill');
    expect(holidays.get(day(2022, 12, 27))).toBe('Christmas Day (observed)');
  });

  it('shows nothing when switched off', () => {
    expect(holidaysBetween('none', day(2026, 1, 1), day(2027, 1, 1)).size).toBe(0);
  });
});

describe('other countries', () => {
  it('knows other countries’ public holidays, on their own dates', () => {
    const holidays = holidaysBetween('NL', day(2026, 1, 1), day(2027, 1, 1));
    expect(holidays.get(day(2026, 4, 27))).toBe("King's Day");
    expect(holidays.get(day(2026, 12, 25))).toBe('Christmas Day');
    // Only public holidays, not observances like Mother's Day.
    expect([...holidays.values()]).not.toContain("Mother's Day");
  });

  it('offers Automatic, None and the countries by name', () => {
    const choices = holidayRegionChoices();
    expect(choices.slice(0, 2).map((choice) => choice.value)).toEqual(['auto', 'none']);
    expect(choices.some((choice) => choice.value === 'ZA' && choice.title === 'South Africa')).toBe(true);
    expect(choices.length).toBeGreaterThan(150);
  });

  it('accepts only known regions as a setting', () => {
    expect(isHolidayRegion('auto')).toBe(true);
    expect(isHolidayRegion('US')).toBe(true);
    expect(isHolidayRegion('XX')).toBe(false);
    expect(isHolidayRegion(3)).toBe(false);
  });
});

describe('the phone’s holiday calendar', () => {
  const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

  it('adds public holidays the built-in list lacks, but not observances or duplicates', () => {
    jest.mocked(ForgetlessDevice!.phoneHolidays).mockReturnValue([
      { title: 'Local Government Elections', begin: utc(2026, 11, 4), allDay: true, description: 'Public holiday' },
      { title: 'Mother’s Day', begin: utc(2026, 11, 8), allDay: true, description: 'Observance. To hide observances…' },
      { title: 'Christmas', begin: utc(2026, 12, 25), allDay: true, description: 'Public holiday' },
    ]);
    const holidays = holidaysBetween('ZA', day(2026, 11, 1), day(2027, 1, 1), true);
    expect(holidays.get(day(2026, 11, 4))).toBe('Local Government Elections');
    expect(holidays.has(day(2026, 11, 8))).toBe(false);
    expect(holidays.get(day(2026, 12, 25))).toBe('Christmas Day');
  });

  it('is left out when turned off or holidays are off', () => {
    expect(holidaysBetween('ZA', day(2026, 10, 1), day(2026, 11, 1), false).size).toBe(0);
    expect(holidaysBetween('none', day(2026, 10, 1), day(2026, 11, 1), true).size).toBe(0);
  });
});
