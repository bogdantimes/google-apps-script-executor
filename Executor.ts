interface TasksGetter {
  get(): Task[]
}

interface ExecutorCache {
  get(key: string, defaultValue?: number | boolean): number | boolean

  put(key: string, value: number | boolean, expirationInSeconds?: number): void

  remove(key: string): void;
}

type ExecutorConfig = {
  tasksGetter: TasksGetter,
  cache: ExecutorCache,
  onHealthCheckFailure: () => any
}

function NewExecutor(config: ExecutorConfig) {
  const INSTANCE_NAME = 'ExecutorInstance';
  const HEALTH_CHECK = 'HealthCheck';
  const INSTANCE_RUNNING = INSTANCE_NAME + '_RUNNING';
  const INSTANCE_SCHEDULING = 'INSTANCE_SCHEDULING';
  const PREV_EXEC_TIMESTAMP = 'previous_execution_timestamp';
  const SEC_IN_TEN_MINS = 600;

  function getTasks() {
    return config.tasksGetter
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
    if (config.cache.get(INSTANCE_SCHEDULING) || nightTime) return;

    if (!config.cache.get(PREV_EXEC_TIMESTAMP, 0)) {
      Context.debugMsg('Executor was stopped for more than 5 minutes...');
      config.onHealthCheckFailure()
    }
  };

  (Context.runtimeCtx)[INSTANCE_NAME] = args => {
    try {
      if (config.cache.get(INSTANCE_RUNNING)) {
        return;
      }

      config.cache.put(INSTANCE_RUNNING, true, SEC_IN_TEN_MINS / 2); // 5 min top

      // fetch takes some milliseconds, so we're doing it before saving the timestamp
      const tasks = getTasks();

      const previousExecutionTimestamp = config.cache.get(PREV_EXEC_TIMESTAMP, 0);
      const currentExecutionTimestamp = Date.now();
      config.cache.put(PREV_EXEC_TIMESTAMP, currentExecutionTimestamp, SEC_IN_TEN_MINS);

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
      config.cache.remove(INSTANCE_RUNNING);
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
      while (config.cache.get(INSTANCE_SCHEDULING)) Utilities.sleep(1000);
    },
    getTasks(): Task[] {
      return getTasks();
    },
  };
}



