class DailyTask extends DefaultTask implements Task {
  public hour: number
  public minute: number
  public canExecuteToday: () => boolean

  constructor(
    taskRaw: string,
    func: (args) => any,
    hour: number,
    minute: number,
    dayChecker: () => boolean
  ) {
    super(taskRaw, func)
    this.hour = hour;
    this.minute = minute;
    this.canExecuteToday = dayChecker;
  }

  /**
   * @param context
   * @param taskRaw
   * @example dailyTask Bot_AskStatuses 16 30 workDay
   */
  static parse(context: object, taskRaw: string): Task {
    const regExp = new RegExp(`^(\\w+) (\\w+) (\\d{1,2}) (\\d{1,2}) (${Object.keys(Context.dayChecks).join("|")})$`);
    const match = taskRaw.trim().match(regExp)
    if (match) {
      const [all, type, funcName, hour, minute, dayCheck] = match
      return new DailyTask(taskRaw, context[funcName], +hour, +minute, Context.dayChecks[dayCheck])
    }
    return new InvalidTask(taskRaw)
  }

  isValid(): boolean {
    return super.isValid() &&
      (typeof this.hour == 'number') &&
      (typeof this.minute == 'number') &&
      (typeof this.canExecuteToday == 'function') &&
      (this.hour >= 0 && this.hour <= 23) &&
      (this.minute >= 0 && this.minute <= 59)
  }

  getTaskName(): string {
    return `(${this.hour}:${this.minute}) "${this.func.name}"`
  }

  getScheduledTimestamp(): number {
    if (!this.canExecuteToday()) {
      return 0
    }
    const date = new Date();
    date.setHours(this.hour);
    date.setMinutes(this.minute);
    date.setSeconds(0);
    return +date;
  }
}


