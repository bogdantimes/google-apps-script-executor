# AppScriptExecutor

Google Apps Script library that rethinks the approach to time-based triggers. It allows to have tasks stored externally and executed at any moment you need with down to a minute precision (instead of a standart 15 minutes precision).

Advanced features give the ability to define your own types of tasks which go far beyond what is possible with the standard Google Apps Script triggers. 

# Install

You can add it as a library to your Google Apps Script project (see
how: https://developers.google.com/apps-script/guides/libraries). Library's script
ID: `10BrdB7JWoAmYi4V9b9TuFHz6HimvFGAXNrHEBglEomfej_QZjHr9xi6H`.

The other option is to copy the source code to your project and use directly.

# Usage

The examples below are for the case when the library is imported via Apps Script Libraries.

```ts
// The functions that have to be executed at particular moments:

function RemindToDoAnExcercise() {
  console.log("my function that reminds to do an exercise triggered!");
}

function SaveAllWork() {
  console.log("my function that saves all work is triggered!");
}

function CreateMonthlyReport() {
  console.log("my function that creates a montly report is triggered!");
}

// Declaring the runtime context which holds the above functions.
const _runtimeCtx = this;

// @ts-ignore
AppScriptExecutor.SetContext({
  runtimeCtx: _runtimeCtx,
})

// @ts-ignore
const Executor = AppScriptExecutor.New({
  tasksGetter: {
    get() {
      // Tasks can be fetched from an external resource of your choice, for example Firebase database.
      // Using statically defined tasks as an example.
      const tasks = [
        "hourlyTask RemindToDoAnExcercise 2 8 18 everyday", // Executes `RemindToDoAnExcercise` function every 2 hours from 8 till 18
        "dailyTask SaveAllWork 19 0 weekDay", // Executes `SaveAllWork` function at 19:00 every week day
        "dailyTask CreateMonthlyReport 18 30 lastWeekDayOfMonth", // Executes `CreateMonthlyReport` function at 18:30 every last week day of month
      ];

      return tasks.map(AppScriptExecutor.TaskFromString);
    }
  }
})

// Start the executor.
// Executor is running in the background (`ExecutorInstance` and `HealthCheck` triggers are created).
// This should be done only once.
function Start() {
  Executor.restart();
  console.log(Executor.getTasks().map(t => t.getTaskName()));
}

// Stop the executor.
// Should be done only once if the executor needs to be entirely stopped.
function Stop() {
  Executor.stop();
}

```

## Advanced usage

```ts
function SendPayment() {
  console.log("my function that sends a payment triggered!");
}

// Tasks can be instantiated manually as well.

// Example using existing class.
// @ts-ignore
tasks.push(new AppScriptExecutor.DailyTask(
  "", // Task string, provided when parsed from string.
  SendPayment, // Function to execute
  13, // Hour
  25, // Minute
  () => new Date().getDate() % 2 == 0 // Allow to execute only on even calendar dates
))

// Example using completely new implementation on the Task interface.
// interface Task {
//   isValid(): boolean
//   getTaskName(): string
//   getScheduledTimestamp(): number
//   execute(args): any
// }
tasks.push({
  isValid() {
    return true
  },
  getTaskName() {
    return "MyCustomTask that is executed at random moments"
  },
  getScheduledTimestamp() {
    return Math.random() > 0.5 ? Date.now() : 0;
  },
  execute(args) {
    console.log("Executed now! Unexpected huh?");
  }
})
```
