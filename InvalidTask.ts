class InvalidTask implements Task {
  private readonly taskRaw: string;

  constructor(taskRaw: string) {
    this.taskRaw = taskRaw
  }

  execute(args): any {
  }

  getScheduledTimestamp(): number {
    return 0;
  }

  getTaskName(): string {
    return this.taskRaw;
  }

  isValid(): boolean {
    return false;
  }

}

