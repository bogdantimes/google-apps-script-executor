interface Task {
  isValid(): boolean

  getTaskName(): string

  getScheduledTimestamp(): number

  execute(args): any
}

abstract class DefaultTask {
  public readonly taskRaw: string
  public readonly func: (args) => any

  protected constructor(taskRaw: string, func: (args) => any) {
    this.taskRaw = taskRaw;
    this.func = func;
  }

  execute(args): any {
    debugMessage(`Running ${this.getTaskName()}`);
    try {
      this.func(args);
    } catch (e) {
      debugMessage(`${this.getTaskName()} FAILED: ${e.message}`);
      console.error(e);
    }
  }

  isValid(): boolean {
    return (typeof this.func == 'function')
  }

  abstract getTaskName(): string
}

const DayChecks = {
  everyday: () => true,
  weekDay: () => !isWeekEnd(new Date()),
  lastWeekDayOfMonth: () => isLastWeekDayOfMonth(new Date()),
};

function ClockTriggerBuilder(name, buildFunction) {
  return {
    create() {
      try {
        return execute({
          context: null,
          attempts: 30,
          runnable(context) {
            const triggerSetup = ScriptApp.newTrigger(name).timeBased();
            buildFunction(triggerSetup);
            return triggerSetup.create();
          },
        });
      } catch (e) {
        debugMessage('Failed to create trigger "' + name + '. ' + e.message);
      }
    },
  };
}

function debugMessage(text) {
  console.log(`DEBUG_MSG: ${text}`)
}

interface ExecParams {
  context: any;
  runnable: (any) => any;
  interval?: number;
  attempts?: number;
}

function execute({context, runnable, interval = 2000, attempts = 5}: ExecParams) {
  let errorMessage = '';
  do {
    try {
      return runnable(context);
    } catch (e) {
      errorMessage = e.message;
      if (errorMessage.includes('INTERRUPT')) {
        break;
      }
    }
    if (attempts > 0) {
      Utilities.sleep(interval)
    }
  } while (--attempts > 0);

  debugMessage('All attempts failed. Error message: ' + errorMessage);
  throw Error(errorMessage);
}

function isWeekEnd(date) {
  return isSaturday(date) || isSunday(date);
}

function isSaturday(date) {
  const day = (date || new Date()).getDay();
  return day === 6;
}

function isSunday(date) {
  const day = (date || new Date()).getDay();
  return day === 0;
}

function isLastWeekDayOfMonth(date) {
  if (!isWeekEnd(date)) {
    const todayDate = date.getDate();
    date.setDate(date.getDate() + 1);
    while (isWeekEnd(date)) {
      date.setDate(date.getDate() + 1);
    }
    return +date.getDate() < +todayDate; // next working day in next month
  } else {
    return false;
  }
}
