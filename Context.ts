type Context = {
    runtimeCtx: object,
    dayChecks: object,
    debugMsg: (string) => void
}

const self = this;

const Context: Context = {
    runtimeCtx: self,
    dayChecks: {
        everyday: () => true,
        weekDay: () => !isWeekEnd(new Date()),
        lastWeekDayOfMonth: () => isLastWeekDayOfMonth(new Date()),
    },
    debugMsg(text) {
        console.log(`DEBUG_MSG: ${text}`)
    }
}

function SetContext(config: Context) {
    if (config.dayChecks) {
        Context.dayChecks = config.dayChecks
    }
    if (config.debugMsg) {
        Context.debugMsg = config.debugMsg
    }
    if (config.runtimeCtx) {
        Context.runtimeCtx = config.runtimeCtx
    }
}
