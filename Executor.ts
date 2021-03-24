interface TasksGetter {
  get(): Task[]
}

interface ExecutorCache {
  get(key: string, defaultValue?: number | boolean): string | null

  put(key: string, value: string, expirationInSeconds?: number): void

  remove(key: string): void;
}

type ExecutorConfig = {
  tasksGetter: TasksGetter,
  cache: ExecutorCache,
  onHealthCheckFailure: () => any
}

const INSTANCE_NAME = 'ExecutorInstance';
const HEALTH_CHECK = 'HealthCheck';
const INSTANCE_RUNNING = INSTANCE_NAME + '_RUNNING';
const INSTANCE_SCHEDULING = 'INSTANCE_SCHEDULING';
const PREV_EXEC_TIMESTAMP = 'previous_execution_timestamp';
const SEC_IN_TEN_MINS = 600;

function _defaultRestart(cfg) {
  while (cfg.cache.get(INSTANCE_SCHEDULING)) Utilities.sleep(1000);
  // TODO:bkovalev: delete only executor related triggers
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ClockTriggerBuilder(HEALTH_CHECK, builder => builder.everyMinutes(10)).create();
  ClockTriggerBuilder(INSTANCE_NAME, builder => builder.everyMinutes(1)).create();
  (Context.runtimeCtx)[INSTANCE_NAME]();
}

function New(config: ExecutorConfig) {
  // Init default values
  const _config = Object.assign({}, {
    tasksGetter: {get: () => []},
    cache: CacheService.getScriptCache(),
    onHealthCheckFailure: () => _defaultRestart(_config)
  }, config);

  function getTasks() {
    return _config.tasksGetter
      .get()
      .filter((task: Task): boolean => {
        if (!task.isValid()) {
          Context.debugMsg(`Task skipped: invalid parameters: ${JSON.stringify(task)}`);
          return false
        }
        return task.getScheduledTimestamp() != 0
      });
  }

  (Context.runtimeCtx)[HEALTH_CHECK] = function checkHealth() {
    const hours = new Date().getHours();
    const nightTime = hours >= 0 && hours < 7;
    if (_config.cache.get(INSTANCE_SCHEDULING) || nightTime) return;

    if (!_config.cache.get(PREV_EXEC_TIMESTAMP) || 0) {
      Context.debugMsg('Executor was stopped for more than 5 minutes...');
      _config.onHealthCheckFailure()
    }
  };

  (Context.runtimeCtx)[INSTANCE_NAME] = args => {
    try {
      if (_config.cache.get(INSTANCE_RUNNING)) {
        return;
      }

      _config.cache.put(INSTANCE_RUNNING, "true", SEC_IN_TEN_MINS / 2); // 5 min top

      // fetch takes some milliseconds, so we're doing it before saving the timestamp
      const tasks = getTasks();

      const previousExecutionTimestamp = +(_config.cache.get(PREV_EXEC_TIMESTAMP) || 0);
      const currentExecutionTimestamp = Date.now();
      _config.cache.put(PREV_EXEC_TIMESTAMP, currentExecutionTimestamp.toString(), SEC_IN_TEN_MINS);

      tasks.forEach((task: Task) => {
        const scheduledTimestamp = task.getScheduledTimestamp();
        const secondsElapsedAfterScheduledExecution = (currentExecutionTimestamp - scheduledTimestamp) / 1000;
        const executionIsWithinRange = secondsElapsedAfterScheduledExecution >= 0 && secondsElapsedAfterScheduledExecution < SEC_IN_TEN_MINS;
        const shouldExecuteTask = (previousExecutionTimestamp < scheduledTimestamp) && executionIsWithinRange;
        if (shouldExecuteTask) {
          task.execute(args);
        }
      });
    } catch (e) {
      Context.debugMsg(`Failure in ${INSTANCE_NAME}: ${e.message}`);
      console.error(e);
    } finally {
      _config.cache.remove(INSTANCE_RUNNING);
    }
  };

  return {
    restart() {
      this.stop()
      ClockTriggerBuilder(HEALTH_CHECK, builder => builder.everyMinutes(10)).create();
      ClockTriggerBuilder(INSTANCE_NAME, builder => builder.everyMinutes(1)).create();
      (Context.runtimeCtx)[INSTANCE_NAME]();
    },
    stop() {
      this.waitWhileScheduling()
      // TODO:bkovalev: delete only executor related triggers
      ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
    },
    waitWhileScheduling() {
      while (_config.cache.get(INSTANCE_SCHEDULING)) Utilities.sleep(1000);
    },
    getTasks(): Task[] {
      return getTasks();
    },
  };
}

function TaskFromString(taskRaw: string): Task {
  if (taskRaw.trim && taskRaw.trim().startsWith("dailyTask")) {
    return DailyTask.parse(Context.runtimeCtx, taskRaw)
  } else if (taskRaw.trim && taskRaw.trim().startsWith("hourlyTask")) {
    return HourlyTask.parse(Context.runtimeCtx, taskRaw)
  }
  return new InvalidTask(taskRaw)
}
