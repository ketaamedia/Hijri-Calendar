declare module 'moment-hijri' {
  import moment from 'moment';
  
  interface Moment {
    iYear(): number;
    iMonth(): number;
    iDate(): number;
    iDay(): number;
    iDayOfYear(): number;
    iWeek(): number;
    iWeekYear(): number;
    iDaysInMonth(): number;
    iYear(y: number): moment.Moment;
    iMonth(M: number): moment.Moment;
    iDate(d: number): moment.Moment;
    startOf(unit: 'iYear' | 'iMonth' | 'iWeek' | string): moment.Moment;
    endOf(unit: 'iYear' | 'iMonth' | 'iWeek' | string): moment.Moment;
    add(amount: number, unit: 'iYear' | 'iMonth' | string): moment.Moment;
    subtract(amount: number, unit: 'iYear' | 'iMonth' | string): moment.Moment;
  }

  export = moment;
}
