class HourlyTask extends DefaultTask implements Task {
  public hoursInterval: number
  public startHour: number
  public stopHour: number
  public canExecuteToday: () => boolean

  constructor(
    taskRaw: string,
    func: (args) => any,
    hoursInterval: number,
    startHour: number,
    stopHour: number,
    dayChecker: () => boolean
  ) {
    super(taskRaw, func)
    this.hoursInterval = hoursInterval;
    this.startHour = startHour;
    this.stopHour = stopHour;
    this.canExecuteToday = dayChecker;
  }

  /**
   * @param context
   * @param taskRaw
   * @example hourlyTask Bot_AskStatuses 4 16 19 everyday
   */
  static parse(context: object, taskRaw: string): Task {
    const regExp = new RegExp(`^(\\w+) (\\w+) (\\d{1,2}) (\\d{1,2}) (\\d{1,2}) (${Object.keys(DayChecks).join("|")})$`);
    const match = taskRaw.trim().match(regExp)
    if (match) {
      const [all, type, funcName, hoursInterval, startHour, stopHour, dayCheck] = match
      return new HourlyTask(taskRaw, context[funcName], +hoursInterval, +startHour, +stopHour, DayChecks[dayCheck])
    }
    return new InvalidTask(taskRaw)
  }

  isValid(): boolean {
    return super.isValid() &&
      (typeof this.hoursInterval == 'number') &&
      (typeof this.startHour == 'number') &&
      (typeof this.stopHour == 'number') &&
      (typeof this.canExecuteToday == 'function') &&
      (this.startHour >= 0 && this.startHour <= 23) &&
      (this.stopHour >= 0 && this.stopHour <= 23) &&
      (this.stopHour >= this.startHour) &&
      (this.hoursInterval >= 0)
  }

  getTaskName(): string {
    return `(Every ${this.hoursInterval}h from ${this.startHour} till ${this.stopHour}) "${this.func.name}"`
  }

  getScheduledTimestamp(): number {
    if (!this.canExecuteToday()) {
      return 0
    }
    const date = new Date();
    const currentHour = date.getHours();
    const hours = currentHour + (this.startHour - currentHour) % this.hoursInterval;
    if (hours < this.startHour) {
      date.setHours(this.startHour);
    } else if (hours > this.stopHour) {
      date.setHours(this.startHour);
      date.setDate(date.getDate() + 1);
    } else {
      date.setHours(hours);
    }
    date.setMinutes(0);
    date.setSeconds(0);
    return +date;
  }
}

